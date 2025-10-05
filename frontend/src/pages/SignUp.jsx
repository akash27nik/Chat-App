import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react';
import axios from 'axios';
import { serverUrl } from '../main.jsx';
import { useDispatch, useSelector } from 'react-redux';
import { setUserData } from '../redux/userSlice.js';
// axios.js
import axios from 'axios';

const instance = axios.create({
  baseURL: 'https://chat-app-gg8n.onrender.com', // 👈 Render backend URL
  withCredentials: true,
});


function SignUp() {
  let navigate = useNavigate();
  let [show, setShow] = useState(false);

  let [userName, setUserName] = useState("")
  let [email, setEmail] = useState("")
  let [password, setPassword] = useState("")
  let [loading, setLoading] = useState(false);
  let [err, setErr] = useState("");
  let disptch = useDispatch()




  // Function to handle sign up
  const handleSignUp = async (e) => {
    // Prevent form submission if any field is empty
    e.preventDefault();
    setLoading(true);

    if (!userName || !email || !password) {
      setLoading(false);
      setErr("Please fill all the fields");
      return;
    }

    try {
      let result = await axios.post(`${serverUrl}/api/auth/signup`, {
        userName,
        email,
        password
      }, { withCredentials: true });

      disptch(setUserData(result.data))

      navigate("/profile");
      setUserName("");
      setEmail("");
      setPassword("");
      setLoading(false);
      setErr("");

    } catch (error) {
      console.log(error);
      setLoading(false);
      setErr(error.response.data.message);
    }
  }

  return (
    <div className='w-full h-[100vh] bg-slate-200 flex items-center justify-center'>

      <div className='w-full max-w-[500px] h-[600px] bg-white rounded-lg shadow-gray-400 shadow lg flex flex-col gap-[30px]'>

        <div className='w-full h-[200px] bg-[#20c7ff] rounded-b-[30%] shadow-gray-400 shadow-lg flex items-center justify-center'>

          <h1 className='text-gray-600 font-bold text-[30px]'>Welcome to <span className='text-white'>
            ChitChat-App
          </span> </h1>
        </div>

        {/* Form */}
        <form className='w-full flex flex-col gap-[20px] items-center' onSubmit={handleSignUp}>
          {/* username */}
          <input type='text' placeholder='usename' className='w-[90%] h-[50px] outline-none border-2 border-[#20c7ff] px-[20px] py-[10px] bg-white rounded-lg shadow-gray-200 shadow-lg text-gray-700 text-[19px]' onChange={(e) => setUserName(e.target.value)} value={userName} />

          {/* email */}
          <input type='email' placeholder='email' className='w-[90%] h-[50px] outline-none border-2 border-[#20c7ff] px-[20px] py-[10px] bg-white rounded-lg shadow-gray-200 shadow-lg text-gray-700 text-[19px]' onChange={(e) => setEmail(e.target.value)} value={email} />


          {/* password */}
          <div className='w-[90%] h-[50px] border-2 border-[#20c7ff] overflow-hidden rounded-lg shadow-gray-200 shadow-lg relative'>
            <input type={`${show ? "text" : "password"}`} placeholder='password' className='w-full h-full outline-none  px-[20px] py-[10px] bg-white  text-gray-700 text-[19px] ' onChange={(e) => setPassword(e.target.value)} value={password} />
            <span className='absolute top-[10px] right-[20px] text-[19x] text-[#20c7ff] font-semibold cursor-pointer' onClick={() =>
              setShow(prev => !prev)
            }>{`${show ? "hidden" : "show"}`}</span>
          </div>
          {err && <p className='text-red-500'>*{err}</p>}

          {/* Button */}
          <button className='px-[20px] py-[10px] bg-[#20c7ff] rounded-2xl shadow-gray-400 shadow-lg text-[20px] w-[200px] mt-[20px]font-semibold hover:shadow-inner' disable={loading}>{loading ? "Loading..." : "Sign Up"}</button>

          <p className='cursor-pointer' onClick={() => { navigate("/login") }}>Already have an Account? <span className='text-[#20c7ff] font-semibold'>
            Login
          </span></p>
        </form>
      </div>
    </div>
  )
}

export default SignUp
