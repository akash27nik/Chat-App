import React, { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import useCurrentUser from './customHooks/getCurrentUser';
import useOtherUsers from './customHooks/getOtherUsers';
import { useDispatch, useSelector } from 'react-redux'
import Home from './pages/Home'
import Profile from './pages/Profile'
import { io } from "socket.io-client"
import { serverUrl } from './main';
import { setOnlineUsers, setSocket } from './redux/userSlice';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  useCurrentUser();
  useOtherUsers();

  let { userData, socket } = useSelector(state => state.user);
  let dispatch = useDispatch();

  useEffect(() => {
    if (userData) {
      const socketio = io(`${serverUrl}`, {
        query: { userId: userData?._id }
      });

      dispatch(setSocket(socketio));

      socketio.on("getOnlineUsers", (users) => {
        dispatch(setOnlineUsers(users));
      });

      return () => socketio.close();
    } else {
      if (socket) {
        socket.close();
        dispatch(setSocket(null));
      }
    }
  }, [userData]);

  return (
    <>
      {/* ✅ Toast notifications container (for all in-app toasts) */}
      <ToastContainer position="top-right" autoClose={3000} />

      <Routes>
        <Route path='/login' element={!userData ? <Login /> : <Navigate to="/" />} />
        <Route path='/signup' element={!userData ? <SignUp /> : <Navigate to="/profile" />} />
        <Route path='/' element={userData ? <Home /> : <Navigate to="/login" />} />
        <Route path='/profile' element={userData ? <Profile /> : <Navigate to="/signup" />} />
      </Routes>
    </>
  );
}

export default App;
