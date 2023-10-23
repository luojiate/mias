import React, { useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

const Register = () => {

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const {register,handleSubmit,watch,formState: { errors }} = useForm();

  const signUp = (data) => {
    setLoading(true);
    const body = {...data};
    axios
      .post(`${process.env.REACT_APP_BACKEND_URL}/register`, { ...body }, {withCredentials: true})
      .then(response => {
        setLoading(false);
        navigate("/login");
      })
      .catch(error => {
        setLoading(false);
      })
    console.log(data);
  };

  return (
    <div className="relative h-screen w-full flex items-center justify-center bg-cover bg-center bg-gray-800">
      <div className="flex justify-center py-10 ">
        <div className="bg-white w-96 h-auto border border-gray-200 rounded-md">
          <h1 className="text-center pt-4 text-[#0c2650] text-lg font-bold"> Sign up </h1>
          <div className="pl-8">
            <form onSubmit={handleSubmit(signUp)}>
              <div className="pt-6 text-sm">Name</div>
              <div className="relative text-gray-600 focus-within:text-gray-400">
                <input type="text" name="name" className="py-2 border-b-2 text-sm rounded-md pl-4 focus:outline-none w-11/12 focus:bg-white focus:text-gray-900" placeholder="Enter your first name" autoComplete="on"{...register("name", { required: true })}/>
                <div>{errors.name && errors.name.type === "required" && (<span className="text-red-600 text-[10px] italic" > Name is required </span> )}</div>
              </div>
              <div className="pt-6 text-sm">Email:</div>
              <div className="relative text-gray-600 focus-within:text-gray-400">
                <input type="email" name="email" className="py-2 border-b-2 text-sm rounded-md pl-4 focus:outline-none w-11/12 focus:bg-white focus:text-gray-900" placeholder="Enter your Email Address" autoComplete="on"{...register("email", { required: true })}/>
                <div>{errors.email && errors.email.type === "required" && (<span className="text-red-600 text-[10px] italic" > Email is required </span> )}</div>
              </div>
              <div className="pt-6 text-sm">Password:</div>
              <div className="relative text-gray-600 focus-within:text-gray-400">
                <input type="password" name="password" className="py-2 border-b-2 text-sm rounded-md pl-4 focus:outline-none w-11/12 focus:bg-white focus:text-gray-900" placeholder="Enter your password" autoComplete="on"{...register("password", { required: true })}/>
                <div>{errors.password && errors.password.type === "required" && (<span className="text-red-600 text-[10px] italic"> Password is required </span> )}</div>
              </div>
              <div className="pt-6 text-sm">Confirm:</div>
              <div className="relative text-gray-600 focus-within:text-gray-400">
                <input type="password" name="confirmPassword" className="py-2 border-b-2 text-sm rounded-md pl-4 focus:outline-none w-11/12 focus:bg-white focus:text-gray-900" placeholder="Enter your password again" autoComplete="on"{...register("confirmPassword", { required: true, validate: value => value === watch("password") || "Not Match" })}/>
                <div>{errors.confirmPassword && (<span className="text-red-600 text-[10px] italic">{errors.confirmPassword.message}</span>)}</div>
              </div>
              <div className="py-6 px-2 w-11/12">
                <button className={`w-full ${ loading ? "bg-gray-500" : "bg-blue-500 hover:bg-blue-700 " } text-white font-bold py-2 rounded`} disabled={loading ? true : false}>{loading ? "Loading..." : "Sign up"}</button>
                <div className="text-center text-sm pt-1">Already have an account? <Link to="/login">Login</Link></div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
