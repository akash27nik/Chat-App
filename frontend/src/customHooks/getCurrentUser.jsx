// customHooks/getCurrentUser.jsx
import axios from "axios";
import { useEffect } from "react";
import { serverUrl } from "../main.jsx";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/userSlice";

const useCurrentUser = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const result = await axios.get(`${serverUrl}/api/user/current`, {
          withCredentials: true,
        });
        dispatch(setUserData(result.data.user)); // ✅ fix here
      } catch (error) {
        console.log("getCurrentUser error:", error.response?.data || error.message);
      }
    };

    fetchUser();
  }, []);
};

export default useCurrentUser;
