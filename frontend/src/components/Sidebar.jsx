import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IoIosSearch } from "react-icons/io";
import { RxCross2 } from "react-icons/rx";
import { BiLogOutCircle } from "react-icons/bi";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import dp from "../assets/dp.webp";
import { serverUrl } from "../main";
import {
  setOtherUsers,
  setSelectedUser,
  setUserData,
} from "../redux/userSlice";
import { resetUnread, incrementUnread } from "../redux/unreadSlice";
import StatusList from "./StatusList";
import StatusUpload from "./StatusUpload";
import StatusViewer from "./StatusViewer";

function Sidebar({ activeTab, setActiveTab }) {
  const {
    userData,
    otherUsers,
    selectedUser,
    onlineUsers,
    typingUsers,
    socket,
  } = useSelector((state) => state.user);
  const { unreadMessages } = useSelector((state) => state.unread);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const onlineUsersRef = useRef(null);

  const [search, setSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllOnline, setShowAllOnline] = useState(false);
  const [showSeeMore, setShowSeeMore] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showUploadStatus, setShowUploadStatus] = useState(false);
  const [statusViewerIndex, setStatusViewerIndex] = useState(null);
  const [statusViewerData, setStatusViewerData] = useState([]);

  // Force re-render every 60s to refresh timestamps
  const [, forceRender] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      forceRender((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch current user if not set
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await axios.get(`${serverUrl}/api/user/current`, {
          withCredentials: true,
        });
        if (res.data?.user) {
          dispatch(setUserData(res.data.user));
        }
      } catch (err) {
        console.error("Error fetching current user:", err);
      }
    };
    if (!userData?._id) fetchCurrentUser();
  }, [userData?._id, dispatch]);

  // Fetch other users (with lastMessage + unreadCount) on load
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${serverUrl}/api/user/others-with-lastmsg`, {
          withCredentials: true,
        });
        if (Array.isArray(res.data?.users)) {
          dispatch(setOtherUsers(res.data.users));

          // Restore unread counts from backend
          res.data.users.forEach(user => {
            if (user.unreadCount > 0) {
              dispatch(
                incrementUnread({
                  userId: user._id,
                  count: user.unreadCount,
                  lastUpdated: Date.now(),
                })
              );
            }
          });
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    fetchUsers();
  }, [dispatch]);

  // Filter users by search query
  const filteredUserList =
    Array.isArray(otherUsers)
      ? otherUsers.filter(
          (user) =>
            user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.userName?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : [];

  // Online users from filtered list
  const filteredOnlineUsers = filteredUserList.filter((u) =>
    onlineUsers?.includes(u._id)
  );

  // Keep backend sort order (no re-sorting here)
  const sortedUserList = filteredUserList;

  // Handle logout
  const handleLogout = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, {
        withCredentials: true,
      });
      dispatch(setUserData(null));
      dispatch(setOtherUsers(null));
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Show "See More" if online user overflow
  useEffect(() => {
    if (onlineUsersRef.current) {
      setShowSeeMore(
        onlineUsersRef.current.scrollWidth >
          onlineUsersRef.current.clientWidth
      );
    }
  }, [onlineUsers, otherUsers]);

  // Reorder list on new message (move to top)
  useEffect(() => {
    if (!socket) return;
    socket.on("newMessage", (mess) => {
      const { senderId, receiverId, createdAt } = mess;
      const idToMove = senderId === userData._id ? receiverId : senderId;

      if (Array.isArray(otherUsers) && otherUsers.length) {
        let updatedUsers = [...otherUsers];
        const idx = updatedUsers.findIndex((u) => u._id === idToMove);

        if (idx !== -1) {
          // ✅ Update lastMessage + move to top
          updatedUsers[idx] = {
            ...updatedUsers[idx],
            lastMessage: {
              ...(updatedUsers[idx].lastMessage || {}),
              createdAt: createdAt || new Date().toISOString(),
            },
          };
          const [movedUser] = updatedUsers.splice(idx, 1);
          updatedUsers.unshift(movedUser);
        } else {
          // ✅ If user not in list (offline), add them at top
          updatedUsers.unshift({
            _id: idToMove,
            lastMessage: { createdAt: createdAt || new Date().toISOString() },
          });
        }

        dispatch(setOtherUsers(updatedUsers));
      }

      if (selectedUser?._id !== idToMove && senderId !== userData._id) {
        dispatch(
          incrementUnread({
            userId: idToMove,
            count: 1,
            lastUpdated: Date.now(),
          })
        );
      }
    });

    return () => {
      if (socket) socket.off("newMessage");
    };
  }, [socket, selectedUser, dispatch, otherUsers, userData]);

  // Helper: Format last message timestamp
  const formatLastMessageTime = (dateString) => {
    if (!dateString) return "";
    const msgDate = new Date(dateString);
    const now = new Date();

    const isToday =
      msgDate.getDate() === now.getDate() &&
      msgDate.getMonth() === now.getMonth() &&
      msgDate.getFullYear() === now.getFullYear();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      msgDate.getDate() === yesterday.getDate() &&
      msgDate.getMonth() === yesterday.getMonth() &&
      msgDate.getFullYear() === yesterday.getFullYear();

    if (isToday) {
      return msgDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (isYesterday) {
      return "Yesterday";
    } else {
      return msgDate.toLocaleDateString([], {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
  };

  // ✅ NEW: handle delete
  const handleDeleteStatus = (statusId) => {
    setStatusViewerData((prev) => prev.filter((s) => s._id !== statusId));
    if (statusViewerData.length <= 1) {
      setStatusViewerIndex(null);
      setStatusViewerData([]);
    } else {
      setStatusViewerIndex((prev) => (prev >= statusViewerData.length - 1 ? 0 : prev));
    }
  };

  return (
    <div
      className={` lg:w-[30%] w-full h-full bg-slate-200 flex flex-col ${
        selectedUser ? "hidden lg:flex" : "flex"
      }`}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 bg-[#20c7ff] rounded-b-3xl">
        <div>
          <h1 className="text-white font-bold text-xl">Chit-Chat App</h1>
          <p className="text-white">Hi, {userData?.name || "User"}</p>
        </div>
        <img
          src={userData?.image || dp}
          alt="dp"
          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow cursor-pointer"
          onClick={() => navigate("/profile")}
        />
      </div>

      {/* TAB SWITCH + LOGOUT */}
      <div className="flex justify-between items-center p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("chats")}
            className={`px-4 py-1 rounded-full text-sm ${
              activeTab === "chats"
                ? "bg-[#20c7ff] text-white"
                : "bg-white text-black"
            }`}
          >
            Chats
          </button>
          <button
            onClick={() => {
              dispatch(setSelectedUser(null));
              setActiveTab("status");
            }}
            className={`px-4 py-1 rounded-full text-sm ${
              activeTab === "status"
                ? "bg-[#20c7ff] text-white"
                : "bg-white text-black"
            }`}
          >
            Status
          </button>
        </div>
        <button
          className="text-red-500 font-medium"
          onClick={() => setShowLogoutConfirm(true)}
        >
          <BiLogOutCircle size={24} />
        </button>
      </div>

      {/* SEARCH + ONLINE USERS */}
      {activeTab === "chats" && (
        <div className="flex items-center gap-3 px-3">
          {!search ? (
            <div
              className="w-10 h-10 rounded-full flex justify-center items-center bg-white shadow cursor-pointer"
              onClick={() => setSearch(true)}
            >
              <IoIosSearch size={22} />
            </div>
          ) : (
            <form
              className="flex items-center bg-white rounded-full shadow px-3 h-10 w-full"
              onSubmit={(e) => e.preventDefault()}
            >
              <IoIosSearch size={20} />
              <input
                type="text"
                className="flex-1 px-2 outline-none text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
              />
              <RxCross2
                size={20}
                className="cursor-pointer"
                onClick={() => {
                  setSearch(false);
                  setSearchQuery("");
                }}
              />
            </form>
          )}
          <div
            className="flex items-center gap-2 overflow-x-auto"
            ref={onlineUsersRef}
          >
            {(showAllOnline
              ? filteredOnlineUsers
              : filteredOnlineUsers.slice(0, 5)
            ).map((user) => (
              <div
                key={user._id}
                className="relative cursor-pointer flex-shrink-0"
                onClick={() => {
                  dispatch(setSelectedUser(user));
                  dispatch(resetUnread(user._id));
                  axios
                    .put(
                      `${serverUrl}/api/message/seen/${user._id}`,
                      {},
                      { withCredentials: true }
                    )
                    .catch((err) => console.error("Error marking seen", err));
                }}
              >
                <img
                  src={user.image || dp}
                  alt="profile"
                  className="w-[45px] h-[45px] rounded-full object-cover shadow-md"
                />
                {/* ✅ KEEP GREEN DOT ONLY HERE */}
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                {unreadMessages[user._id]?.count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full px-[6px] py-[1px] shadow">
                    {unreadMessages[user._id]?.count}
                  </span>
                )}
              </div>
            ))}
            {showSeeMore && (
              <button
                className="text-xs bg-white px-2 py-1 rounded-full shadow-md"
                onClick={() => setShowAllOnline(!showAllOnline)}
              >
                {showAllOnline ? "See Less" : "See More"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* USER LIST / STATUS */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {activeTab === "status" ? (
          <StatusList
            onOpenStatus={(statusArray, startIndex) => {
              setStatusViewerData(statusArray);
              setStatusViewerIndex(startIndex);
            }}
            onUpload={() => setShowUploadStatus(true)}
            socket={socket}
          />
        ) : (
          sortedUserList.map((user) => (
            <div
              key={user._id}
              className="flex items-center bg-white p-3 mb-2 rounded-lg shadow cursor-pointer hover:bg-[#20c7ff]/10"
              onClick={() => {
                dispatch(setSelectedUser(user));
                dispatch(resetUnread(user._id));
                axios
                  .put(
                    `${serverUrl}/api/message/seen/${user._id}`,
                    {},
                    { withCredentials: true }
                  )
                  .catch((err) => console.error("Error marking seen", err));
              }}
            >
              <div className="relative">
                <img
                  src={user.image || dp}
                  alt="dp"
                  className="w-12 h-12 rounded-full object-cover shadow"
                />
                {/* ❌ REMOVED GREEN DOT FROM HERE */}
              </div>
              <div className="flex-1 ml-3">
                <h2 className="font-semibold text-gray-800 text-sm">
                  {user.name || user.userName}
                </h2>
                {typingUsers[user._id] && (
                  <p className="text-xs text-green-500">typing...</p>
                )}
              </div>
              <div className="ml-auto flex flex-col items-end justify-center">
                {user.lastMessage?.createdAt && (
                  <span className="text-xs text-gray-500">
                    {formatLastMessageTime(user.lastMessage.createdAt)}
                  </span>
                )}
                {unreadMessages[user._id]?.count > 0 && (
                  <span className="bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full mt-1">
                    {unreadMessages[user._id]?.count}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* LOGOUT POPUP */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow w-72 text-center">
            <h2 className="text-lg font-semibold mb-4">Log out?</h2>
            <div className="flex justify-around">
              <button
                className="bg-red-500 text-white px-4 py-2 rounded"
                onClick={handleLogout}
              >
                Yes
              </button>
              <button
                className="bg-gray-300 px-4 py-2 rounded"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS MODALS */}
      {showUploadStatus && (
        <StatusUpload onClose={() => setShowUploadStatus(false)} socket={socket} />
      )}
      {statusViewerIndex !== null && (
        <StatusViewer
          statuses={statusViewerData}
          index={statusViewerIndex}
          onClose={() => {
            setStatusViewerData([]);
            setStatusViewerIndex(null);
          }}
          onNext={() => {
            if (statusViewerIndex < statusViewerData.length - 1) {
              setStatusViewerIndex((prev) => prev + 1);
            } else {
              setStatusViewerData([]);
              setStatusViewerIndex(null);
            }
          }}
          onDelete={handleDeleteStatus} // ✅ delete handler
          socket={socket}
        />
      )}
    </div>
  );
}

export default Sidebar;
