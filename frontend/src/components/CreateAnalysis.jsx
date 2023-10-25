import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";

const CreateAnalysis = () => {

  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState();
  const [userData, setUserData] = useState();
  const [imageUrl, setImageUrl] = useState();

  const navigate = useNavigate();
  const {register,handleSubmit,formState: { errors },} = useForm();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) navigate("/login");
    else setUserData(JSON.parse(storedUser));
  }, [navigate]);

  const axiosWithRedirect = (method, url, data = {}, config = {}) => {
    return axios[method](url, data, config)
      .then(response => {
        if (response.status === 401) {
          navigate("/login");
          throw new Error("未經授權的請求");
        }
        return response;
      });
  };

  const onSubmit = (data) => {
    setLoading(true);
    const body = { ...data, outer_fat: "someValue", inner_fat: "someValue", length: "someValue", width: "someValue", image: imageUrl, userid: userData.ID };
    axiosWithRedirect('post', `${process.env.REACT_APP_BACKEND_URL}/create`, body, { withCredentials: true })
      .then(function (response) {
        setLoading(false);
        navigate("/personal");
      })
      .catch(function (error) {
        setLoading(false);
      });
  };

  const uploadImageAndPreview = (e) => {
    setLoading(true);
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/gif'].includes(file.type)) {
      alert("只能上傳圖片格式 (.jpg, .jpeg, .png, .gif) 的檔案!");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = function () {
      setImagePreview({ [e.target.name]: reader.result });
      let formData = new FormData();
      formData.append("image", file);
      formData.append("name", file.name);
      const config = { headers: { "content-type": "multipart/form-data" }, withCredentials: true };
      axiosWithRedirect('post', `${process.env.REACT_APP_BACKEND_URL}/upload-image`, formData, config)
        .then((response) => {
          setImageUrl(response?.data?.url);
          setLoading(false);
        })
        .catch((error) => {
          setLoading(false);
        });
    };
    if (file) {
      reader.readAsDataURL(file);
      e.target.value = null;
    }
  };
  

  return (
    <div className="relative h-screen w-full flex items-center justify-center bg-cover bg-center bg-gray-800">
      <div className="max-w-screen-md mx-auto p-5">
      <div className="text-center mb-16"><h3 className="text-3xl sm:text-4xl leading-normal font-extrabold tracking-tight text-gray-200">Create your <span className="text-indigo-500">Analysis</span></h3></div>
  
        <form className="w-full" onSubmit={handleSubmit(onSubmit)}>

          <div className="flex flex-wrap -mx-3 mb-6">
            <div className="w-full md:w-full px-3 mb-6 md:mb-0">
              <label className="block uppercase tracking-wide text-gray-200 text-xs font-bold mb-2" > Number </label>
              <input className="appearance-none block w-full bg-gray-800 text-gray-300 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-gray-500" type="text" name="number" autoComplete="off" {...register("number", {required: true})} />
              {errors.number && errors.number.type === "required" && (<p className="text-red-500 text-xs italic">Please fill out this field.</p>)}
            </div>
          </div>
          
          <div className="flex flex-wrap -mx-3 mb-6">
            <div className="w-full px-3">
              <label className="block uppercase tracking-wide text-gray-200 text-xs font-bold mb-2" > Upload Image </label>
              <div className="flex flex-col items-center ">{imagePreview ? (<div className="pt-4"><img className="h-full w-1/2 " src={imagePreview.image} alt="Uploaded preview" /></div>) : (<div className="pb-4"><img className="h-full w-full" src="/upload-image.svg" alt="Upload placeholder" /></div>)}</div>
              <input className="appearance-none block w-full bg-gray-800 text-gray-200 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-gray-500 focus:border-gray-500" type="file" name="image" onChange={uploadImageAndPreview} />
            </div>
          </div>
          
          <div className="flex flex-wrap -mx-3 mb-6">
            <div className="w-full px-3">
              <label className="block uppercase tracking-wide text-gray-200 text-xs font-bold mb-2" > Description </label>
              <textarea className="appearance-none block w-full bg-gray-800 text-gray-300 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-gray-500"  rows="6" name="description" {...register("description", {})}/>
            </div>
            <div className="flex justify-between w-full px-3">
              <button 
                className="shadow bg-indigo-600 hover:bg-indigo-400 focus:shadow-outline focus:outline-none text-gray-100 font-bold py-2 px-6 rounded" type="submit" disabled={loading}>
                {loading ? "Loading..." : "Create Post"}
              </button>
            </div>
          </div>
          
        </form>
      </div>
    </div>
  );
  
};

export default CreateAnalysis;
