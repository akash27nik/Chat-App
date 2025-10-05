// useGetMessages.js
import axios from "axios"
import { useEffect } from "react"
import { serverUrl } from "../main.jsx";
import { useDispatch, useSelector } from "react-redux";
import { setMessages } from "../redux/messageSlice.js";

const useGetMessages = () => {
  const dispatch = useDispatch();
  const { userData, selectedUser } = useSelector(state => state.user);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedUser?._id) return;

      try {
        let result = await axios.get(`${serverUrl}/api/message/get/${selectedUser._id}`, {
          withCredentials: true
        });
        dispatch(setMessages(result.data));
      } catch (error) {
        console.log("Error fetching messages:", error.response?.data || error.message);
      }
    };

    fetchMessages();
  }, [selectedUser?._id]);
};

export default useGetMessages;
