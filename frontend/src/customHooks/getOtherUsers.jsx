import axios from "axios"
import { useEffect } from "react"
import { serverUrl } from "../main.jsx";
import { useDispatch, useSelector } from "react-redux";
import { setOtherUsers, setUserData } from "../redux/userSlice";



const getOtherUsers = () => {
  const dispatch = useDispatch();
  const {userData} = useSelector(state => state.user);


useEffect(() => {
  if (!userData) return; // Don't fetch unless logged in

  const fetchUser = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/user/others`, {
        withCredentials: true,
      });
      dispatch(setOtherUsers(result.data));
    } catch (error) {
      console.log("getOtherUsers error:", error.response?.data || error.message);
    }
  };

  fetchUser();
}, [userData]);

}

export default getOtherUsers;