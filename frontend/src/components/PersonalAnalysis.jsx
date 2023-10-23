import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const PersonalAnalysis = () => {
  
  const [analysisData, setAnalysis] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const User = localStorage.getItem("user");
    if (!User) {
      navigate("/login");
    }
    getPersonal();
  }, [navigate]);

  const axiosWithRedirect = (method, url, options = {}) => {
    return axios({ method, url, ...options })
      .then(response => {
        if (response.status === 401) {
          navigate('/');
          throw new Error("未經授權的請求");
        }
        return response;
      });
  };

  const getPersonal = () => {
    setLoading(true);
    axiosWithRedirect('get', `${process.env.REACT_APP_BACKEND_URL}/personal`, { withCredentials: true, headers: { Authorization: "TOKEN" } })
      .then(response => {
        setLoading(false);
        setAnalysis(response.data);
        console.log(response.data);
      })
      .catch((error) => {
        setLoading(false);
        if (error.message === "未經授權的請求") {
          navigate("/login");
        } else {
          console.log(error);
        }
      });
  };

  const deleteBtn = (analysis) => {
    axiosWithRedirect('delete', `${process.env.REACT_APP_BACKEND_URL}/delete/${analysis.id}`, { withCredentials: true })
      .then(response => {
        getPersonal();
        console.log(response.data);
      })
      .catch(error => {
        console.log(error);
      });
  };

  return (
    <>
      <div className="h-screen flex flex-col items-center justify-center bg-gray-800">
        {loading ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white leading-10">LOADING...</h1>
          </div>
        ) : analysisData?.length <= 0 ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white leading-10">You don't have analysis yet. Kindly create a analysis.</h2>
          </div>
        ) : (
          <div className="container my-12 mx-auto px-4 md:px-12">
            <div className="flex flex-wrap -mx-1 lg:-mx-4">
              {analysisData.map((analysis) => (
                <div key={analysis.id} className="my-1 px-1 w-full md:w-1/2 lg:my-4 lg:px-4 lg:w-1/3">
                  <article className="overflow-hidden rounded-lg shadow-lg bg-gray-200">
                    <img alt="Placeholder" className="block h-full w-full mx-auto" src={analysis.image} />
                    <header className="flex items-center justify-between leading-tight p-1 md:p-2 border-b border-black">
                      <h1 className="text-xs">Number: {analysis.number}</h1>
                    </header>
                    <footer className="flex flex-col leading-none p-1">
                      <p className="text-xs">長度: {analysis.length}cm</p>
                      <p className="text-xs">寬度: {analysis.width}cm</p>
                      <p className="text-xs">內部: {analysis.inner_fat}cm<sup>2</sup></p>
                      <p className="text-xs">外部: {analysis.outer_fat}cm<sup>2</sup></p>
                      <p className="text-xs">附註: {analysis.description}</p>
                      <div className="flex justify-center space-x-2">
                        <div>
                          <button onClick={() => deleteBtn(analysis)} disabled={loading ? true : false} className="bg-blue-500 hover:bg-blue-700 text-white font-medium py-1 px-2 rounded">刪除</button>
                        </div>
                      </div>
                    </footer>
                  </article>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PersonalAnalysis;
