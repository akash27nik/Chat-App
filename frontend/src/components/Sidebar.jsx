import React, { useState, useEffect, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IoIosSearch } from "react-icons/io";
import { RxCross2 } from "react-icons/rx";
import { BiLogOutCircle } from "react-icons/bi";
import { FaCamera, FaVideo, FaMicrophone, FaArrowLeft, FaChevronDown } from "react-icons/fa";
import { FaFileLines } from "react-icons/fa6"; 
import { BsEmojiSmile } from "react-icons/bs"; 
import EmojiPicker from "emoji-picker-react"; 
import { 
  MdDelete, MdMarkChatUnread, MdBlock, MdStarBorder, MdArchive, 
  MdPerson, MdStar, MdUnarchive, MdGroupAdd, MdCheckCircle,
  MdGroups, MdChat, MdDonutLarge
} from "react-icons/md"; 
import { BsThreeDotsVertical } from "react-icons/bs";
import { CgUnblock } from "react-icons/cg";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify"; 
import dp from "../assets/dp.webp";
import { serverUrl } from "../main";
import {
  setOtherUsers,
  setSelectedUser,
  setUserData,
  setRecording 
} from "../redux/userSlice";
import { resetUnread, incrementUnread } from "../redux/unreadSlice";
import StatusList from "./StatusList";
import StatusUpload from "./StatusUpload";
import StatusViewer from "./StatusViewer";

const SidebarSkeleton = () => {
  return (
    <div className="animate-pulse">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="flex items-center p-3 mb-2">
          <div className="w-12 h-12 bg-gray-300 rounded-full mr-3"></div>
          <div className="flex-1">
            <div className="flex justify-between mb-2">
              <div className="h-4 bg-gray-300 rounded w-1/3"></div>
              <div className="h-3 bg-gray-300 rounded w-10"></div>
            </div>
            <div className="h-3 bg-gray-300 rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

const SegmentedRing = ({ total, seenCount = 0, size = 48, strokeWidth = 3, strokeColor = "#22c55e", seenColor = "#9ca3af" }) => {
  if (total === 0) return null;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = total > 1 ? 4 : 0;
  const segmentLength = (circumference - gap * total) / total;

  return (
    <svg width={size} height={size} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
      {Array.from({ length: total }).map((_, i) => (
        <circle
          key={i}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={i < seenCount ? seenColor : strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${segmentLength} ${circumference}`}
          strokeDashoffset={-(segmentLength + gap) * i}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      ))}
    </svg>
  );
};

function Sidebar({ activeTab, setActiveTab }) {
  const {
    userData,
    otherUsers,
    selectedUser,
    onlineUsers,
    typingUsers,
    recordingUsers, 
    socket,
    drafts = {} 
  } = useSelector((state) => state.user);
  const { unreadMessages } = useSelector((state) => state.unread);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const onlineUsersRef = useRef(null);
  
  const otherUsersRefVal = useRef(otherUsers);
  const selectedUserRef = useRef(selectedUser);

  const [isLoading, setIsLoading] = useState(true);

  // ✅ INITIALIZE STATE WITH EMPTY STRINGS TO PREVENT UNCONTROLLED INPUT ERROR
  const [search, setSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState(""); 
  
  const [showAllOnline, setShowAllOnline] = useState(false);
  const [showSeeMore, setShowSeeMore] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const [filterType, setFilterType] = useState("All");

  const [showUploadStatus, setShowUploadStatus] = useState(false);
  const [statusViewerIndex, setStatusViewerIndex] = useState(null);
  const [statusViewerData, setStatusViewerData] = useState([]);
  const [allStatuses, setAllStatuses] = useState([]);

  const [avatarPreviewUser, setAvatarPreviewUser] = useState(null);
  const [isFullProfileView, setIsFullProfileView] = useState(false);

  const [hoveredUser, setHoveredUser] = useState(null); 
  const [menuAnchor, setMenuAnchor] = useState(null); 
  const [selectedChats, setSelectedChats] = useState([]); 
  const [showMobileMenu, setShowMobileMenu] = useState(false); 
  const [viewArchived, setViewArchived] = useState(false); 
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ✅ INITIALIZE GROUP INPUTS WITH EMPTY STRINGS
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState(""); 
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  
  const [showGroupEmoji, setShowGroupEmoji] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState(""); 

  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const longPressTimer = useRef(null); 
  const isScrolling = useRef(false); 

  useEffect(() => {
    otherUsersRefVal.current = otherUsers;
  }, [otherUsers]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [, forceRender] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      forceRender((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

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

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true); 
      try {
        const res = await axios.get(`${serverUrl}/api/user/others-with-lastmsg`, {
          withCredentials: true,
        });
        if (Array.isArray(res.data?.users)) {
          const sortedUsers = res.data.users.sort((a, b) => {
             return new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0);
          });
          dispatch(setOtherUsers(sortedUsers));
          
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
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [dispatch]);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const res = await axios.get(`${serverUrl}/api/status`, {
          withCredentials: true,
        });
        if (Array.isArray(res.data)) setAllStatuses(res.data);
      } catch (err) {
        console.error("Error fetching statuses for sidebar:", err);
      }
    };
    fetchStatuses();
  }, []);

  const displayableUsers = useMemo(() => {
    if (!Array.isArray(otherUsers)) return [];

    const userMap = new Map();
    otherUsers.forEach((u) => {
      if (!u._id) return; 
      const existing = userMap.get(u._id);
      if (!existing) {
        userMap.set(u._id, u);
      } else {
        const timeExisting = new Date(existing.lastMessage?.createdAt || existing.updatedAt || 0).getTime();
        const timeNew = new Date(u.lastMessage?.createdAt || u.updatedAt || 0).getTime();
        if (timeNew > timeExisting) {
          userMap.set(u._id, u);
        }
      }
    });

    const dedupedList = Array.from(userMap.values());

    const filtered = dedupedList.filter((user) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const name = (user.name || "").toLowerCase();
      const userName = (user.userName || "").toLowerCase();
      const groupName = (user.groupName || "").toLowerCase();
      return name.includes(query) || userName.includes(query) || groupName.includes(query);
    });

    return filtered.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      
      const dateA = new Date(a.lastMessage?.createdAt || a.updatedAt || a.createdAt || 0);
      const dateB = new Date(b.lastMessage?.createdAt || b.updatedAt || b.createdAt || 0);
      return dateB - dateA; 
    });

  }, [otherUsers, searchQuery]);

  const filteredOnlineUsers = displayableUsers.filter((u) =>
    onlineUsers?.includes(u._id) && !u.isBlocked && !u.isBlockedByThem 
  );

  const archivedUsersList = displayableUsers.filter(u => u.isArchived);
  const mainUsersList = displayableUsers.filter(u => !u.isArchived);
  const usersToDisplay = viewArchived ? archivedUsersList : mainUsersList;

  const finalDisplayList = usersToDisplay.filter(user => {
    if (filterType === "Unread") {
        const count = unreadMessages[user._id]?.count || 0;
        return count > 0 || user.isMarkedUnread;
    }
    if (filterType === "Groups") {
        return user.isGroup === true; 
    }
    return true; 
  });

  const totalUnreadCount = Object.values(unreadMessages || {}).reduce((acc, curr) => acc + (curr?.count || 0), 0);

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

  useEffect(() => {
    if (onlineUsersRef.current) {
      setShowSeeMore(
        onlineUsersRef.current.scrollWidth >
          onlineUsersRef.current.clientWidth
      );
    }
  }, [onlineUsers, otherUsers]);

  // REAL-TIME MESSAGE LISTENER
  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (mess) => {
      const { senderId, receiverId, createdAt, message, image, video, audio, mediaType, isGroup, groupId } = mess;
      
      let idToMove;
      if (isGroup) {
          idToMove = groupId || receiverId; 
      } else {
          idToMove = senderId === userData._id ? receiverId : senderId;
      }

      const currentUsers = otherUsersRefVal.current;

      if (Array.isArray(currentUsers)) {
        let updatedUsers = [...currentUsers];
        const idx = updatedUsers.findIndex((u) => u._id === idToMove);

        const newLastMessage = {
          createdAt: createdAt || new Date().toISOString(),
          message: message || "", 
          image: image || "",
          video: video || "",
          audio: audio || "",
          mediaType: mediaType,
          senderName: isGroup ? mess.senderName : null 
        };

        if (idx !== -1) {
          updatedUsers[idx] = {
            ...updatedUsers[idx],
            lastMessage: newLastMessage,
          };
          const [movedUser] = updatedUsers.splice(idx, 1);
          updatedUsers.unshift(movedUser);
        } 
        
        dispatch(setOtherUsers(updatedUsers));
      }

      if (selectedUserRef.current?._id !== idToMove && senderId !== userData._id) {
        dispatch(
          incrementUnread({
            userId: idToMove, 
            count: 1,
            lastUpdated: Date.now(),
          })
        );
      }
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("audioRecording", ({ senderId }) => {
      dispatch(setRecording({ userId: senderId, isRecording: true }));
    });
    socket.on("stopAudioRecording", ({ senderId }) => {
      dispatch(setRecording({ userId: senderId, isRecording: false }));
    });

    return () => {
      if (socket) {
        socket.off("newMessage", handleNewMessage);
        socket.off("audioRecording");
        socket.off("stopAudioRecording");
      }
    };
  }, [socket, dispatch, userData]); 

  // Status Effects
  useEffect(() => {
    if (!socket) return;
    const handleNewStatus = (status) => setAllStatuses((prev) => [status, ...prev]);
    const handleStatusDeleted = ({ statusId }) => setAllStatuses((prev) => prev.filter((s) => s._id !== statusId));
    const handleStatusViewed = ({ statusId, viewers }) => setAllStatuses((prev) => prev.map((s) => (s._id === statusId ? { ...s, viewers } : s)));
    socket.on("newStatus", handleNewStatus);
    socket.on("statusDeleted", handleStatusDeleted);
    socket.on("statusViewed", handleStatusViewed);
    return () => {
      socket.off("newStatus", handleNewStatus);
      socket.off("statusDeleted", handleStatusDeleted);
      socket.off("statusViewed", handleStatusViewed);
    };
  }, [socket]);

  // CLICK OUTSIDE LISTENER: Handles Profile Menu closing
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showProfileMenu && !e.target.closest('.profile-menu-container')) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showProfileMenu]);

  const formatLastMessageTime = (dateString) => {
    if (!dateString) return "";
    const msgDate = new Date(dateString);
    const now = new Date();
    const isToday = msgDate.getDate() === now.getDate() && msgDate.getMonth() === now.getMonth() && msgDate.getFullYear() === now.getFullYear();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = msgDate.getDate() === yesterday.getDate() && msgDate.getMonth() === yesterday.getMonth() && msgDate.getFullYear() === yesterday.getFullYear();
    if (isToday) return msgDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    else if (isYesterday) return "Yesterday";
    else return msgDate.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const handleProfileClick = (e, user, userStatuses) => {
    if (userStatuses.length > 0) {
      e.stopPropagation(); 
      setStatusViewerData(userStatuses);
      setStatusViewerIndex(0); 
      return;
    }
    if (screenWidth < 768) {
      e.stopPropagation(); 
      setAvatarPreviewUser(user);
    } 
  };

  const handleDeleteStatus = (statusId) => {
    setStatusViewerData((prev) => prev.filter((s) => s._id !== statusId));
    setAllStatuses((prev) => prev.filter((s) => s._id !== statusId)); 
    if (statusViewerData.length <= 1) {
      setStatusViewerIndex(null);
      setStatusViewerData([]);
    } else {
      setStatusViewerIndex((prev) => (prev >= statusViewerData.length - 1 ? 0 : prev));
    }
  };

  const renderLastMessage = (user) => {
    const draftText = drafts[user._id];
    if (draftText) return <span className="text-red-500 italic font-medium flex items-center gap-1">Draft: {draftText}</span>;
    if (user.isBlocked) return <span className="text-gray-400 italic">You blocked this contact</span>;

    const msg = user.lastMessage;
    if (!msg) return "";
    
    const prefix = (user.isGroup && msg.sender?.name) ? `${msg.sender.name}: ` : "";

    const url = msg.image || msg.video || msg.audio || "";
    
    const isAudio = msg.mediaType === 'audio' || msg.audio || (typeof url === 'string' && url.match(/\.(mp3|wav|m4a|aac|flac|wma|ogg|webm)($|\?)/i));
    if (isAudio) return <span className="flex items-center">{prefix}<FaMicrophone size={13} className="mr-1 text-gray-500"/> Audio</span>;
    
    const isVideo = !isAudio && (msg.mediaType === 'video' || msg.video || (typeof url === 'string' && url.match(/\.(mp4|mov|avi|mkv|webm|ogg)($|\?)/i)));
    if (isVideo) return <span className="flex items-center">{prefix}<FaVideo size={13} className="mr-1 text-gray-500"/> Video</span>;
    
    const isDocument = !isAudio && !isVideo && (msg.mediaType === 'file' || (typeof url === 'string' && url.match(/\.(pdf|docx?|xlsx?|pptx?|txt|rtf|csv|odt|odp|html?|zip|rar|7z)($|\?)/i)));
    if (isDocument) return <span className="flex items-center">{prefix}<FaFileLines size={13} className="mr-1 text-gray-500"/> Document</span>;

    if (msg.image) return <span className="flex items-center">{prefix}<FaCamera size={13} className="mr-1 text-gray-500"/> Photo</span>;
    
    return <span className="truncate">{prefix}{msg.message}</span>;
  };

  const handleTouchStart = (userId) => {
    isScrolling.current = false;
    longPressTimer.current = setTimeout(() => {
      if (!isScrolling.current && !selectedChats.includes(userId)) setSelectedChats((prev) => [...prev, userId]);
    }, 500); 
  };
  const handleTouchMove = () => { isScrolling.current = true; if (longPressTimer.current) clearTimeout(longPressTimer.current); };
  const handleTouchEnd = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  const handleRowClick = (user) => {
    if (selectedChats.length > 0) {
      if (selectedChats.includes(user._id)) setSelectedChats(selectedChats.filter((id) => id !== user._id));
      else setSelectedChats([...selectedChats, user._id]);
    } else {
      dispatch(setSelectedUser(user));
      if (!user.isMarkedUnread) {
        dispatch(resetUnread(user._id));
      }
      axios.put(`${serverUrl}/api/message/seen/${user._id}`, {}, { withCredentials: true }).catch(console.error);
    }
  };

  const handleToggleGroupMember = (userId) => {
    if (selectedGroupMembers.includes(userId)) setSelectedGroupMembers(prev => prev.filter(id => id !== userId));
    else setSelectedGroupMembers(prev => [...prev, userId]);
  };

  const handleCreateGroup = async () => {
    if (!groupName || groupName.trim() === "") return toast.error("Please enter a group name");
    if (selectedGroupMembers.length < 2) return toast.error("Select at least 2 members");

    try {
      const res = await axios.post(`${serverUrl}/api/message/group/create`, {
        name: groupName,
        members: selectedGroupMembers
      }, { withCredentials: true });

      if (res.data) {
        const newGroup = { 
            _id: res.data._id,
            name: res.data.groupName, 
            groupName: res.data.groupName,
            image: res.data.groupImage || "",
            isGroup: true,
            participants: res.data.participants,
            lastMessage: null,
            updatedAt: new Date().toISOString()
        }; 
        dispatch(setOtherUsers([newGroup, ...otherUsers]));
        
        // ✅ SAFELY RESET ALL GROUP INPUTS
        setShowGroupModal(false);
        setGroupName("");
        setSelectedGroupMembers([]);
        setGroupSearchQuery("");
        setShowGroupEmoji(false);
        
        toast.success("Group created successfully!");
      }
    } catch (err) {
      console.error("Create group error:", err);
      toast.error("Failed to create group");
    }
  };

  const performAction = async (action) => {
     const targets = selectedChats.length > 0 ? selectedChats : menuAnchor ? [menuAnchor] : [];
     if (targets.length === 0) return;
     if (action === "Delete") { setShowDeleteConfirm(true); return; }
     try {
       if (action === "Block") {
         await Promise.all(targets.map((id) => axios.post(`${serverUrl}/api/user/block`, { userIdToBlock: id }, { withCredentials: true })));
         dispatch(setOtherUsers(otherUsers.map(u => targets.includes(u._id) ? { ...u, isBlocked: true } : u)));
         toast.success("User(s) blocked");
       } else if (action === "Unblock") {
         await Promise.all(targets.map((id) => axios.post(`${serverUrl}/api/user/unblock`, { userIdToUnblock: id }, { withCredentials: true })));
         dispatch(setOtherUsers(otherUsers.map(u => targets.includes(u._id) ? { ...u, isBlocked: false } : u)));
         toast.success("User(s) unblocked");
       } else if (action === "Mark Unread") {
         await Promise.all(targets.map((id) => axios.post(`${serverUrl}/api/user/toggle-unread`, { targetUserId: id }, { withCredentials: true })));
         dispatch(setOtherUsers(otherUsers.map(u => targets.includes(u._id) ? { ...u, isMarkedUnread: !u.isMarkedUnread, unreadCount: !u.isMarkedUnread ? 1 : 0 } : u)));
         toast.info("Status updated");
       } else if (action === "Archive") {
         await Promise.all(targets.map((id) => axios.post(`${serverUrl}/api/user/toggle-archive`, { targetUserId: id }, { withCredentials: true })));
         dispatch(setOtherUsers(otherUsers.map(u => targets.includes(u._id) ? { ...u, isArchived: !u.isArchived } : u)));
         toast.info("Archive status updated");
       } else if (action === "Add Favorite") {
         await Promise.all(targets.map((id) => axios.post(`${serverUrl}/api/user/toggle-favorite`, { targetUserId: id }, { withCredentials: true })));
         dispatch(setOtherUsers(otherUsers.map(u => targets.includes(u._id) ? { ...u, isFavorite: !u.isFavorite } : u)));
         toast.success("Favorites updated");
       } else if (action === "View Contact") {
          const targetId = targets[0];
          const user = otherUsers.find(u => u._id === targetId);
          if(user) setAvatarPreviewUser(user);
       }
     } catch (error) { console.error("Action error:", error); toast.error("Action failed"); } finally { setSelectedChats([]); setMenuAnchor(null); setShowMobileMenu(false); }
  };

  const handleConfirmDelete = async () => {
      const targets = selectedChats.length > 0 ? selectedChats : menuAnchor ? [menuAnchor] : [];
      if (targets.length === 0) { setShowDeleteConfirm(false); return; }
      try {
          await Promise.all(targets.map((id) => axios.delete(`${serverUrl}/api/message/conversation/${id}`, { withCredentials: true })));
          dispatch(setOtherUsers(otherUsers.filter(u => !targets.includes(u._id))));
          toast.success("Chat deleted");
          if (selectedUser && targets.includes(selectedUser._id)) dispatch(setSelectedUser(null));
      } catch (error) { console.error("Delete error:", error); toast.error("Failed to delete chat"); } finally { setShowDeleteConfirm(false); setSelectedChats([]); setMenuAnchor(null); setShowMobileMenu(false); }
  };
  
  const getTargetUser = () => {
     if(menuAnchor) return otherUsers.find(u => u._id === menuAnchor);
     if(selectedChats.length === 1) return otherUsers.find(u => u._id === selectedChats[0]);
     return null;
  };
  const targetUser = getTargetUser();

  const onEmojiClick = (emojiObject) => {
    // ✅ SAFE STATE UPDATE
    setGroupName((prev) => (prev ?? "") + emojiObject.emoji);
  };

  const handleBottomNavChange = (type) => {
    if (type === "Chats") {
      setActiveTab("chats");
      setFilterType("All");
    } else if (type === "Status") {
      setActiveTab("status");
    } else if (type === "Groups") {
      setActiveTab("chats");
      setFilterType("Groups");
    }
  };

  return (
    // ✅ 1. Outer Container: Changed to `flex-row` (so rail sits beside list) and `relative`
    <div className={`md:w-[35%] lg:w-[30%] w-full h-full bg-slate-200 flex flex-row relative ${selectedUser ? "hidden md:flex" : "flex"}`}>
      
      {/* ✅ 2. LEFT RAIL (Visible on Large Screens Only) */}
      <div className="hidden lg:flex flex-col items-center py-4 w-[64px] bg-white border-r border-gray-200 z-20 flex-shrink-0">
        <div className="flex flex-col gap-6 w-full items-center">
            {/* Chat Icon */}
            <div 
                className={`cursor-pointer p-2 rounded-xl transition-all ${activeTab === "chats" && filterType === "All" ? "bg-[#20c7ff]/10 text-[#20c7ff]" : "text-gray-500 hover:bg-gray-100"}`}
                title="Chats"
                onClick={() => handleBottomNavChange("Chats")}
            >
                <MdChat size={26} />
            </div>

            {/* Status Icon */}
            <div 
                className={`cursor-pointer p-2 rounded-xl transition-all ${activeTab === "status" ? "bg-[#20c7ff]/10 text-[#20c7ff]" : "text-gray-500 hover:bg-gray-100"}`}
                title="Status"
                onClick={() => handleBottomNavChange("Status")}
            >
                <MdDonutLarge size={26} />
            </div>

            {/* Groups Icon */}
            <div 
                className={`cursor-pointer p-2 rounded-xl transition-all ${activeTab === "chats" && filterType === "Groups" ? "bg-[#20c7ff]/10 text-[#20c7ff]" : "text-gray-500 hover:bg-gray-100"}`}
                title="Groups"
                onClick={() => handleBottomNavChange("Groups")}
            >
                <MdGroups size={28} />
            </div>
        </div>
      </div>

      {/* ✅ 3. MAIN CONTENT (Header + User List + Mobile Bottom Bar) */}
      {/* Wrapped in a column to stack them vertically next to the rail */}
      <div className="flex-1 flex flex-col h-full relative min-w-0 bg-slate-200">
      
        {/* HEADER */}
        {selectedChats.length > 0 && screenWidth < 768 ? (
          <div className="flex items-center justify-between p-4 bg-[#20c7ff] text-white rounded-b-3xl">
            <div className="flex items-center gap-4">
              <FaArrowLeft size={20} className="cursor-pointer" onClick={() => { setSelectedChats([]); setShowMobileMenu(false); }} />
              <span className="font-bold text-xl">{selectedChats.length}</span>
            </div>
            <div className="flex items-center gap-6">
              <MdDelete size={24} className="cursor-pointer" onClick={() => performAction("Delete")} />
              <MdArchive size={24} className="cursor-pointer" onClick={() => performAction("Archive")} />
              <div className="relative">
                <BsThreeDotsVertical size={22} className="cursor-pointer" onClick={() => setShowMobileMenu(!showMobileMenu)} />
                {showMobileMenu && (
                  <div className="absolute right-0 top-8 bg-white text-black shadow-lg rounded w-52 py-2 z-50">
                      {targetUser && (
                          <>
                              <div className="px-4 py-3 hover:bg-gray-100 cursor-pointer flex items-center gap-2" onClick={() => performAction("View Contact")}><MdPerson size={18} /> View Contact</div>
                              <div className="px-4 py-3 hover:bg-gray-100 cursor-pointer flex items-center gap-2" onClick={() => performAction("Mark Unread")}><MdMarkChatUnread size={18} /> {targetUser.isMarkedUnread ? "Mark as Read" : "Mark as Unread"}</div>
                              <div className="px-4 py-3 hover:bg-gray-100 cursor-pointer flex items-center gap-2" onClick={() => performAction("Add Favorite")}>{targetUser.isFavorite ? <MdStar size={18} className="text-yellow-500" /> : <MdStarBorder size={18} />} {targetUser.isFavorite ? "Remove Favourite" : "Add to Favourites"}</div>
                              <div className="px-4 py-3 hover:bg-gray-100 cursor-pointer flex items-center gap-2" onClick={() => performAction("Archive")}>{targetUser.isArchived ? <MdUnarchive size={18} /> : <MdArchive size={18} />} {targetUser.isArchived ? "Unarchive chat" : "Archive chat"}</div>
                              <div className="px-4 py-3 hover:bg-gray-100 cursor-pointer flex items-center gap-2" onClick={() => performAction(targetUser.isBlocked ? "Unblock" : "Block")}>{targetUser.isBlocked ? <CgUnblock size={18} /> : <MdBlock size={18} />} {targetUser.isBlocked ? "Unblock user" : "Block user"}</div>
                          </>
                      )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-[#20c7ff] rounded-b-3xl relative flex-shrink-0">
            <div>
              <h1 className="text-white font-bold text-xl">Chit-Chat App</h1>
              <p className="text-white">Hi, {userData?.name || "User"}</p>
            </div>
            <div className="flex items-center gap-3 profile-menu-container">
              <button onClick={() => setShowGroupModal(true)} className="text-white hover:bg-white/20 p-2 rounded-full transition" title="Create New Group"><MdGroupAdd size={22} /></button>
              
              {/* PROFILE IMAGE WITH MENU */}
              <div className="relative">
                <img 
                    src={userData?.image || dp} 
                    alt="dp" 
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow cursor-pointer transition-transform hover:scale-105" 
                    onClick={(e) => { e.stopPropagation(); setShowProfileMenu(!showProfileMenu); }} 
                />
                
                {showProfileMenu && (
                  <div className="absolute right-0 top-14 bg-white text-black shadow-xl rounded-xl py-2 w-48 z-50 animate-fadeIn origin-top-right border border-gray-100">
                      <div 
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 transition-colors text-gray-700" 
                        onClick={() => { navigate("/profile"); setShowProfileMenu(false); }}
                      >
                        <MdPerson size={20} className="text-[#20c7ff]" /> 
                        <span className="font-medium">My Profile</span>
                      </div>
                      <div className="h-px bg-gray-100 my-1"></div>
                      <div 
                        className="px-4 py-3 hover:bg-red-50 cursor-pointer flex items-center gap-3 transition-colors text-red-600" 
                        onClick={() => { setShowLogoutConfirm(true); setShowProfileMenu(false); }}
                      >
                        <BiLogOutCircle size={20} /> 
                        <span className="font-medium">Log Out</span>
                      </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === "chats" && (
          <div className="flex-shrink-0">
              <div className="flex items-center gap-3 px-3 mt-3">
              {!search ? (
                  <div className="w-10 h-10 rounded-full flex justify-center items-center bg-white shadow cursor-pointer" onClick={() => setSearch(true)}><IoIosSearch size={22} /></div>
              ) : (
                  <form className="flex items-center bg-white rounded-full shadow px-3 h-10 w-full" onSubmit={(e) => e.preventDefault()}>
                  <IoIosSearch size={20} />
                  <input 
                      type="text" 
                      className="flex-1 px-2 outline-none text-sm" 
                      value={searchQuery ?? ""}  // ✅ CHANGED TO ?? "" FOR STRICT NULL CHECK
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      placeholder="Search..." 
                  />
                  <RxCross2 size={20} className="cursor-pointer" onClick={() => { setSearch(false); setSearchQuery(""); }} />
                  </form>
              )}
              <div className="flex items-center gap-2 overflow-x-auto" ref={onlineUsersRef}>
                  {(showAllOnline ? filteredOnlineUsers : filteredOnlineUsers.slice(0, 5)).map((user) => (
                  <div key={user._id} className="relative cursor-pointer flex-shrink-0" onClick={() => { dispatch(setSelectedUser(user)); dispatch(resetUnread(user._id)); axios.put(`${serverUrl}/api/message/seen/${user._id}`, {}, { withCredentials: true }).catch(console.error); }}>
                      <img src={user.image || dp} alt="profile" className="w-[45px] h-[45px] rounded-full object-cover shadow-md" />
                      {!user.isBlocked && !user.isBlockedByThem && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>}
                      {unreadMessages[user._id]?.count > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full px-[6px] py-[1px] shadow">{unreadMessages[user._id]?.count}</span>}
                  </div>
                  ))}
                  {showSeeMore && <button className="text-xs bg-white px-2 py-1 rounded-full shadow-md" onClick={() => setShowAllOnline(!showAllOnline)}>{showAllOnline ? "See Less" : "See More"}</button>}
              </div>
              </div>
              <div className="flex gap-2 px-4 py-2 mt-2">
                  {["All", "Unread", "Groups"].map((type) => (
                      <button key={type} onClick={() => setFilterType(type)} className={`px-3 py-1 rounded-full text-xs font-medium transition ${filterType === type ? "bg-[#20c7ff]/20 text-[#0092cc] border border-[#20c7ff]" : "bg-gray-200 text-gray-600 border border-transparent hover:bg-gray-300"}`}>{type === "Unread" && totalUnreadCount > 0 ? `Unread (${totalUnreadCount})` : type}</button>
                  ))}
              </div>
          </div>
        )}

        {/* Main List */}
        {/* ✅ lg:mb-0 removes bottom padding on desktop where the bar is hidden */}
        <div className="flex-1 overflow-y-auto px-2 py-3 custom-scrollbar mb-[60px] lg:mb-0">
          {activeTab === "status" ? (
            <StatusList onOpenStatus={(statusArray, startIndex) => { setStatusViewerData(statusArray); setStatusViewerIndex(startIndex); }} onUpload={() => setShowUploadStatus(true)} socket={socket} />
          ) : (
            <>
              {isLoading ? (
                  <SidebarSkeleton />
              ) : (
                <>
                  {!viewArchived && !searchQuery && archivedUsersList.length > 0 && (
                      <div className="flex items-center gap-4 p-4 mx-1 mb-2 bg-white rounded-lg shadow cursor-pointer hover:bg-gray-50" onClick={() => setViewArchived(true)}>
                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-600"><MdArchive size={20} /></div>
                        <span className="flex-1 font-semibold text-gray-700">Archived</span>
                        <span className="text-green-600 font-bold text-sm">{archivedUsersList.length}</span>
                      </div>
                  )}
                  {viewArchived && (
                      <div className="flex items-center gap-3 p-3 mb-2 border-b border-gray-300 text-green-600 cursor-pointer" onClick={() => setViewArchived(false)}>
                          <FaArrowLeft /><span className="font-semibold">Archived Chats</span>
                      </div>
                  )}
                  {finalDisplayList.length === 0 && (
                      <div className="text-center text-gray-400 mt-10 text-sm">{filterType === "Unread" ? "No unread messages" : filterType === "Groups" ? "No groups found" : "No chats available"}</div>
                  )}
                  {finalDisplayList.map((user) => {
                      let userStatuses = allStatuses.filter(s => s.user._id === user._id);
                      userStatuses.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                      const hasStatus = userStatuses.length > 0;
                      const seenCount = userStatuses.filter(s => s.viewers && s.viewers.some(v => v.user === userData._id)).length;
                      let unreadCount = unreadMessages[user._id]?.count || 0;
                      if(user.isMarkedUnread && unreadCount === 0) unreadCount = 1;
                      const isSelected = selectedChats.includes(user._id);

                      return (
                        <div key={user._id} className={`relative flex items-center p-3 mb-2 rounded-lg shadow cursor-pointer group transition-colors ${isSelected ? "bg-blue-100" : "bg-white hover:bg-[#20c7ff]/10"} ${user.isArchived ? "opacity-90" : ""}`}
                          onTouchStart={() => handleTouchStart(user._id)} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
                          onMouseEnter={() => setHoveredUser(user._id)} onMouseLeave={() => setHoveredUser(null)} onClick={() => handleRowClick(user)}
                        >
                          <div className="relative w-12 h-12 flex-shrink-0 mr-3" onClick={(e) => handleProfileClick(e, user, userStatuses)}>
                            {hasStatus && !user.isBlockedByThem && !user.isGroup && <SegmentedRing total={userStatuses.length} seenCount={seenCount} size={52} />}
                            <img src={user.isBlockedByThem ? dp : (user.image || dp)} alt="dp" className="w-full h-full rounded-full object-cover shadow absolute top-0 left-0" style={hasStatus && !user.isBlockedByThem && !user.isGroup ? { padding: '2px', background: 'white' } : {}} />
                            {isSelected && <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-white"><svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg></div>}
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-center"> 
                            <div className="flex justify-between items-baseline mb-1">
                              <div className="flex items-center gap-1">
                                  <h2 className="font-semibold text-[#111b21] text-[15px] truncate">{user.groupName || user.name || user.userName}</h2>
                                  {user.isFavorite && <MdStar size={14} className="text-yellow-500" />}
                                  {user.isBlocked && <MdBlock size={14} className="text-red-500" />}
                              </div>
                              {user.lastMessage?.createdAt && <span className={`text-[11px] whitespace-nowrap ml-2 ${unreadCount > 0 ? 'text-[#25d366] font-bold' : 'text-[#667781]'}`}>{formatLastMessageTime(user.lastMessage.createdAt)}</span>}
                            </div>
                            <div className="flex justify-between items-center w-full">
                              <div className={`text-[13px] truncate flex-1 flex items-center min-w-0 ${unreadCount > 0 ? 'font-semibold text-[#111b21]' : 'text-[#667781]'}`}>
                                {recordingUsers[user._id] ? <span className="text-[#25d366] font-medium flex items-center gap-1"><FaMicrophone size={12} className="animate-pulse" /> recording audio...</span> : typingUsers[user._id] ? <span className="text-[#25d366] font-medium">typing...</span> : renderLastMessage(user)}
                              </div>
                              <div className="flex items-center gap-1">
                                  {user.isArchived && <MdArchive size={14} className="text-gray-400" />}
                                  {unreadCount > 0 && <span className="bg-[#25d366] text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full ml-2 flex-shrink-0">{unreadCount}</span>}
                              </div>
                            </div>
                          </div>
                          {hoveredUser === user._id && screenWidth >= 740 && !menuAnchor && (
                            <div className="absolute bottom-1 right-1 bg-white shadow-md rounded-full p-1 z-20 flex items-center justify-center cursor-pointer" onClick={(e) => { e.stopPropagation(); setMenuAnchor(user._id); }}><FaChevronDown className="text-gray-500 text-xs" /></div>
                          )}
                          {menuAnchor === user._id && (
                            <>
                              <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setMenuAnchor(null); }} />
                              <div className="absolute right-4 top-8 bg-white shadow-xl rounded-lg py-2 w-52 z-40 animate-fadeIn">
                                  <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3 text-sm text-gray-700" onClick={(e) => { e.stopPropagation(); performAction("Delete"); }}><MdDelete size={18} /> Delete chat</div>
                                  <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3 text-sm text-gray-700" onClick={(e) => { e.stopPropagation(); performAction("Mark Unread"); }}><MdMarkChatUnread size={18} /> {user.isMarkedUnread ? "Mark as Read" : "Mark as Unread"}</div>
                                  <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3 text-sm text-gray-700" onClick={(e) => { e.stopPropagation(); performAction("Add Favorite"); }}>{user.isFavorite ? <MdStar size={18} className="text-yellow-500" /> : <MdStarBorder size={18} />} {user.isFavorite ? "Remove Favourite" : "Add to Favourites"}</div>
                                  <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3 text-sm text-gray-700" onClick={(e) => { e.stopPropagation(); performAction("Archive"); }}>{user.isArchived ? <MdUnarchive size={18} /> : <MdArchive size={18} />} {user.isArchived ? "Unarchive chat" : "Archive chat"}</div>
                                  <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3 text-sm text-gray-700" onClick={(e) => { e.stopPropagation(); performAction(user.isBlocked ? "Unblock" : "Block"); }}>{user.isBlocked ? <CgUnblock size={18} /> : <MdBlock size={18} />} {user.isBlocked ? "Unblock user" : "Block user"}</div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  }
                </>
              )}
            </>
          )}
        </div>

        {/* FIXED BOTTOM NAVIGATION BAR (Mobile Only) */}
        {/* ✅ ADDED lg:hidden */}
        <div className="absolute bottom-0 left-0 w-full h-[60px] bg-white border-t border-gray-200 flex items-center justify-around z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] lg:hidden">
          <div 
            className={`flex flex-col items-center justify-center gap-1 cursor-pointer w-full h-full transition-colors ${activeTab === "chats" && filterType === "All" ? "text-[#20c7ff]" : "text-gray-500 hover:bg-gray-50"}`}
            onClick={() => handleBottomNavChange("Chats")}
          >
            <div className={`px-4 py-1 rounded-full ${activeTab === "chats" && filterType === "All" ? "bg-[#20c7ff]/10" : ""}`}>
              <MdChat size={24} />
            </div>
            <span className="text-[11px] font-bold">Chats</span>
          </div>

          <div 
            className={`flex flex-col items-center justify-center gap-1 cursor-pointer w-full h-full transition-colors ${activeTab === "status" ? "text-[#20c7ff]" : "text-gray-500 hover:bg-gray-50"}`}
            onClick={() => handleBottomNavChange("Status")}
          >
            <div className={`px-4 py-1 rounded-full ${activeTab === "status" ? "bg-[#20c7ff]/10" : ""}`}>
              <MdDonutLarge size={24} />
            </div>
            <span className="text-[11px] font-bold">Status</span>
          </div>

          <div 
            className={`flex flex-col items-center justify-center gap-1 cursor-pointer w-full h-full transition-colors ${activeTab === "chats" && filterType === "Groups" ? "text-[#20c7ff]" : "text-gray-500 hover:bg-gray-50"}`}
            onClick={() => handleBottomNavChange("Groups")}
          >
            <div className={`px-4 py-1 rounded-full ${activeTab === "chats" && filterType === "Groups" ? "bg-[#20c7ff]/10" : ""}`}>
              <MdGroups size={26} />
            </div>
            <span className="text-[11px] font-bold">Groups</span>
          </div>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow w-72 text-center">
            <h2 className="text-lg font-semibold mb-4">Log out?</h2>
            <div className="flex justify-around">
              <button className="bg-red-500 text-white px-4 py-2 rounded" onClick={handleLogout}>Yes</button>
              <button className="bg-gray-300 px-4 py-2 rounded" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 animate-fadeIn">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete this chat?</h3>
                <p className="text-gray-600 text-sm mb-6">Messages will only be removed from this device and your devices on the newer versions of this app.</p>
                <div className="flex justify-end gap-4">
                    <button className="px-4 py-2 text-green-600 font-semibold hover:bg-green-50 rounded transition" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                    <button className="px-4 py-2 text-red-600 font-semibold hover:bg-red-50 rounded transition" onClick={handleConfirmDelete}>Delete chat</button>
                </div>
            </div>
        </div>
      )}

      {showGroupModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 group-modal-container">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 animate-fadeIn flex flex-col h-[600px]">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Create New Group</h3>
                
                <div className="relative w-full mb-4">
                    <input 
                        type="text" 
                        placeholder="Group Name" 
                        value={groupName ?? ""}   // ✅ CHANGED TO ?? "" FOR STRICT NULL CHECK
                        onChange={(e) => setGroupName(e.target.value)} 
                        className="w-full p-3 pr-10 border border-gray-300 rounded-lg outline-none focus:border-[#20c7ff]" 
                    />
                    <BsEmojiSmile 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer hover:text-[#20c7ff]"
                        onClick={() => setShowGroupEmoji(!showGroupEmoji)}
                        size={20}
                    />
                    {showGroupEmoji && (
                      <div className="absolute top-full right-0 z-50 mt-1 shadow-lg">
                        <EmojiPicker onEmojiClick={onEmojiClick} width={300} height={350} />
                      </div>
                    )}
                </div>

                <div className="relative mb-2">
                    <IoIosSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search Users..." 
                        value={groupSearchQuery ?? ""}  // ✅ CHANGED TO ?? "" FOR STRICT NULL CHECK
                        onChange={(e) => setGroupSearchQuery(e.target.value)} 
                        className="w-full p-2 pl-10 border border-gray-300 rounded-lg outline-none text-sm focus:border-[#20c7ff]" 
                    />
                </div>

                <h4 className="text-sm font-semibold text-gray-600 mb-2">Select Members ({selectedGroupMembers.length})</h4>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar border rounded-lg p-2 mb-4">
                   {displayableUsers
                       .filter(u => !u.isBlocked && !u.isGroup && (u.name?.toLowerCase().includes((groupSearchQuery ?? "").toLowerCase()) || u.userName?.toLowerCase().includes((groupSearchQuery ?? "").toLowerCase())))
                       .map(user => (
                          <div key={user._id} className={`flex items-center justify-between p-2 rounded cursor-pointer mb-1 ${selectedGroupMembers.includes(user._id) ? 'bg-blue-50' : 'hover:bg-gray-100'}`} onClick={() => handleToggleGroupMember(user._id)}>
                             <div className="flex items-center gap-3">
                                <img src={user.image || dp} alt="dp" className="w-10 h-10 rounded-full object-cover" />
                                <span className="font-medium text-sm">{user.name || user.userName}</span>
                             </div>
                             {selectedGroupMembers.includes(user._id) ? <MdCheckCircle className="text-[#20c7ff]" size={24} /> : <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>}
                          </div>
                   ))}
                </div>

                <div className="flex justify-end gap-3">
                    <button className="px-4 py-2 text-gray-600 font-semibold hover:bg-gray-100 rounded transition" onClick={() => { setShowGroupModal(false); setGroupName(""); setSelectedGroupMembers([]); setGroupSearchQuery(""); setShowGroupEmoji(false); }}>Cancel</button>
                    <button className={`px-4 py-2 text-white font-semibold rounded transition ${groupName && selectedGroupMembers.length > 1 ? 'bg-[#20c7ff] hover:bg-[#1da8d9]' : 'bg-gray-300 cursor-not-allowed'}`} onClick={handleCreateGroup} disabled={!groupName || selectedGroupMembers.length < 2}>Create Group</button>
                </div>
            </div>
        </div>
      )}

      {showUploadStatus && <StatusUpload onClose={() => setShowUploadStatus(false)} socket={socket} />}
      {statusViewerIndex !== null && <StatusViewer statuses={statusViewerData} index={statusViewerIndex} onClose={() => { setStatusViewerData([]); setStatusViewerIndex(null); }} onNext={() => { if (statusViewerIndex < statusViewerData.length - 1) setStatusViewerIndex((prev) => prev + 1); else { setStatusViewerData([]); setStatusViewerIndex(null); } }} onPrev={() => { if (statusViewerIndex > 0) setStatusViewerIndex((prev) => prev - 1); else { setStatusViewerData([]); setStatusViewerIndex(null); } }} onDelete={handleDeleteStatus} socket={socket} />}
      {avatarPreviewUser && !isFullProfileView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setAvatarPreviewUser(null)}>
          <div className="bg-white w-[280px] h-[280px] relative shadow-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 w-full bg-black/20 p-2 text-white z-10"><p className="text-sm font-semibold truncate">{avatarPreviewUser.name || avatarPreviewUser.userName}</p></div>
            <img src={avatarPreviewUser.isBlockedByThem ? dp : (avatarPreviewUser.image || dp)} alt="Profile Preview" className="w-full h-full object-cover cursor-pointer" onClick={() => setIsFullProfileView(true)} />
          </div>
        </div>
      )}
      {isFullProfileView && avatarPreviewUser && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-fadeIn">
          <div className="flex items-center p-4 bg-transparent absolute top-0 w-full z-10">
            <FaArrowLeft className="text-white text-xl cursor-pointer mr-4" onClick={() => { setIsFullProfileView(false); setAvatarPreviewUser(null); }} />
            <h2 className="text-white text-lg font-semibold">{avatarPreviewUser.name || avatarPreviewUser.userName}</h2>
          </div>
          <div className="flex-1 flex items-center justify-center"><img src={avatarPreviewUser.isBlockedByThem ? dp : (avatarPreviewUser.image || dp)} alt="Full Profile" className="w-full max-h-full object-contain" /></div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;