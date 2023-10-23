const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const fileUpload = require('express-fileupload');
const { spawn } = require('child_process');
const path = require('path');
const uuid = require('uuid');  
const fs = require('fs');
const session = require('express-session');
const app = express();

function checkUserSession(req, res, next) {
    const userid = req.session.userid;
    if (!userid) {
        return res.status(401).send({ message: "未經授權的請求" });
    }
    next();
}


app.use(express.json());
app.use(cors({ origin: 'http://140.117.174.66:8011', credentials: true }));
app.use(fileUpload());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        maxAge: 3600000 // 這是1小時的毫秒數，所以 session 會在1小時後到期
    }
}));

// 創建 MySQL 連線池設定
const pool = mysql.createPool({
    host: '127.0.0.1',                          // 主機名稱或IP地址
    user: 'root',                               // 用戶名
    password: '123456',                         // 密碼
    database: 'mias',                           // 數據庫名稱
    connectionLimit: 10                         // 最大連線數量
});

app.post('/login', handleLogin);
app.post('/logout', handleLogout);
app.post('/register', handleRegistration);
app.post('/create', checkUserSession, handleCreate);
app.post('/upload-image', checkUserSession, handleUploadImage);
app.get('/personal', checkUserSession, handlePersonal);
app.delete('/delete/:id', checkUserSession, handleDeleteAnalysis);

async function connectToDatabase(){
    return new Promise((resolve,reject) => {
        pool.getConnection((err, connection) => {
            if(err){
                console.error('db error',err);
                reject(err);
                return;
            }
            console.log('db sucesses');
            connection.release();
            resolve();
        })
    })
}

async function queryDatabase(sql, params) {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
}

async function handleLogin(req, res) {
    try {
        const results = await queryDatabase('SELECT * FROM users WHERE email = ?', [req.body.email]);
        if (results.length === 0) {
            res.status(401).send({ message: "使用者不存在" });
            console.log("使用者不存在");
            return;
        } 

        const match = await bcrypt.compare(req.body.password, results[0].password);
        if (!match) {
            res.status(401).send({ message: "密碼錯誤" });
            console.log("密碼錯誤");
            return;
        }

        const user = {...results[0]};
        req.session.userid = user.ID;
        delete user.password;
        
        res.status(200).send({ message: "登入成功", user });
        console.log("登入成功");
    } catch (err) {
        res.status(500).send({ err: '伺服器錯誤' });
        console.log("伺服器錯誤");
    }
}

async function handleLogout(req, res) {
    try {
        res.clearCookie('authToken');
        res.status(200).send({ message: '已成功登出' });
    } catch (err) {
        res.status(500).send({ err: '伺服器錯誤' });
    }
}

async function handleRegistration(req, res) {
    try {
        const { name, email, password } = req.body;
        const results = await queryDatabase('SELECT * FROM users WHERE email = ?', [email]);

        if (results.length > 0) {
            res.status(400).send({ message: "該電子郵件已被註冊" });
            return;
        } 

        const hashedPassword = await bcrypt.hash(password, 10);
        await queryDatabase('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);
        
        res.status(200).send({ message: "註冊成功" });
    } catch (err) {
        res.status(500).send({ err: '伺服器錯誤' });
    }
}

async function handleCreate(req, res) {
    try {
        const { image, outerFat, innerFat, length, width } = req.session.uploadedData;
        const { number, description, userid } = req.body;

        await queryDatabase(
            'INSERT INTO analyses (number, image, description, userid, outer_fat, inner_fat, length, width) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [number, image, description, userid, outerFat, innerFat, length, width]
        );

        res.status(200).send({ message: "分析成功創建" });

    } catch (err) {
        res.status(500).send({ err: '伺服器錯誤' });
    }
}

async function handleUploadImage(req, res) {
    try {
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).send({ message: '未上傳任何文件' });
        }

        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }

        let uploadedFile = req.files.image;
        let uniqueFilename = uuid.v4() + path.extname(uploadedFile.name);
        const uploadPath = path.join(uploadDir, uniqueFilename);

        uploadedFile.mv(uploadPath, async (err) => {
            if (err) {
                return res.status(500).send({ message: '文件上傳失敗' });
            }
            // 執行 Python 腳本
            const python = spawn('python', ['./main.py', uploadPath]);
            console.log(uploadPath)
            let pythonData = "";
            python.stdout.on('data', (data) => {
                pythonData += data.toString();
                console.log(pythonData)
            });
            python.on('close', (code) => {
                if (code !== 0) {
                    return res.status(500).send({ message: 'Python 腳本執行錯誤' });
                }
            
                let parsedData;
                try {
                    parsedData = JSON.parse(pythonData);
                } catch (err) {
                    return res.status(500).send({ message: 'Python 腳本的輸出格式錯誤' });
                }
            
                const { outputImagePath, outerFat, innerFat, length, width } = parsedData;
                const fileUrl = `http://140.117.174.66:8010/uploads/${path.basename(outputImagePath)}`;
            
                // 儲存資料到 session
                req.session.uploadedData = {
                    image: fileUrl,
                    outerFat: outerFat,
                    innerFat: innerFat,
                    length: length,
                    width: width
                };
            
                // 傳送資料給客戶端
                res.status(200).send(req.session.uploadedData);
            });
        });
    } catch (err) {
        res.status(500).send({ err: '伺服器錯誤' });
    }
}

async function handlePersonal(req,res){
    try{
        const userid = req.session.userid;
        if (!userid) {
            return res.status(401).send({ message: "未經授權的請求" });
        }

        const analyses = await queryDatabase('SELECT * FROM analyses WHERE userid = ?', [userid]);
        res.status(200).send(analyses);
    } catch (err) {
        res.status(500).send({ err: '伺服器錯誤' });
    }
}

async function handleDeleteAnalysis(req, res) {
    try {
        const analysisId = req.params.id;
        const userid = req.session.userid;

        const analyses = await queryDatabase('SELECT * FROM analyses WHERE id = ? AND userid = ?', [analysisId, userid]);

        if (analyses.length === 0) {
            return res.status(401).send({ message: "這不是您的分析或分析不存在" });
        }

        await queryDatabase('DELETE FROM analyses WHERE id = ? AND userid = ?', [analysisId, userid]);

        res.status(200).send({ message: "成功刪除分析" });

    } catch (err) {
        res.status(500).send({ err: '伺服器錯誤' });
    }
}

app.listen(8010, async() => {
    try {
        await connectToDatabase();
        console.log('伺服器運行於 8010 端口');    
    } catch (error) {
        console.error('無法連接資料庫,伺服器未啟動',error);
    } 
});

