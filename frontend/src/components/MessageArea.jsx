import React, { useEffect, useRef, useState } from "react";
import { IoIosArrowRoundBack, IoIosArrowBack, IoIosArrowForward, IoMdSearch, IoMdClose, IoMdPersonAdd } from "react-icons/io";
import { RxCross2 } from "react-icons/rx";
import dp from "../assets/dp.webp";
import notificationSound from "/notification.mp3";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedUser, setTyping, setOtherUsers } from "../redux/userSlice";
import { RiEmojiStickerLine, RiDeleteBin6Line, RiInformationLine, RiReplyLine, RiSearchLine, RiArrowUpSLine, RiArrowDownSLine, RiLogoutBoxRLine, RiImageAddLine } from "react-icons/ri";
import { FaImages, FaVideo, FaHeadphones, FaPlus, FaPlay, FaMicrophone, FaStop, FaFileLines, FaCrown, FaChevronDown } from "react-icons/fa6";
import { RiSendPlane2Fill } from "react-icons/ri";
import { FiEye, FiEyeOff, FiShare, FiCopy, FiCrop, FiTrash2, FiUserPlus, FiLogOut, FiCheck, FiPlus, FiShield, FiCamera, FiEdit2, FiX, FiAtSign, FiSliders, FiSun, FiActivity, FiDownload, FiZoomIn, FiZoomOut } from "react-icons/fi";
import { BsThreeDotsVertical, BsPinAngle, BsPinAngleFill, BsCheck2, BsCheck2All } from "react-icons/bs";
import { MdMarkChatUnread, MdBlock, MdStarBorder, MdArchive, MdPerson, MdStar, MdUnarchive, MdColorLens, MdTimer, MdTimerOff } from "react-icons/md";
import EmojiPicker from "emoji-picker-react";
import SenderMessage from "./SenderMessage";
import ReceiverMessage from "./ReceiverMessage";
import axios from "axios";
import { serverUrl } from "../main.jsx";
import { setMessages } from "../redux/messageSlice.js";
import { setUnreadMessages } from "../redux/unreadSlice.js";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { toast } from "react-toastify";
import ForwardModal from "./ForwardModal.jsx";
import StatusViewer from "./StatusViewer.jsx";
import MediaEditor from "./MediaEditor.jsx";
import { createPortal } from "react-dom";

function MessageArea({ activeTab }) {
  const dispatch = useDispatch();
  const { selectedUser, userData, socket, onlineUsers, typingUsers, otherUsers } =
    useSelector((state) => state.user);
  const { messages } = useSelector((state) => state.message);
  const { unreadMessages } = useSelector((state) => state.unread);

  const [showPicker, setShowPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  // ✅ MENTION STATES
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionCursorIndex, setMentionCursorIndex] = useState(null);

  // ✅ DISAPPEARING MESSAGES STATE
  const [disappearingMode, setDisappearingMode] = useState(false);

  const [input, setInput] = useState("");
  const [frontendImage, setFrontendImage] = useState(null);
  const [backendImage, setBackendImage] = useState(null);

  const [fileType, setFileType] = useState(null);
  const [editorFile, setEditorFile] = useState(null);
  const [imageCaption, setImageCaption] = useState("");
  const [viewOnce, setViewOnce] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  // Group Info Modal States
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [isAddMemberView, setIsAddMemberView] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState("");

  // Group Editing States
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState("");
  const [showGroupNamePicker, setShowGroupNamePicker] = useState(false);
  const [isUpdatingGroupIcon, setIsUpdatingGroupIcon] = useState(false);
  const groupImageInputRef = useRef(null);

  const [mediaViewOpen, setMediaViewOpen] = useState(false);
  const [fullMediaView, setFullMediaView] = useState(null);
  const [selectedActionMessage, setSelectedActionMessage] = useState(null);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(null);
  const [lastSentMessageId, setLastSentMessageId] = useState(null);

  // Media Viewer Zoom State
  const [mediaZoom, setMediaZoom] = useState(1);

  const [viewingStatus, setViewingStatus] = useState(null);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [activeReactionId, setActiveReactionId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchMatches, setSearchMatches] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Theme & Custom Background States
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [chatTheme, setChatTheme] = useState("bg-[#efeae2]");
  const [customBg, setCustomBg] = useState(null);
  const [showBgEditor, setShowBgEditor] = useState(false);
  const [pendingBgImg, setPendingBgImg] = useState(null);
  const [bgSettings, setBgSettings] = useState({
    blur: 0,
    opacity: 100,
    zoom: 1,
    brightness: 100,
    contrast: 100
  });
  const bgInputRef = useRef(null);

  const [pinnedMessage, setPinnedMessage] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  const imageRef = useRef();
  const videoRef = useRef();
  const audioRef = useRef();
  const documentRef = useRef();

  const messagesEndRef = useRef();
  const pickerRef = useRef();
  const attachMenuRef = useRef();
  const typingTimeout = useRef(null);
  const audioRefSound = useRef(new Audio(notificationSound));
  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const prevMessagesLength = useRef(0);
  const activeUploads = useRef({});
  const searchInputRef = useRef(null);
  const messageRefs = useRef({});

  const currentChatUser = selectedUser || otherUsers?.find(u => u._id === selectedUser?._id);
  const isGroupChat = currentChatUser?.isGroup;

  const groupMembers = currentChatUser?.participants || currentChatUser?.members || [];
  const groupAdmins = currentChatUser?.groupAdmins || currentChatUser?.admins || [];

  const allMedia = messages?.filter((msg) => {
    const url = msg.image || msg.video;
    return url && (
      url.match(/\.(jpg|jpeg|png|webp|mp4|webm|ogg|mov|mp3|wav|m4a)$/i)
    );
  }) || [];

  const checkIsAdmin = (userId) => {
    if (!isGroupChat || !groupAdmins || groupAdmins.length === 0) return false;
    const targetId = (userId?._id || userId)?.toString();
    return groupAdmins.some(admin => (admin?._id || admin)?.toString() === targetId);
  };

  const amIAdmin = checkIsAdmin(userData?._id);

  const updateReduxGroup = (updatedGroup) => {
    const updatedList = otherUsers.map((u) => u._id === updatedGroup._id ? updatedGroup : u);
    dispatch(setOtherUsers(updatedList));
    if (selectedUser?._id === updatedGroup._id) {
      dispatch(setSelectedUser(updatedGroup));
    }
  };

  const handleTyping = (e) => {
    const newVal = e.target.value;
    setInput(newVal);

    socket.emit("typing", {
      senderId: userData._id,
      to: selectedUser._id,
    });

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("stopTyping", {
        senderId: userData._id,
        to: selectedUser._id,
      });
    }, 1500);

    if (!isGroupChat) return;

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newVal.slice(0, cursorPosition);

    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtSymbolIndex !== -1) {
      const query = textBeforeCursor.slice(lastAtSymbolIndex + 1);
      const isStartOfWord = lastAtSymbolIndex === 0 || textBeforeCursor[lastAtSymbolIndex - 1] === ' ';

      if (isStartOfWord) {
        setMentionCursorIndex(lastAtSymbolIndex);
        setMentionQuery(query);
        setShowMentionPopup(true);
      } else {
        setShowMentionPopup(false);
      }
    } else {
      setShowMentionPopup(false);
    }
  };

  const handleSelectMention = (memberName) => {
    if (mentionCursorIndex === null) return;

    const textBeforeAt = input.slice(0, mentionCursorIndex);
    const textAfterCursor = input.slice(mentionCursorIndex + 1 + mentionQuery.length);

    const newInput = `${textBeforeAt}@${memberName} ${textAfterCursor}`;
    setInput(newInput);
    setShowMentionPopup(false);
    setMentionQuery("");

    if (inputRef.current) inputRef.current.focus();
  };

  const filteredMembersForMention = groupMembers.filter(member =>
    member._id !== userData._id &&
    (member.name?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      member.userName?.toLowerCase().includes(mentionQuery.toLowerCase()))
  );

  const handleGroupAction = async (action, payload) => {
    try {
      if (action === 'leave') {
        if (!confirm("Are you sure you want to leave this group?")) return;
        await axios.put(`${serverUrl}/api/message/group/exit/${selectedUser._id}`, {}, { withCredentials: true });
        dispatch(setSelectedUser(null));
        setProfileModalOpen(false);
        toast.success("You left the group");
      }
      else if (action === 'remove_member') {
        if (!confirm(`Remove ${payload.name}?`)) return;
        const { data } = await axios.put(`${serverUrl}/api/message/group/remove/${selectedUser._id}`, { userId: payload.id }, { withCredentials: true });
        updateReduxGroup(data);
        toast.success("Member removed");
      }
      else if (action === 'add_member') {
        const { data } = await axios.put(`${serverUrl}/api/message/group/add/${selectedUser._id}`, { userId: payload.id }, { withCredentials: true });
        updateReduxGroup(data);
        toast.success("Member added");
      }
    } catch (error) {
      console.error(error);
      toast.error("Action failed");
    }
  };

  const handleUpdateGroupName = async () => {
    if (!editedGroupName.trim()) return;
    try {
      const { data } = await axios.put(
        `${serverUrl}/api/message/group/rename/${selectedUser._id}`,
        { name: editedGroupName },
        { withCredentials: true }
      );
      updateReduxGroup(data);
      setIsEditingName(false);
      toast.success("Group name updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to rename group");
    }
  };

  const handleUpdateGroupImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return toast.warning("Please select an image file");
    }

    setIsUpdatingGroupIcon(true);
    setEditorFile(file);
    e.target.value = "";
  };

  const themes = [
    { name: "Default", class: "bg-[#efeae2]" },
    { name: "Slate", class: "bg-slate-200" },
    { name: "Dark", class: "bg-[#0b141a]" },
    { name: "Midnight", class: "bg-gradient-to-b from-gray-900 to-gray-800" },
    { name: "Blue", class: "bg-blue-50" },
    { name: "Pink", class: "bg-pink-50" },
    { name: "Mint", class: "bg-green-50" },
    { name: "Lavender", class: "bg-purple-50" },
    { name: "Rose", class: "bg-red-50" },
    { name: "Amber", class: "bg-amber-50" },
    { name: "Sky", class: "bg-sky-100" },
    { name: "Teal", class: "bg-teal-50" },
    { name: "Gradient 1", class: "bg-gradient-to-br from-indigo-100 to-purple-100" },
    { name: "Gradient 2", class: "bg-gradient-to-tr from-orange-100 to-rose-100" },
    { name: "Ocean", class: "bg-gradient-to-br from-cyan-100 to-blue-200" },
    { name: "Sunset", class: "bg-gradient-to-tr from-yellow-100 to-red-100" },
    { name: "Forest", class: "bg-gradient-to-br from-green-100 to-emerald-200" },
    { name: "Berry", class: "bg-gradient-to-tr from-pink-100 to-purple-200" },
    { name: "Peach", class: "bg-gradient-to-bl from-orange-50 to-pink-50" },
    { name: "Galaxy", class: "bg-gradient-to-r from-blue-900 via-purple-900 to-black" },
  ];

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (selectedUser) {
      const savedTheme = localStorage.getItem(`chatTheme_${selectedUser._id}`);
      setChatTheme(savedTheme || "bg-[#efeae2]");

      const savedCustomBg = localStorage.getItem(`customBg_${selectedUser._id}`);
      if (savedCustomBg) {
        try {
          setCustomBg(JSON.parse(savedCustomBg));
        } catch (e) {
          console.error("Failed to parse custom bg");
          setCustomBg(null);
        }
      } else {
        setCustomBg(null);
      }

      setProfileModalOpen(false);
      setIsAddMemberView(false);
      setIsEditingName(false);
      setShowGroupNamePicker(false);

      // ✅ Load disappearing mode preference from LocalStorage
      const savedDisappearing = localStorage.getItem(`disappearingMode_${selectedUser._id}`);
      setDisappearingMode(savedDisappearing === "true");
    }
  }, [selectedUser]);

  useEffect(() => {
    if (messages && messages.length > 0) {
      const pinned = [...messages].reverse().find(m => m.isPinned);
      setPinnedMessage(pinned || null);
    } else {
      setPinnedMessage(null);
    }
  }, [messages]);

  const handleThemeSelection = (newThemeClass) => {
    setChatTheme(newThemeClass);
    setCustomBg(null);
    if (selectedUser) {
      localStorage.setItem(`chatTheme_${selectedUser._id}`, newThemeClass);
      localStorage.removeItem(`customBg_${selectedUser._id}`);
    }
  };

  const handleBgFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      return toast.warning("Please select an image file");
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPendingBgImg(ev.target.result);
      setBgSettings({
        blur: 0,
        opacity: 100,
        zoom: 1,
        brightness: 100,
        contrast: 100
      });
      setShowBgEditor(true);
      setShowThemeModal(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSaveCustomBg = () => {
    if (!pendingBgImg) return;

    const newCustomBg = {
      url: pendingBgImg,
      blur: bgSettings.blur,
      opacity: bgSettings.opacity,
      zoom: bgSettings.zoom,
      brightness: bgSettings.brightness,
      contrast: bgSettings.contrast
    };

    setCustomBg(newCustomBg);
    setChatTheme("bg-[#efeae2]");

    if (selectedUser) {
      try {
        localStorage.setItem(`customBg_${selectedUser._id}`, JSON.stringify(newCustomBg));
        localStorage.setItem(`chatTheme_${selectedUser._id}`, "bg-[#efeae2]");
      } catch (e) {
        toast.error("Image too large to save locally. It will persist for this session only.");
      }
    }

    setShowBgEditor(false);
    setPendingBgImg(null);
    toast.success("Background applied");
  };

  useEffect(() => {
    if (!searchText.trim()) {
      setSearchMatches([]);
      setCurrentMatchIndex(0);
      return;
    }
    const matches = messages
      .map((msg, index) => ({ msg, index }))
      .filter(item => item.msg.message && item.msg.message.toLowerCase().includes(searchText.toLowerCase()))
      .map(item => item.index);

    setSearchMatches(matches);

    if (matches.length > 0) {
      setCurrentMatchIndex(matches.length - 1);
    } else {
      setCurrentMatchIndex(0);
    }
  }, [searchText, messages]);

  useEffect(() => {
    if (searchMatches.length > 0 && isSearchOpen) {
      const msgIndex = searchMatches[currentMatchIndex];
      const msgId = messages[msgIndex]?._id;

      if (msgId && messageRefs.current[msgId]) {
        const el = document.getElementById(`message-${msgId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [currentMatchIndex, searchMatches, isSearchOpen]);

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev < searchMatches.length - 1 ? prev + 1 : 0));
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev > 0 ? prev - 1 : searchMatches.length - 1));
  };

  const handleInteraction = (msgData, type) => {
    if (type === "longPress") {
      if (!selectedMessages.find((m) => m._id === msgData._id)) {
        setSelectedMessages((prev) => [...prev, msgData]);
      }
      setActiveReactionId(msgData._id);

    } else if (type === "click") {
      if (activeReactionId) {
        setActiveReactionId(null);
      }

      if (selectedMessages.length > 0) {
        if (selectedMessages.find((m) => m._id === msgData._id)) {
          setSelectedMessages((prev) =>
            prev.filter((m) => m._id !== msgData._id)
          );
        } else {
          setSelectedMessages((prev) => [...prev, msgData]);
        }
      } else {
        if (msgData.image || msgData.video) {
          if (!msgData.mediaType || msgData.mediaType !== 'file') {
            const idx = allMedia.findIndex((m) => m._id === msgData._id);
            if (idx !== -1) openMedia(idx);
          }
        }
      }
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;

    const isBottom = scrollTop + clientHeight >= scrollHeight - 100;

    setIsAtBottom(isBottom);
    setShowScrollBottom(!isBottom);

    if (isBottom) {
      setHasNewMessages(false);
      setNewMsgCount(0);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setHasNewMessages(false);
    setNewMsgCount(0);
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      setFileType("image");
      setFrontendImage(URL.createObjectURL(file));
    } else if (file.type.startsWith("video/")) {
      setFileType("video");
      setFrontendImage(URL.createObjectURL(file));
    } else if (file.type.startsWith("audio/")) {
      setFileType("audio");
      setFrontendImage(URL.createObjectURL(file));
    } else {
      setFileType("file");
      setFrontendImage(file.name);
    }

    setBackendImage(file);
    setShowAttachMenu(false);
    e.target.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audioFile = new File([audioBlob], "voice-note.mp3", { type: "audio/mp3" });

        setBackendImage(audioFile);
        setFrontendImage(audioUrl);
        setFileType("audio");

        stream.getTracks().forEach(track => track.stop());

        socket.emit("stopAudioRecording", {
          senderId: userData._id,
          to: selectedUser._id,
        });
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingDuration(0);

      socket.emit("audioRecording", {
        senderId: userData._id,
        to: selectedUser._id,
      });

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleEditClick = () => {
    if (backendImage && fileType === "image") {
      setEditorFile(backendImage);
    }
  };

  const handleEditorSave = async ({ file }) => {
    if (isUpdatingGroupIcon) {
      const formData = new FormData();
      formData.append("image", file);

      try {
        const { data } = await axios.put(
          `${serverUrl}/api/message/group/image/${selectedUser._id}`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            withCredentials: true
          }
        );
        updateReduxGroup(data);
        toast.success("Group image updated");
      } catch (error) {
        console.error(error);
        toast.error("Failed to update image");
      }
      setIsUpdatingGroupIcon(false);
      setEditorFile(null);
    } else {
      setBackendImage(file);
      setFrontendImage(URL.createObjectURL(file));
      setEditorFile(null);
    }
  };

  const handleEditorCancel = () => {
    setEditorFile(null);
    setIsUpdatingGroupIcon(false);
  };

  const handleCancelUpload = (tempId) => {
    if (activeUploads.current[tempId]) {
      activeUploads.current[tempId].abort();
      delete activeUploads.current[tempId];
      dispatch(setMessages(messages.filter(m => m._id !== tempId)));
      toast.info("Upload cancelled");
    }
  };

  const performHeaderAction = async (action) => {
    // ✅ SAVE PREFERENCE TO LOCAL STORAGE
    if (action === "DisappearingMessages") {
      const newMode = !disappearingMode;
      setDisappearingMode(newMode);
      localStorage.setItem(`disappearingMode_${selectedUser._id}`, newMode.toString());
      toast.info(`Disappearing messages ${newMode ? "ON (24h)" : "OFF"}`);
      return;
    }

    if (!currentChatUser && action !== "Search" && action !== "ChatTheme") return;
    const targetId = currentChatUser?._id;

    try {
      if (action === "Delete") {
        await axios.delete(`${serverUrl}/api/message/conversation/${targetId}`, { withCredentials: true });
        dispatch(setMessages([]));

        const updatedUsers = otherUsers.map(u =>
          u._id === targetId ? { ...u, lastMessage: null, unreadCount: 0 } : u
        );
        dispatch(setOtherUsers(updatedUsers));
        toast.success("Chat cleared");
      }
      else if (action === "GroupInfo") {
        setProfileModalOpen(true);
      }
      else if (action === "Block") {
        await axios.post(`${serverUrl}/api/user/block`, { userIdToBlock: targetId }, { withCredentials: true });
        const updatedUsers = otherUsers.map(u =>
          u._id === targetId ? { ...u, isBlocked: true, image: "" } : u
        );
        dispatch(setOtherUsers(updatedUsers));
        toast.success("User blocked");
      }
      else if (action === "Unblock") {
        await axios.post(`${serverUrl}/api/user/unblock`, { userIdToUnblock: targetId }, { withCredentials: true });
        const updatedUsers = otherUsers.map(u =>
          u._id === targetId ? { ...u, isBlocked: false } : u
        );
        dispatch(setOtherUsers(updatedUsers));
        toast.success("User unblocked");
      }
      else if (action === "Archive") {
        await axios.post(`${serverUrl}/api/user/toggle-archive`, { targetUserId: targetId }, { withCredentials: true });
        const updatedUsers = otherUsers.map(u =>
          u._id === targetId ? { ...u, isArchived: !u.isArchived } : u
        );
        dispatch(setOtherUsers(updatedUsers));
        toast.info(currentChatUser.isArchived ? "Unarchived" : "Archived");
      }
      else if (action === "Favorite") {
        await axios.post(`${serverUrl}/api/user/toggle-favorite`, { targetUserId: targetId }, { withCredentials: true });
        const updatedUsers = otherUsers.map(u =>
          u._id === targetId ? { ...u, isFavorite: !u.isFavorite } : u
        );
        dispatch(setOtherUsers(updatedUsers));
        toast.success(currentChatUser.isFavorite ? "Removed from favorites" : "Added to favorites");
      }
      else if (action === "MarkUnread") {
        await axios.post(`${serverUrl}/api/user/toggle-unread`, { targetUserId: targetId }, { withCredentials: true });
        const updatedUsers = otherUsers.map(u =>
          u._id === targetId ? { ...u, isMarkedUnread: !u.isMarkedUnread } : u
        );
        dispatch(setOtherUsers(updatedUsers));
        toast.info("Marked as unread");
        dispatch(setSelectedUser(null));
      }
      else if (action === "ViewContact") {
        setProfileModalOpen(true);
      }
      else if (action === "Search") {
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      else if (action === "ChatTheme") {
        setShowThemeModal(true);
      }
    } catch (error) {
      console.error("Header Action Error:", error);
      toast.error("Action failed");
    } finally {
      setShowHeaderMenu(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() && !backendImage) return;

    const tempId = `temp-${Date.now()}`;
    const controller = new AbortController();

    if (backendImage) {
      activeUploads.current[tempId] = controller;
    }

    // Calculate expiration if mode is on (e.g., 24 hours = 86400 seconds)
    const expiresIn = disappearingMode ? 86400 : 0;

    const optimisticMessage = {
      _id: tempId,
      sender: userData._id,
      receiver: selectedUser._id,
      message: input || imageCaption,
      image: fileType === "file" ? frontendImage : (frontendImage || null),
      mediaType: fileType,
      createdAt: new Date().toISOString(),
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null, // Optimistic expiration
      status: "sending",
      replyTo: replyingTo ? replyingTo : null
    };

    dispatch(setMessages([...(messages || []), optimisticMessage]));

    setInput("");
    setFrontendImage(null);
    setBackendImage(null);
    setFileType(null);
    setImageCaption("");
    const wasViewOnce = viewOnce;
    const wasReplyingTo = replyingTo;
    setViewOnce(false);
    setReplyingTo(null);

    try {
      const formData = new FormData();
      formData.append("message", optimisticMessage.message);

      if (backendImage) {
        formData.append("image", backendImage);
        formData.append("mediaType", fileType);
      }

      if (wasViewOnce) formData.append("viewOnce", wasViewOnce);
      if (wasReplyingTo) formData.append("replyTo", wasReplyingTo._id);
      if (expiresIn) formData.append("expiresIn", expiresIn); // ✅ Send Expiration to Backend

      const result = await axios.post(
        `${serverUrl}/api/message/send/${selectedUser._id}`,
        formData,
        {
          withCredentials: true,
          signal: controller.signal
        }
      );

      dispatch(setMessages(
        (messages || []).map(msg => msg._id === tempId ? result.data : msg).concat(optimisticMessage).slice(0, -1).concat(result.data)
      ));

      dispatch((dispatch, getState) => {
        const currentMessages = getState().message.messages;
        const updated = currentMessages.map(m => m._id === tempId ? result.data : m);
        dispatch(setMessages(updated));
      });

      setLastSentMessageId(result.data._id);
      delete activeUploads.current[tempId];

      socket.emit("stopTyping", {
        senderId: userData._id,
        receiverId: selectedUser._id,
      });
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log("Upload aborted by user");
      } else {
        console.error("Send message error:", error);
        dispatch((dispatch, getState) => {
          const currentMessages = getState().message.messages;
          const updated = currentMessages.filter(m => m._id !== tempId);
          dispatch(setMessages(updated));
        });

        if (error.response) {
          toast.error(`Message failed: ${error.response.data.message || "Server error"}`);
        } else {
          toast.error("Error sending message. Try again.");
        }
      }
    }
  };

  const onEmojiClick = (emojiData) => {
    setInput((prev) => prev + emojiData.emoji);
  };

  const handleReaction = async (messageId, emoji) => {
    setActiveReactionId(null);
    try {
      const res = await axios.put(
        `${serverUrl}/api/message/react/${messageId}`,
        { emoji },
        { withCredentials: true }
      );
      dispatch(
        setMessages(
          messages.map((m) =>
            m._id === messageId ? { ...m, reactions: res.data.reactions } : m
          )
        )
      );
      setSelectedActionMessage(null);
    } catch (err) {
      console.error("Reaction error:", err);
    }
  };

  const handlePinMessage = async () => {
    const msg = selectedMessages[0];
    if (!msg) return;

    const updatedMessages = messages.map(m =>
      m._id === msg._id ? { ...m, isPinned: !m.isPinned } : m
    );
    dispatch(setMessages(updatedMessages));
    setSelectedMessages([]);
    setShowMoreOptions(false);
    setActiveReactionId(null);

    try {
      await axios.put(`${serverUrl}/api/message/pin/${msg._id}`, {}, { withCredentials: true });

      socket.emit("pinMessage", {
        messageId: msg._id,
        isPinned: !msg.isPinned,
        senderId: userData._id,
        receiverId: selectedUser._id
      });

      toast.success(msg.isPinned ? "Message unpinned" : "Message pinned");

    } catch (err) {
      console.error("Pin message error:", err);
      const revertedMessages = messages.map(m =>
        m._id === msg._id ? { ...m, isPinned: msg.isPinned } : m
      );
      dispatch(setMessages(revertedMessages));
      toast.error("Failed to pin message");
    }
  };

  const handleDelete = async (messageId, forEveryone = false) => {
    try {
      await axios.put(
        `${serverUrl}/api/message/delete/${messageId}`,
        { forEveryone },
        { withCredentials: true }
      );
      setSelectedActionMessage(null);
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleBulkDelete = async (forEveryone) => {
    for (const msg of selectedMessages) {
      if (forEveryone && (msg.sender?._id || msg.sender) !== userData._id) continue;
      await handleDelete(msg._id, forEveryone);
    }
    setSelectedMessages([]);
    setShowDeleteModal(false);
    setActiveReactionId(null);
  };

  const handleBulkCopy = () => {
    const textToCopy = selectedMessages
      .map((m) => m.message || "")
      .filter((t) => t)
      .join("\n");
    handleCopy(textToCopy);
    setSelectedMessages([]);
    setShowMoreOptions(false);
    setActiveReactionId(null);
  };

  const handleReplySelected = () => {
    if (selectedMessages.length === 1) {
      setReplyingTo({
        _id: selectedMessages[0]._id,
        message: selectedMessages[0].message,
        image: selectedMessages[0].image,
      });
      setSelectedMessages([]);
      setActiveReactionId(null);
    }
  };

  const handleForwardSelected = () => {
    if (selectedMessages.length > 0) {
      setForwardOpen(true);
      setActiveReactionId(null);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard?.writeText(text || "");
      toast.success("Copied to clipboard");
    } catch (e) {
      console.error("Copy error:", e);
    }
  };

  const openForwardModal = (msgId) => {
    setSelectedActionMessage((m) => ({ ...(m || {}), _id: msgId }));
    setForwardOpen(true);
    setActiveReactionId(null);
  };

  const handleStatusClick = async (statusId) => {
    if (!statusId) return;
    try {
      const res = await axios.get(`${serverUrl}/api/status/${statusId}`, {
        withCredentials: true,
      });
      if (res.data) {
        setViewingStatus([res.data]);
      } else {
        toast.info("Status is no longer available");
      }
    } catch (error) {
      console.error("Error fetching status:", error);
      toast.info("Status unavailable or expired");
    }
  };

  useEffect(() => {
    setIsAtBottom(true);
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [selectedUser]);

  useEffect(() => {
    if (messagesEndRef.current && isAtBottom && !isSearchOpen) {
      const currentLength = messages?.length || 0;
      if (currentLength > prevMessagesLength.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
    prevMessagesLength.current = messages?.length || 0;
  }, [messages, isAtBottom, isSearchOpen]);

  useEffect(() => {
    if (!messagesEndRef.current || !lastSentMessageId) return;

    const lastMsg = messages[messages.length - 1];

    if (lastMsg._id === lastSentMessageId) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      setLastSentMessageId(null);
    }
  }, [messages, lastSentMessageId]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const openMedia = (index) => {
    const msg = allMedia[index];
    const url = msg.image || msg.video;

    let type = "image";
    if (url && url.match(/\.(mp4|webm|ogg|mov)$/i)) type = "video";
    if (url && url.match(/\.(mp3|wav|m4a|aac)$/i)) type = "audio";

    setCurrentMediaIndex(index);
    setMediaZoom(1); // Reset zoom on new media
    setFullMediaView({
      url: url,
      type: type,
    });
    setActiveReactionId(null);
  };

  const handleNext = () => {
    const nextIndex = (currentMediaIndex + 1) % allMedia.length;
    openMedia(nextIndex);
  };

  const handlePrev = () => {
    const prevIndex =
      (currentMediaIndex - 1 + allMedia.length) % allMedia.length;
    openMedia(prevIndex);
  };

  useEffect(() => {
    if (!fullMediaView) return;
    const handleKey = (e) => {
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") setFullMediaView(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [fullMediaView, currentMediaIndex]);

  useEffect(() => {
    if (!socket) return;

    socket.on("newMessage", (mess) => {
      const formattedMessage = {
        ...mess,
        sender: mess.sender?._id || mess.sender,
        receiver: mess.receiver?._id || mess.receiver,
      };

      if (selectedUser && (formattedMessage.sender === selectedUser._id || formattedMessage.receiver === selectedUser._id)) {
        dispatch(setMessages([...(messages || []), formattedMessage]));
      }

      if (formattedMessage.sender !== userData._id && !mess.isSystem) {
        toast.info(
          `💬 ${formattedMessage.senderName || "Someone"}: ${formattedMessage.message || "📷 Media"
          }`
        );

        if (Notification.permission === "granted") {
          new Notification(formattedMessage.senderName || "New Message", {
            body: formattedMessage.message || "📷 Media",
            icon: formattedMessage.senderImage || dp,
          });
        }

        try {
          audioRefSound.current.currentTime = 0;
          audioRefSound.current.play();
        } catch (err) {
          console.error("Sound play blocked:", err);
        }

        if (!selectedUser || selectedUser._id !== formattedMessage.sender) {
          dispatch(
            setUnreadMessages({
              userId: formattedMessage.sender,
              count: (unreadMessages[formattedMessage.sender]?.count || 0) + 1,
              lastUpdated: Date.now(),
            })
          );
        }
      }
    });

    socket.on("messagesSeen", ({ userId, messageIds }) => {
      dispatch(
        setMessages(
          messages.map((msg) =>
            messageIds?.includes(msg._id.toString())
              ? {
                ...msg,
                status: "seen",
                details: { ...msg.details, seenAt: new Date().toISOString() }
              }
              : msg
          )
        )
      );
    });

    socket.on("messageDelivered", ({ messageId, deliveredAt }) => {
      dispatch(
        setMessages(
          messages.map((msg) =>
            msg._id === messageId
              ? {
                ...msg,
                status: "delivered",
                details: { ...msg.details, deliveredAt: deliveredAt ? new Date(deliveredAt).toISOString() : new Date().toISOString() }
              }
              : msg
          )
        )
      );
    });

    socket.on("messagesDelivered", ({ receiverId, deliveredAt }) => {
      dispatch(setMessages(
        messages.map(msg =>
          msg.status === 'sent'
            ? { ...msg, status: 'delivered', details: { ...msg.details, deliveredAt: deliveredAt ? new Date(deliveredAt).toISOString() : new Date().toISOString() } }
            : msg
        )
      ));
    });

    socket.on("typing", ({ senderId }) => {
      dispatch(setTyping({ userId: senderId, isTyping: true }));
    });

    socket.on("stopTyping", ({ senderId }) => {
      dispatch(setTyping({ userId: senderId, isTyping: false }));
    });

    socket.on("messageReacted", ({ messageId, reactions }) => {
      dispatch(
        setMessages(
          messages.map((m) =>
            m._id === messageId ? { ...m, reactions } : m
          )
        )
      );
    });

    socket.on("messageDeleted", ({ messageId, forEveryone, userId }) => {
      dispatch(
        setMessages(
          messages.map((m) => {
            if (m._id !== messageId) return m;
            if (forEveryone) {
              return { ...m, isDeleted: true, message: "", image: "" };
            } else {
              return {
                ...m,
                deletedFor: [...(m.deletedFor || []), userId],
              };
            }
          })
        )
      );
    });

    socket.on("messagePinned", ({ messageId, isPinned }) => {
      dispatch(
        setMessages(
          messages.map(m => m._id === messageId ? { ...m, isPinned } : m)
        )
      );
    });

    return () => {
      socket.off("newMessage");
      socket.off("messagesSeen");
      socket.off("messageDelivered");
      socket.off("messagesDelivered");
      socket.off("typing");
      socket.off("stopTyping");
      socket.off("messageReacted");
      socket.off("messageDeleted");
      socket.off("messagePinned");
    };
  }, [socket, dispatch, messages, selectedUser, unreadMessages, userData]);

  useEffect(() => {
    if (!socket) return;

    socket.on("messageStatusUpdate", ({ messageId, status }) => {
      dispatch(
        setMessages(
          messages.map((msg) =>
            msg._id === messageId ? { ...msg, status } : msg
          )
        )
      );
    });

    return () => {
      socket.off("messageStatusUpdate");
    };
  }, [socket, messages, dispatch]);

  useEffect(() => {
    if (!selectedUser || !socket) return;

    socket.emit("markDelivered", {
      senderId: selectedUser._id,
      receiverId: userData._id,
    });
  }, [selectedUser, socket, userData]);

  useEffect(() => {
    if (!selectedUser || !socket) return;

    const markSeen = async () => {
      try {
        await axios.put(
          `${serverUrl}/api/message/seen/${selectedUser._id}`,
          {},
          { withCredentials: true }
        );

        socket.emit("markSeen", {
          senderId: selectedUser._id,
          receiverId: userData._id,
        });
      } catch (err) {
        console.error("Error marking seen:", err);
      }
    };

    markSeen();
  }, [selectedUser, messages, socket, userData]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target)) {
        setShowAttachMenu(false);
      }
      if (showHeaderMenu && !e.target.closest('.header-menu-container')) {
        setShowHeaderMenu(false);
      }
      if (activeReactionId && !e.target.closest('.mobile-quick-react-bar')) {
        setActiveReactionId(null);
      }

      if (showGroupNamePicker && !e.target.closest('.group-name-edit-container')) {
        setShowGroupNamePicker(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showHeaderMenu, activeReactionId, showGroupNamePicker]);

  const getLastSeen = () => {
    if (!selectedUser?.lastSeen) return null;
    return `last seen ${formatDistanceToNow(new Date(selectedUser.lastSeen), {
      addSuffix: true,
    })}`;
  };

  const getGroupSubtitle = () => {
    if (!groupMembers.length) return "Group";
    const names = groupMembers.map(m => m._id === userData._id ? "You" : m.name).join(", ");
    return names.length > 40 ? names.substring(0, 40) + "..." : names;
  };

  const renderDateDivider = (currentMsg, prevMsg) => {
    if (!currentMsg?.createdAt) return null;
    const currentDate = new Date(currentMsg.createdAt);
    const prevDate = prevMsg ? new Date(prevMsg.createdAt) : null;

    if (!prevMsg || currentDate.toDateString() !== prevDate?.toDateString()) {
      if (isToday(currentDate))
        return (
          <div className="text-center text-gray-500 text-sm my-2">Today</div>
        );
      if (isYesterday(currentDate))
        return (
          <div className="text-center text-gray-500 text-sm my-2">
            Yesterday
          </div>
        );
      return (
        <div className="text-center text-gray-500 text-sm my-2">
          {format(currentDate, "MMMM d, yyyy")}
        </div>
      );
    }
    return null;
  };

  const handleDownload = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `media-${Date.now()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error(error);
      toast.error("Download failed");
    }
  };

  // Helper to get current media message details for viewer
  const getCurrentMediaDetails = () => {
    if (currentMediaIndex === null || !allMedia[currentMediaIndex]) return null;
    const msg = allMedia[currentMediaIndex];
    const isSender = (msg.sender?._id || msg.sender) === userData._id;
    return {
      senderName: isSender ? "You" : msg.sender?.name || "User",
      senderImage: isSender ? userData.image : msg.sender?.image,
      time: format(new Date(msg.createdAt), "p, MMMM d"),
      caption: msg.message,
      message: msg
    };
  };

  if (activeTab === "status" && window.innerWidth < 1024 && !selectedUser) {
    return null;
  }

  return (
    <div
      className={`relative lg:w-[70%] w-full h-full ${chatTheme} border-l-2 border-gray-300 ${selectedUser || activeTab === "status" ? "flex" : "hidden"
        } lg:flex`}
    >
      {/* CUSTOM BACKGROUND LAYER */}
      {customBg && (
        <div
          className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
        >
          <div
            className="w-full h-full bg-cover bg-center transition-all duration-300"
            style={{
              backgroundImage: `url(${customBg.url})`,
              filter: `blur(${customBg.blur}px) opacity(${customBg.opacity}%) brightness(${customBg.brightness}%) contrast(${customBg.contrast}%)`,
              transform: `scale(${customBg.zoom})`
            }}
          ></div>
        </div>
      )}

      {editorFile && (
        <MediaEditor
          file={editorFile}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
        />
      )}

      {selectedUser ? (
        <div className="flex flex-col w-full h-full z-10 relative">
          {/* Added z-10 relative to ensure content sits above background */}
          {selectedMessages.length > 0 ? (
            <div className="h-[100px] bg-[#1a7fa0] rounded-b-[30px] shadow-md flex items-center justify-between px-6 relative z-50">
              <div className="flex items-center gap-4">
                <IoIosArrowRoundBack
                  className="w-10 h-10 text-white cursor-pointer"
                  onClick={() => {
                    setSelectedMessages([]);
                    setActiveReactionId(null);
                  }}
                />
                <span className="text-white text-2xl font-bold">{selectedMessages.length}</span>
              </div>

              <div className="flex items-center gap-6 text-white">
                {selectedMessages.length === 1 && (
                  <RiReplyLine size={24} className="cursor-pointer" onClick={handleReplySelected} />
                )}

                <RiDeleteBin6Line size={24} className="cursor-pointer" onClick={() => setShowDeleteModal(true)} />

                {selectedMessages.length > 1 && (
                  <FiCopy size={24} className="cursor-pointer" onClick={handleBulkCopy} />
                )}

                <FiShare size={24} className="cursor-pointer" onClick={handleForwardSelected} />

                {selectedMessages.length === 1 && (
                  <div className="relative">
                    <BsThreeDotsVertical
                      size={24}
                      className="cursor-pointer"
                      onClick={() => setShowMoreOptions(!showMoreOptions)}
                    />
                    {showMoreOptions && (
                      isMobile ? createPortal(
                        <div
                          className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/40"
                          onClick={() => setShowMoreOptions(false)}
                        >
                          <div
                            className="bg-white rounded-xl shadow-lg flex flex-col w-64 p-2 animate-scale-in"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button onClick={handleBulkCopy} className="px-4 py-3 text-left hover:bg-gray-100 rounded-lg text-lg flex items-center gap-3"><FiCopy /> Copy</button>
                            <button onClick={() => { setShowDetailsModal(true); setShowMoreOptions(false) }} className="px-4 py-3 text-left hover:bg-gray-100 rounded-lg text-lg flex items-center gap-3"><RiInformationLine /> Details</button>
                            <button onClick={handlePinMessage} className="px-4 py-3 text-left hover:bg-gray-100 rounded-lg text-lg flex items-center gap-3">
                              {selectedMessages[0].isPinned ? <BsPinAngleFill /> : <BsPinAngle />} {selectedMessages[0].isPinned ? "Unpin" : "Pin"}
                            </button>
                          </div>
                        </div>,
                        document.body
                      ) : (
                        <div className="absolute top-10 right-0 bg-white text-black rounded shadow-lg py-2 w-36 z-50">
                          <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2" onClick={handleBulkCopy}>
                            <FiCopy /> Copy
                          </div>
                          <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2" onClick={() => { setShowDetailsModal(true); setShowMoreOptions(false) }}>
                            <RiInformationLine /> Details
                          </div>
                          <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2" onClick={handlePinMessage}>
                            {selectedMessages[0].isPinned ? <BsPinAngleFill className="text-[#1a7fa0]" /> : <BsPinAngle />}
                            {selectedMessages[0].isPinned ? "Unpin" : "Pin"}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            isSearchOpen ? (
              <div className="h-[80px] sm:h-[100px] bg-white text-gray-800 rounded-b-[30px] shadow-md flex items-center gap-3 px-4 sm:px-6 relative z-50 animate-fade-in-up">
                <IoIosArrowBack
                  size={28}
                  className="cursor-pointer text-gray-500 hover:text-black mr-2 min-w-[28px]"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchText("");
                  }}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  className="flex-1 bg-gray-100 rounded-full px-4 py-2 outline-none text-lg"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                {searchText && (
                  <IoMdClose
                    size={24}
                    className="cursor-pointer text-gray-500 hover:text-red-500"
                    onClick={() => setSearchText("")}
                  />
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 whitespace-nowrap hidden sm:block">
                    {searchMatches.length > 0
                      ? `${currentMatchIndex + 1} of ${searchMatches.length}`
                      : "No results"
                    }
                  </span>
                  <button
                    className="p-2 hover:bg-gray-200 rounded-full disabled:opacity-30"
                    onClick={handlePrevMatch}
                    disabled={searchMatches.length === 0}
                  >
                    <RiArrowUpSLine size={24} />
                  </button>
                  <button
                    className="p-2 hover:bg-gray-200 rounded-full disabled:opacity-30"
                    onClick={handleNextMatch}
                    disabled={searchMatches.length === 0}
                  >
                    <RiArrowDownSLine size={24} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="h-[80px] sm:h-[100px] bg-[#1a7fa0] rounded-b-[30px] shadow-md flex items-center gap-5 px-6 relative z-10">
                  <IoIosArrowRoundBack
                    className="w-10 h-10 text-white cursor-pointer"
                    onClick={() => {
                      setSelectedActionMessage(null);
                      dispatch(setSelectedUser(null));
                    }}
                  />
                  <div
                    className="relative w-[50px] h-[50px] rounded-full overflow-hidden shadow-md cursor-pointer"
                    onClick={() => setProfileModalOpen(true)}
                  >
                    <img
                      src={selectedUser?.image || dp}
                      alt="profile"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col flex-1 cursor-pointer" onClick={() => setProfileModalOpen(true)}>
                    <h1 className="text-white font-semibold text-xl">
                      {selectedUser?.name || "User"}
                    </h1>
                    <span className="text-white text-sm line-clamp-1 opacity-90">
                      {isGroupChat ? (
                        getGroupSubtitle() // Show member names
                      ) : (
                        onlineUsers?.includes(selectedUser?._id)
                          ? typingUsers[selectedUser._id]
                            ? "typing..."
                            : "Online"
                          : getLastSeen() || ""
                      )}
                    </span>
                  </div>

                  <div className="relative header-menu-container">
                    <BsThreeDotsVertical
                      size={26}
                      className="text-white cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHeaderMenu(!showHeaderMenu);
                      }}
                    />
                    {showHeaderMenu && (
                      <div className="absolute right-0 top-10 bg-white text-black shadow-xl rounded-lg py-2 w-56 z-50 animate-scale-in origin-top-right">
                        {currentChatUser && (
                          <>
                            <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3 text-sm" onClick={() => performHeaderAction(isGroupChat ? "GroupInfo" : "ViewContact")}>
                              <MdPerson size={18} /> {isGroupChat ? "Group info" : "View contact"}
                            </div>
                            <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3 text-sm" onClick={() => performHeaderAction("Search")}>
                              <RiSearchLine size={18} /> Search
                            </div>
                            <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3 text-sm" onClick={() => performHeaderAction("ChatTheme")}>
                              <MdColorLens size={18} /> Chat Theme
                            </div>
                            <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3 text-sm" onClick={() => performHeaderAction("DisappearingMessages")}>
                              {disappearingMode ? <MdTimerOff size={18} className="text-blue-500" /> : <MdTimer size={18} />}
                              {disappearingMode ? "Turn off disappearing" : "Disappearing messages"}
                            </div>
                            {!isGroupChat && (
                              <>
                                <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3 text-sm" onClick={() => performHeaderAction("MarkUnread")}>
                                  <MdMarkChatUnread size={18} /> {currentChatUser.isMarkedUnread ? "Mark as Read" : "Mark as Unread"}
                                </div>
                                <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3 text-sm" onClick={() => performHeaderAction("Favorite")}>
                                  {currentChatUser.isFavorite ? <MdStar size={18} className="text-yellow-500" /> : <MdStarBorder size={18} />}
                                  {currentChatUser.isFavorite ? "Remove Favourite" : "Add to Favourites"}
                                </div>
                              </>
                            )}
                            <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3 text-sm" onClick={() => performHeaderAction("Archive")}>
                              {currentChatUser.isArchived ? <MdUnarchive size={18} /> : <MdArchive size={18} />}
                              {currentChatUser.isArchived ? "Unarchive chat" : "Archive chat"}
                            </div>
                            {!isGroupChat && (
                              <div className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-3 text-sm text-red-600" onClick={() => performHeaderAction("Delete")}>
                                <RiDeleteBin6Line size={18} /> Delete chat
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {pinnedMessage && !selectedMessages.length > 0 && (
                  <div
                    className="absolute -bottom-10 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-sm px-4 py-2 flex items-center gap-3 cursor-pointer z-0 border-b border-gray-100 animate-slide-down"
                    onClick={() => {
                      const el = document.getElementById(`message-${pinnedMessage._id}`);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('highlighted-message');
                        setTimeout(() => el.classList.remove('highlighted-message'), 2000);
                      }
                    }}
                  >
                    <BsPinAngleFill className="text-[#1a7fa0] flex-shrink-0" />
                    <div className="flex-1 min-w-0 flex flex-col">
                      <span className="text-xs font-bold text-[#1a7fa0]">Pinned Message</span>
                      <span className="text-sm text-gray-700 truncate">
                        {pinnedMessage.message || (pinnedMessage.image ? "📷 Media" : "")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {/* Profile / Group Info Modal */}
          {profileModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm transition-all">
              <div className="bg-white rounded-2xl w-full max-w-[380px] flex flex-col max-h-[90vh] shadow-2xl animate-scale-in">
                {/* Header Image Part */}
                {!isAddMemberView && (
                  <div className="relative w-full aspect-square bg-gray-100 group">
                    <div className="absolute inset-0 overflow-hidden rounded-t-2xl">
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/80 via-transparent to-black/30 z-10 pointer-events-none"></div>

                      <button
                        className="absolute top-4 right-4 z-20 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 transition-all backdrop-blur-md border border-white/10 cursor-pointer"
                        onClick={() => setProfileModalOpen(false)}
                      >
                        <RxCross2 size={22} />
                      </button>

                      <img
                        src={selectedUser?.image || dp}
                        alt="profile"
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-700"
                        onClick={() => {
                          const imgUrl = selectedUser?.image || dp;
                          if (imgUrl) setFullMediaView({ url: imgUrl, type: "image", isProfile: true });
                        }}
                      />
                    </div>

                    {/* EDIT IMAGE BUTTON (ADMIN ONLY) */}
                    {amIAdmin && (
                      <>
                        <button
                          onClick={() => groupImageInputRef.current?.click()}
                          className="absolute bottom-24 right-4 z-30 bg-white text-[#1a7fa0] p-3 rounded-full shadow-lg hover:bg-gray-100 transition-transform active:scale-95 flex items-center justify-center pointer-events-auto"
                          title="Change Group Icon"
                        >
                          <FiCamera size={20} />
                        </button>
                        <input
                          type="file"
                          ref={groupImageInputRef}
                          onChange={handleUpdateGroupImage}
                          hidden
                          accept="image/*"
                        />
                      </>
                    )}

                    <div className="absolute bottom-0 left-0 w-full p-5 z-20">
                      {/* EDIT NAME SECTION WITH EMOJI PICKER */}
                      {isEditingName && amIAdmin ? (
                        <div className="flex items-center gap-2 mb-1 pointer-events-auto relative group-name-edit-container">
                          <div className="relative w-full">
                            <input
                              value={editedGroupName}
                              onChange={(e) => setEditedGroupName(e.target.value)}
                              className="bg-white/90 text-black px-2 py-1 pr-10 rounded text-xl font-bold outline-none w-full"
                              autoFocus
                            />
                            {/* Emoji Toggle Button */}
                            <button
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-yellow-500 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowGroupNamePicker(!showGroupNamePicker);
                              }}
                            >
                              <RiEmojiStickerLine size={20} />
                            </button>

                            {/* Emoji Picker Popup */}
                            {showGroupNamePicker && createPortal(
                              <div
                                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/10 backdrop-blur-[1px]"
                                onClick={() => setShowGroupNamePicker(false)}
                              >
                                <div className="relative shadow-2xl rounded-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
                                  <EmojiPicker
                                    width={320}
                                    height={400}
                                    onEmojiClick={(emojiData) => setEditedGroupName(prev => prev + emojiData.emoji)}
                                    previewConfig={{ showPreview: false }}
                                  />
                                  <button
                                    onClick={() => setShowGroupNamePicker(false)}
                                    className="absolute -top-3 -right-3 bg-white text-gray-500 hover:text-red-500 rounded-full p-2 shadow-md border border-gray-100 transition-colors"
                                  >
                                    <RxCross2 size={20} />
                                  </button>
                                </div>
                              </div>,
                              document.body
                            )}
                          </div>
                          <button onClick={handleUpdateGroupName} className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600"><FiCheck size={16} /></button>
                          <button onClick={() => { setIsEditingName(false); setShowGroupNamePicker(false); }} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"><FiX size={16} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mb-1 group/name pointer-events-auto">
                          <h2 className="text-3xl font-bold text-white drop-shadow-md truncate">{selectedUser?.name}</h2>
                          {amIAdmin && (
                            <button
                              onClick={() => { setEditedGroupName(selectedUser?.name); setIsEditingName(true); }}
                              className="text-white/70 hover:text-white p-1 opacity-0 group-hover/name:opacity-100 transition-opacity"
                            >
                              <FiEdit2 size={18} />
                            </button>
                          )}
                        </div>
                      )}

                      <span className="text-white/90 text-sm font-medium drop-shadow-md block">
                        {isGroupChat ? `Group • ${groupMembers.length} participants` : (selectedUser?.lastSeen ? formatDistanceToNow(new Date(selectedUser.lastSeen), { addSuffix: true }) : "")}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-0 overflow-y-auto custom-scrollbar bg-gray-50/50 flex-1 rounded-b-2xl">
                  {/* ADD MEMBERS VIEW */}
                  {isAddMemberView && isGroupChat ? (
                    <div className="p-4 bg-white h-full flex flex-col">
                      <div className="flex items-center gap-3 mb-4">
                        <IoIosArrowBack size={24} className="cursor-pointer" onClick={() => setIsAddMemberView(false)} />
                        <h3 className="font-bold text-lg">Add Participants</h3>
                      </div>

                      <div className="relative mb-4">
                        <IoMdSearch className="absolute left-3 top-3 text-gray-400" />
                        <input
                          className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg outline-none"
                          placeholder="Search users..."
                          value={addMemberSearch}
                          onChange={(e) => setAddMemberSearch(e.target.value)}
                          autoFocus
                        />
                      </div>

                      <div className="flex-1 overflow-y-auto">
                        {otherUsers?.filter(u =>
                          !u.isGroup &&
                          !groupMembers.some(m => m._id === u._id) &&
                          u.name.toLowerCase().includes(addMemberSearch.toLowerCase())
                        ).map(user => (
                          <div key={user._id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <img src={user.image || dp} className="w-10 h-10 rounded-full object-cover" alt="" />
                              <span className="font-medium">{user.name}</span>
                            </div>
                            <button
                              onClick={() => handleGroupAction('add_member', { id: user._id })}
                              className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100"
                            >
                              <FiPlus />
                            </button>
                          </div>
                        ))}
                        {otherUsers?.filter(u => !u.isGroup && !groupMembers.some(m => m._id === u._id)).length === 0 && (
                          <p className="text-center text-gray-500 mt-5">No new users to add.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Group Members Section */}
                      {isGroupChat && (
                        <div className="mb-2 mt-4 px-4">
                          {/* Add Member Button (Admin Only) */}
                          {amIAdmin && (
                            <button
                              onClick={() => setIsAddMemberView(true)}
                              className="w-full flex items-center gap-3 p-3 mb-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors font-medium border border-blue-100"
                            >
                              <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center"><FiUserPlus /></div>
                              Add Participants
                            </button>
                          )}

                          <h3 className="text-sm font-semibold text-gray-500 mb-2 px-2">
                            {groupMembers.length} Participants
                          </h3>
                          <div className="flex flex-col gap-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            {groupMembers.map((member) => {
                              const isMemberAdmin = checkIsAdmin(member._id);
                              const isMe = member._id === userData._id;

                              return (
                                <div key={member._id} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors border-b last:border-0 group">
                                  <div className="flex items-center gap-3">
                                    <img src={member.image || dp} className="w-10 h-10 rounded-full object-cover border border-gray-100" alt="" />
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">{isMe ? "You" : member.name}</span>
                                        {isMemberAdmin && (
                                          <span title="Group Admin" className="text-amber-500"><FaCrown size={14} /></span>
                                        )}
                                      </div>
                                      <span className="text-xs text-gray-500 line-clamp-1">{member.about || "Hey there! I am using Chit-Chat."}</span>
                                    </div>
                                  </div>

                                  {/* Admin Actions: Remove Member */}
                                  {amIAdmin && !isMe && (
                                    <button
                                      onClick={() => handleGroupAction('remove_member', { id: member._id, name: member.name })}
                                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                      title="Remove from group"
                                    >
                                      <FiTrash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Media Section */}
                      <div className="mb-4 mt-4 px-4">
                        <button
                          className="w-full flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
                          onClick={() => setMediaViewOpen((prev) => !prev)}
                        >
                          <span className="font-medium text-gray-700">Media, Links, and Docs</span>
                          <span className="text-gray-400 text-sm font-semibold">{allMedia.length} &gt;</span>
                        </button>
                        {mediaViewOpen && (
                          <div className="mt-2 w-full h-64 overflow-y-auto bg-white rounded-xl p-2 border border-gray-100 shadow-inner">
                            {allMedia.length > 0 ? (
                              <div className="grid grid-cols-3 gap-2">
                                {allMedia.map((msg, idx) => {
                                  const url = msg.image || msg.video;
                                  const isVideo = url && url.match(/\.(mp4|webm|ogg|mov)$/i);
                                  const isAudio = url && url.match(/\.(mp3|wav|m4a|aac)$/i);

                                  return (
                                    <div
                                      key={idx}
                                      className="relative cursor-pointer group rounded-lg overflow-hidden aspect-square bg-gray-100"
                                      onClick={() => openMedia(idx)}
                                    >
                                      {isAudio ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-purple-100 text-purple-600">
                                          <FaHeadphones size={24} />
                                          <span className="text-xs mt-1 font-medium">Audio</span>
                                        </div>
                                      ) : isVideo ? (
                                        <div className="relative w-full h-full">
                                          <video
                                            src={url}
                                            className="w-full h-full object-cover"
                                            muted
                                            preload="metadata"
                                          />
                                          <div className="absolute inset-0 flex items-center justify-center">
                                            <FaPlay className="text-white/80 text-2xl drop-shadow-lg" />
                                          </div>
                                        </div>
                                      ) : (
                                        <img
                                          src={url}
                                          alt="media"
                                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                                          loading="lazy"
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-500 text-sm mt-10 block text-center">
                                No media shared yet
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 px-4 pb-6">
                        {isGroupChat ? (
                          <button
                            className="flex items-center gap-3 p-4 text-red-600 bg-white hover:bg-red-50 rounded-xl w-full text-left shadow-sm border border-gray-100 transition-colors"
                            onClick={() => handleGroupAction('leave')}
                          >
                            <FiLogOut size={22} /> <span className="font-medium">Exit Group</span>
                          </button>
                        ) : (
                          <button
                            className="flex items-center gap-3 p-4 text-red-600 bg-white hover:bg-red-50 rounded-xl w-full text-left shadow-sm border border-gray-100 transition-colors"
                            onClick={() => performHeaderAction("Block")}
                          >
                            <MdBlock size={22} /> <span className="font-medium">Block User</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-4 py-6 space-y-6"
          >
            {/* ... Rest of message list ... */}
            {messages.map((mess, index) => {
              if (mess.deletedFor?.includes(userData._id)) return null;
              if (mess.isSystem) { return (<div key={mess._id || index} className="flex justify-center my-4"> <span className="bg-gray-100 text-gray-500 text-xs font-medium py-1.5 px-3 rounded-full shadow-sm"> {mess.message} </span> </div>); }
              const isSelected = selectedMessages.some(m => m._id === mess._id);
              const isSelectionMode = selectedMessages.length > 0;
              const isReactionMenuOpen = activeReactionId === mess._id;
              const replyMsg = mess.replyTo && typeof mess.replyTo === "object" ? { ...mess.replyTo, sender: mess.replyTo.sender || {}, text: mess.replyTo.message || "Media", } : mess.statusReplyToId && typeof mess.statusReplyToId === "object" ? { _id: mess.statusReplyToId._id || mess.statusReplyToId, message: mess.statusReplyToCaption || mess.statusReplyToId.caption || "", image: mess.statusReplyToMediaUrl || mess.statusReplyToId.mediaUrl || "", sender: mess.statusReplyToId.user || { name: mess.statusReplyToUserName || "", _id: mess.statusReplyToId.user?._id || null, image: mess.statusReplyToId.user?.image || "", }, isStatus: true, } : messages.find((m) => m._id === mess.replyTo);
              return (
                <React.Fragment key={mess._id || index}>
                  {renderDateDivider(mess, messages[index - 1])}
                  {(mess.sender?._id?.toString() || mess.sender?.toString()) === userData._id ? (
                    <SenderMessage
                      ref={(el) => (messageRefs.current[mess._id] = el)}
                      {...mess}
                      replyToMessage={replyMsg}
                      isLast={index === messages.length - 1}
                      time={mess.createdAt ? format(new Date(mess.createdAt), "hh:mm a") : ""}
                      onImageClick={() => !isSelectionMode ? openMedia(allMedia.findIndex((m) => m._id === mess._id)) : handleInteraction(mess, 'click')}
                      onReact={handleReaction}
                      onStatusClick={handleStatusClick}
                      isSelected={isSelected}
                      selectionMode={isSelectionMode}
                      isReactionMenuOpen={isReactionMenuOpen}
                      onInteraction={(id, type) => handleInteraction(mess, type)}
                      onCancelUpload={handleCancelUpload}
                      highlightKeyword={isSearchOpen ? searchText : ""}
                      isGroup={isGroupChat}
                      onSelectForActions={(payload) => { if (payload?.deleteForMe) { handleDelete(mess._id, false); return; } if (payload?.deleteForEveryone) { handleDelete(mess._id, true); return; } if (payload?.openForward) { openForwardModal(mess._id); return; } if (payload?.reply) { setReplyingTo({ _id: mess._id, message: mess.message, image: mess.image }); return; } if (payload?.details) { setShowDetailsModal(true); setSelectedMessages([mess]); return; } setSelectedActionMessage({ _id: mess._id, message: mess.message, image: mess.image, sender: mess.sender }); }}
                      mediaType={mess.mediaType}
                      expiresAt={mess.expiresAt}
                    />
                  ) : (
                    <ReceiverMessage
                      {...mess}
                      replyToMessage={replyMsg}
                      isLast={index === messages.length - 1}
                      time={mess.createdAt ? format(new Date(mess.createdAt), "hh:mm a") : ""}
                      onImageClick={() => !isSelectionMode ? openMedia(allMedia.findIndex((m) => m._id === mess._id)) : handleInteraction(mess, 'click')}
                      onReact={handleReaction}
                      onStatusClick={handleStatusClick}
                      isSelected={isSelected}
                      selectionMode={isSelectionMode}
                      isReactionMenuOpen={isReactionMenuOpen}
                      onInteraction={(id, type) => handleInteraction(mess, type)}
                      isGroup={selectedUser?.isGroup}
                      senderName={mess.sender?.name || "User"}
                      senderImage={mess.sender?.image}
                      highlightKeyword={isSearchOpen ? searchText : ""}
                      mediaType={mess.mediaType}
                      onSelectForActions={(payload) => { if (payload?.deleteForMe) { handleDelete(mess._id, false); return; } if (payload?.openForward) { openForwardModal(mess._id); return; } if (payload?.reply) { setReplyingTo({ _id: mess._id, message: mess.message, image: mess.image }); return; } setSelectedActionMessage({ _id: mess._id, message: mess.message, image: mess.image, sender: mess.sender }); }}
                      expiresAt={mess.expiresAt}
                    />
                  )}
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to Bottom Button */}
          {showScrollBottom && (
            <div className="absolute bottom-24 right-6 z-50 animate-scale-in">
              <button
                onClick={scrollToBottom}
                className="bg-white text-gray-600 p-2.5 rounded-full shadow-lg hover:shadow-xl border border-gray-100 transition-all active:scale-95 flex items-center justify-center relative"
              >
                <FaChevronDown size={18} />
                {newMsgCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-bounce">
                    {newMsgCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* ✅ MENTION POPUP */}
          {showMentionPopup && (
            <div className="absolute bottom-20 left-2 bg-white rounded-xl shadow-2xl border border-gray-100 w-64 max-h-48 overflow-y-auto z-50 animate-fade-in-up">
              <div className="bg-gray-50 px-3 py-1 text-xs text-gray-400 font-semibold border-b">Members</div>
              {filteredMembersForMention.length > 0 ? (
                filteredMembersForMention.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center gap-3 p-3 hover:bg-blue-50 cursor-pointer transition"
                    onClick={() => handleSelectMention(member.name || member.userName)}
                  >
                    <img src={member.image || dp} className="w-8 h-8 rounded-full object-cover" alt="" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-800">{member.name || member.userName}</span>
                      <span className="text-xs text-gray-500">@{member.userName || "user"}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-400 text-sm">No members found</div>
              )}
            </div>
          )}

          {/* ... [Image preview, input form, etc. unchanged] ... */}
          {frontendImage && (
            <div className="relative w-full flex justify-start px-4 mb-2">
              <div className={`flex items-center bg-white rounded-2xl shadow-md relative p-2 pb-16 ${isMobile ? 'w-full max-w-[95%]' : 'max-w-[60%]'}`}>
                {fileType === "image" && (<img src={frontendImage} alt="preview" className="max-w-full max-h-64 rounded-2xl object-cover mb-4" />)}
                {fileType === "video" && (<video src={frontendImage} className="w-full h-64 bg-black rounded-2xl mb-6 object-contain border border-gray-100" controls />)}
                {fileType === "audio" && (<div className="flex items-center gap-3 px-2 py-2 w-64 bg-gray-100 rounded-xl mb-6"> <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center"> <FaHeadphones className="text-white" /> </div> <audio src={frontendImage} controls className="w-full h-8" /> </div>)}
                {fileType === "file" && (<div className="flex items-center gap-4 px-4 py-4 w-64 bg-gray-100 rounded-xl mb-6"> <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center"> <FaFileLines size={24} /> </div> <div className="flex flex-col overflow-hidden"> <span className="font-medium text-gray-700 truncate w-full">{frontendImage || "Document"}</span> <span className="text-xs text-gray-500">Document</span> </div> </div>)}
                <input type="text" placeholder={fileType === "audio" ? "Add a note..." : "Add a caption..."} value={imageCaption} onChange={(e) => setImageCaption(e.target.value)} className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-50 text-white px-2 py-2 rounded-lg z-10" />
                {fileType !== "audio" && fileType !== "file" && (<button type="button" onClick={() => setViewOnce((prev) => !prev)} className="absolute top-2 right-2 bg-black bg-opacity-50 p-1 rounded text-white z-10" title="View Once" > {viewOnce ? <FiEyeOff /> : <FiEye />} </button>)}
                {fileType === "image" && (<button type="button" onClick={handleEditClick} className="absolute top-2 right-[72px] bg-black bg-opacity-50 p-1 rounded text-white z-10" title="Edit Image" > <FiCrop /> </button>)}
                <button type="button" onClick={() => { setFrontendImage(null); setBackendImage(null); setFileType(null); setImageCaption(""); setViewOnce(false); }} className="absolute top-1 right-10 w-6 h-6 flex items-center justify-center text-white bg-black bg-opacity-50 rounded-full hover:bg-opacity-80 transition z-10" > ✕ </button>
              </div>
            </div>
          )}

          <div className="p-4">
            {disappearingMode && (
              <div className="flex justify-center mb-2 animate-fade-in-up">
                <div className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full flex items-center gap-1 shadow-sm border border-blue-200">
                  <MdTimer size={12} />
                  Messages expire in 24 hours
                </div>
              </div>
            )}

            {replyingTo && (<div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 mb-2 shadow"> <div className="flex-1 text-sm text-gray-700 italic truncate"> Replying to: {replyingTo.message || "Media"} </div> <button className="text-gray-500 font-bold" onClick={() => setReplyingTo(null)} > ✕ </button> </div>)}
            <form className="w-full bg-[#1797c2] rounded-full h-[60px] shadow-md flex items-center gap-3 px-3 relative" onSubmit={handleSendMessage}>
              <div className="relative flex items-center justify-center" ref={attachMenuRef}> <FaPlus className={`w-[25px] h-[25px] cursor-pointer transition-transform duration-200 ${showAttachMenu ? 'rotate-45 text-gray-200' : 'text-white'}`} onClick={() => setShowAttachMenu(prev => !prev)} /> {showAttachMenu && (<div className="absolute bottom-16 left-0 bg-white p-3 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.1)] z-50 border border-gray-100 w-44 animate-scale-in origin-bottom-left"> <div className="flex flex-col gap-2"> <div className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition" onClick={() => { documentRef.current.click(); setShowAttachMenu(false); }}> <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md"><FaFileLines size={18} /></div> <span className="text-gray-700 font-medium text-sm">Document</span> </div> <div className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition" onClick={() => { audioRef.current.click(); setShowAttachMenu(false); }}> <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-md"><FaHeadphones size={18} /></div> <span className="text-gray-700 font-medium text-sm">Audio</span> </div> <div className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition" onClick={() => { videoRef.current.click(); setShowAttachMenu(false); }}> <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md"><FaVideo size={18} /></div> <span className="text-gray-700 font-medium text-sm">Video</span> </div> <div className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition" onClick={() => { imageRef.current.click(); setShowAttachMenu(false); }}> <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md"><FaImages size={18} /></div> <span className="text-gray-700 font-medium text-sm">Photos</span> </div> </div> </div>)} </div>
              <div className="flex-1 flex items-center bg-white/20 rounded-full px-3 py-2 gap-2 h-10 border border-white/30"> <div className="relative flex items-center justify-center" ref={pickerRef}> <RiEmojiStickerLine className="w-[22px] h-[22px] text-white/80 hover:text-white cursor-pointer" onClick={(e) => { e.stopPropagation(); setShowPicker((prev) => !prev); }} /> {showPicker && (<div className="absolute bottom-10 left-0 z-50"> <EmojiPicker width={280} height={350} onEmojiClick={onEmojiClick} previewConfig={{ showPreview: false }} /> </div>)} </div>

                {isRecording ? (<div className="flex-1 text-white font-medium animate-pulse flex items-center gap-2"> <div className="w-3 h-3 bg-red-500 rounded-full animate-bounce" /> Recording {formatTime(recordingDuration)}... </div>) : (<input ref={inputRef} type="text" className="flex-1 bg-transparent text-white text-[16px] outline-none placeholder-white/70" placeholder="Type a message" value={input} onChange={handleTyping} />)} </div>
              <input type="file" accept="image/*" ref={imageRef} hidden onChange={handleFile} /> <input type="file" accept="video/*" ref={videoRef} hidden onChange={handleFile} /> <input type="file" accept="audio/*" ref={audioRef} hidden onChange={handleFile} />
              <input type="file" accept=".txt,.docx,.pdf,.rtf,.xlsx,.csv,.xls,.pptx,.ppt,.odp,.html,.htm,.doc,.odt,.zip,.rar,.7z" ref={documentRef} hidden onChange={handleFile} />
              {(input.trim() || backendImage) ? (<button type="submit" className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition"> <RiSendPlane2Fill className="w-[20px] h-[20px] text-white" /> </button>) : (<button type="button" onClick={isRecording ? stopRecording : startRecording} className={`flex items-center justify-center w-10 h-10 rounded-full transition ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30'}`} > {isRecording ? <FaStop className="text-white" /> : <FaMicrophone className="text-white" />} </button>)}
            </form>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col justify-center items-center"> <h1 className="text-gray-700 font-bold text-[50px]"> Welcome to Chit-Chat </h1> <span className="text-gray-700 font-semibold text-[35px]"> Chat Friendly </span> </div>
      )}

      {/* ... [Deleted Modal, Theme Modal, Bg Editor Modals preserved] ... */}
      {showDeleteModal && (<div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex justify-center items-center"> <div className="bg-white p-6 rounded-lg shadow-lg w-72 flex flex-col gap-3"> {selectedMessages.some(m => (m.sender?._id || m.sender) !== userData._id) ? (<> <h3 className="font-semibold text-lg mb-2">Delete message from {selectedUser?.name}?</h3> <div className="flex justify-end gap-3 mt-2"> <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded" onClick={() => setShowDeleteModal(false)} > Cancel </button> <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600" onClick={() => handleBulkDelete(false)} > Delete </button> </div> </>) : (<> <h3 className="font-semibold text-lg mb-2">Delete Message?</h3> <button className="w-full text-left p-2 hover:bg-gray-100 text-red-600" onClick={() => handleBulkDelete(true)}>Delete for Everyone</button> <button className="w-full text-left p-2 hover:bg-gray-100 text-red-600" onClick={() => handleBulkDelete(false)}>Delete for Me</button> <button className="w-full text-left p-2 hover:bg-gray-100" onClick={() => setShowDeleteModal(false)}>Cancel</button> </>)} </div> </div>)}

      {showThemeModal && (<div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4" onClick={() => setShowThemeModal(false)} > <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh] animate-scale-in" onClick={e => e.stopPropagation()} > <div className="flex justify-between items-center p-5 border-b shrink-0"> <h2 className="text-xl font-bold">Choose a Theme</h2> <button onClick={() => setShowThemeModal(false)} className="text-gray-500 hover:text-black"> <RxCross2 size={24} /> </button> </div> <div className="overflow-y-auto p-5 custom-scrollbar">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Custom</h3>
          <div
            className="w-full h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all group"
            onClick={() => bgInputRef.current?.click()}
          >
            <RiImageAddLine size={28} className="text-gray-400 group-hover:text-blue-500 mb-1" />
            <span className="text-xs text-gray-500 group-hover:text-blue-600 font-medium">Upload Background</span>
            <input type="file" ref={bgInputRef} hidden accept="image/*" onChange={handleBgFileSelect} />
          </div>
        </div>

        <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Presets</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4"> {themes.map((theme) => (<button key={theme.name} className={`aspect-square rounded-lg shadow-sm border border-gray-200 hover:scale-105 transition-transform ${theme.class} ${chatTheme === theme.class && !customBg ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`} onClick={() => handleThemeSelection(theme.class)} title={theme.name} > </button>))} </div> </div> <div className="p-5 border-t shrink-0"> <button className="w-full py-2.5 bg-[#1a7fa0] text-white font-medium rounded-lg hover:bg-[#156b87] transition-colors" onClick={() => setShowThemeModal(false)} > Done </button> </div> </div> </div>)}

      {showBgEditor && (
        <div className="fixed inset-0 bg-black/90 z-[10000] flex flex-col items-center justify-center p-4 text-white">
          <div className="w-full max-w-lg flex flex-col gap-4 animate-scale-in">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-bold flex items-center gap-2"><FiSliders /> Adjust Background</h3>
              <button onClick={() => { setShowBgEditor(false); setPendingBgImg(null) }} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><RxCross2 /></button>
            </div>
            <div className="relative w-full aspect-[4/5] sm:aspect-video bg-gray-900 rounded-xl overflow-hidden border border-white/20 shadow-2xl">
              <div
                className="w-full h-full bg-cover bg-center transition-all duration-200"
                style={{
                  backgroundImage: `url(${pendingBgImg})`,
                  filter: `blur(${bgSettings.blur}px) opacity(${bgSettings.opacity}%) brightness(${bgSettings.brightness}%) contrast(${bgSettings.contrast}%)`,
                  transform: `scale(${bgSettings.zoom})`
                }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
                <div className="bg-white p-3 rounded-lg shadow-md max-w-[80%] opacity-90">
                  <p className="text-black text-sm">This is how your chat will look.</p>
                  <span className="text-xs text-gray-500 block text-right mt-1">10:00 AM</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 p-6 rounded-xl flex flex-col gap-5 overflow-y-auto max-h-[40vh] custom-scrollbar">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm font-medium text-gray-300">
                  <span className="flex items-center gap-2"><FiCrop /> Zoom (Crop)</span>
                  <span>{Math.round(bgSettings.zoom * 100)}%</span>
                </div>
                <input type="range" min="1" max="2.5" step="0.1" value={bgSettings.zoom} onChange={(e) => setBgSettings({ ...bgSettings, zoom: parseFloat(e.target.value) })} className="w-full accent-blue-500 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm font-medium text-gray-300">
                  <span className="flex items-center gap-2"><FiActivity /> Blur</span>
                  <span>{bgSettings.blur}px</span>
                </div>
                <input type="range" min="0" max="15" step="0.5" value={bgSettings.blur} onChange={(e) => setBgSettings({ ...bgSettings, blur: parseFloat(e.target.value) })} className="w-full accent-blue-500 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm font-medium text-gray-300">
                  <span className="flex items-center gap-2"><FiEye /> Opacity</span>
                  <span>{bgSettings.opacity}%</span>
                </div>
                <input type="range" min="20" max="100" step="5" value={bgSettings.opacity} onChange={(e) => setBgSettings({ ...bgSettings, opacity: parseInt(e.target.value) })} className="w-full accent-blue-500 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm font-medium text-gray-300">
                  <span className="flex items-center gap-2"><FiSun /> Brightness</span>
                  <span>{bgSettings.brightness}%</span>
                </div>
                <input type="range" min="50" max="150" step="5" value={bgSettings.brightness} onChange={(e) => setBgSettings({ ...bgSettings, brightness: parseInt(e.target.value) })} className="w-full accent-blue-500 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm font-medium text-gray-300">
                  <span className="flex items-center gap-2"><MdColorLens /> Contrast</span>
                  <span>{bgSettings.contrast}%</span>
                </div>
                <input type="range" min="50" max="150" step="5" value={bgSettings.contrast} onChange={(e) => setBgSettings({ ...bgSettings, contrast: parseInt(e.target.value) })} className="w-full accent-blue-500 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" />
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => bgInputRef.current?.click()} className="flex-1 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition"> Change Image </button>
                <button onClick={handleSaveCustomBg} className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-lg"> Apply Background </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && selectedMessages.length === 1 && (<div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex justify-center items-center"> <div className="bg-white p-6 rounded-2xl shadow-xl w-[90%] max-w-[380px] animate-scale-in max-h-[80vh] overflow-y-auto"> <div className="flex justify-between items-center mb-6 border-b pb-2"> <h3 className="font-bold text-xl text-gray-800">Message Info</h3> <button onClick={() => { setShowDetailsModal(false); setSelectedMessages([]) }} className="text-gray-500 hover:text-gray-800"> <RxCross2 size={24} /> </button> </div> <div className="mb-4 bg-gray-50 p-3 rounded-lg border"> <p className="text-gray-800 text-sm">{selectedMessages[0].message || "Media"}</p> <p className="text-xs text-right text-gray-500 mt-1">{format(new Date(selectedMessages[0].createdAt), "hh:mm a")}</p> </div> {isGroupChat ? (<div className="flex flex-col gap-6"> <div> <div className="flex items-center gap-2 mb-2 text-blue-500"> <BsCheck2All size={18} /> <span className="font-bold text-sm uppercase">Read by</span> </div> {selectedMessages[0].seenBy && selectedMessages[0].seenBy.length > 0 ? (selectedMessages[0].seenBy.map((seenUser, idx) => (<div key={idx} className="flex items-center gap-3 py-2"> <img src={seenUser.user?.image || dp} className="w-8 h-8 rounded-full" alt="" /> <div className="flex flex-col"> <span className="text-sm font-medium">{seenUser.user?.name || "User"}</span> <span className="text-xs text-gray-500">{seenUser.at ? format(new Date(seenUser.at), "p") : ""}</span> </div> </div>))) : (<p className="text-sm text-gray-400 italic pl-6">No one yet</p>)} </div> <div> <div className="flex items-center gap-2 mb-2 text-gray-500"> <BsCheck2All size={18} /> <span className="font-bold text-sm uppercase">Delivered to</span> </div> {selectedMessages[0].deliveredTo && selectedMessages[0].deliveredTo.length > 0 ? (selectedMessages[0].deliveredTo.map((delUser, idx) => (<div key={idx} className="flex items-center gap-3 py-2"> <img src={delUser.user?.image || dp} className="w-8 h-8 rounded-full" alt="" /> <div className="flex flex-col"> <span className="text-sm font-medium">{delUser.user?.name || "User"}</span> <span className="text-xs text-gray-500">{delUser.at ? format(new Date(delUser.at), "p") : ""}</span> </div> </div>))) : (<p className="text-sm text-gray-400 italic pl-6">—</p>)} </div> </div>) : (<div className="flex flex-col gap-6 relative"> <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-gray-200 z-0"></div> <div className="flex items-start gap-4 relative z-10"> <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-sm ${selectedMessages[0].status === 'seen' ? 'bg-blue-50 border-blue-500 text-blue-500' : 'bg-gray-50 border-gray-300 text-gray-300'}`}> <BsCheck2All size={20} /> </div> <div className="flex flex-col"> <span className="font-semibold text-gray-800">Read</span> <span className="text-sm text-gray-500"> {selectedMessages[0].status === 'seen' ? (selectedMessages[0].details?.seenAt ? format(new Date(selectedMessages[0].details.seenAt), "PP 'at' p") : "—") : "—"} </span> </div> </div> <div className="flex items-start gap-4 relative z-10"> <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-sm ${(selectedMessages[0].status === 'delivered' || selectedMessages[0].status === 'seen') ? 'bg-gray-50 border-gray-600 text-gray-600' : 'bg-gray-50 border-gray-300 text-gray-300'}`}> <BsCheck2All size={20} /> </div> <div className="flex flex-col"> <span className="font-semibold text-gray-800">Delivered</span> <span className="text-sm text-gray-500"> {(selectedMessages[0].status === 'delivered' || selectedMessages[0].status === 'seen') ? (selectedMessages[0].details?.deliveredAt ? format(new Date(selectedMessages[0].details.deliveredAt), "PP 'at' p") : "—") : "—"} </span> </div> </div> <div className="flex items-start gap-4 relative z-10"> <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-gray-600 bg-gray-50 text-gray-600 shadow-sm"> <BsCheck2 size={20} /> </div> <div className="flex flex-col"> <span className="font-semibold text-gray-800">Sent</span> <span className="text-sm text-gray-500"> {selectedMessages[0].details?.sentAt ? format(new Date(selectedMessages[0].details.sentAt), "PP 'at' p") : format(new Date(selectedMessages[0].createdAt), "PP 'at' p")} </span> </div> </div> </div>)} </div> </div>)}

      {/* 🟢 NEW WHATSAPP-LIKE MEDIA VIEWER OVERLAY */}
      {fullMediaView && (
        <div className="fixed inset-0 bg-black z-[1000] flex flex-col animate-scale-in">
          {/* Header Bar */}
          <div className="h-16 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between px-4 absolute top-0 w-full z-20">
            <div className="flex items-center gap-3">
              <img
                src={getCurrentMediaDetails()?.senderImage || dp}
                alt="sender"
                className="w-10 h-10 rounded-full object-cover border border-white/20"
              />
              <div className="flex flex-col">
                <span className="text-white font-semibold text-sm drop-shadow-md">
                  {getCurrentMediaDetails()?.senderName}
                </span>
                <span className="text-white/70 text-xs drop-shadow-md">
                  {getCurrentMediaDetails()?.time}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {fullMediaView.type === "image" && (
                <>
                  <button onClick={() => setMediaZoom(prev => Math.min(prev + 0.5, 3))} className="text-white hover:text-gray-300 transition" title="Zoom In"><FiZoomIn size={24} /></button>
                  <button onClick={() => setMediaZoom(prev => Math.max(prev - 0.5, 1))} className="text-white hover:text-gray-300 transition" title="Zoom Out"><FiZoomOut size={24} /></button>
                </>
              )}
              <button onClick={() => handleDownload(fullMediaView.url)} className="text-white hover:text-gray-300 transition" title="Download"><FiDownload size={24} /></button>
              <button onClick={() => { setFullMediaView(null); setMediaZoom(1); }} className="text-white hover:text-gray-300 transition"><RxCross2 size={28} /></button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-black">
            {/* Previous Button */}
            {!fullMediaView.isProfile && (
              <button
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                className="absolute left-2 z-30 p-3 text-white/50 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all"
              >
                <IoIosArrowBack size={32} />
              </button>
            )}

            {/* Media Content */}
            <div className="w-full h-full flex items-center justify-center overflow-auto">
              {fullMediaView.type === "image" ? (
                <img
                  src={fullMediaView.url || ""}
                  alt="media"
                  className="max-w-full max-h-full object-contain transition-transform duration-200"
                  style={{ transform: `scale(${mediaZoom})`, cursor: mediaZoom > 1 ? "grab" : "default" }}
                />
              ) : fullMediaView.type === "audio" ? (
                <div className="bg-gray-900/80 p-10 rounded-3xl flex flex-col items-center gap-6 border border-white/10 backdrop-blur-md">
                  <div className="w-32 h-32 bg-purple-600/20 rounded-full flex items-center justify-center text-purple-400 animate-pulse">
                    <FaHeadphones size={60} />
                  </div>
                  <audio src={fullMediaView.url || ""} controls autoPlay className="w-full min-w-[300px] contrast-125" />
                </div>
              ) : (
                <video
                  src={fullMediaView.url || ""}
                  controls
                  autoPlay
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>

            {/* Next Button */}
            {!fullMediaView.isProfile && (
              <button
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="absolute right-2 z-30 p-3 text-white/50 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all"
              >
                <IoIosArrowForward size={32} />
              </button>
            )}
          </div>

          {/* Footer / Caption */}
          {getCurrentMediaDetails()?.caption && (
            <div className="bg-gradient-to-t from-black/80 to-transparent p-4 pb-8 absolute bottom-0 w-full z-20 text-center">
              <p className="text-white text-base font-medium drop-shadow-md">
                {getCurrentMediaDetails().caption}
              </p>
            </div>
          )}
        </div>
      )}

      {viewingStatus && (<StatusViewer statuses={viewingStatus} index={0} onClose={() => setViewingStatus(null)} onNext={() => setViewingStatus(null)} onPrev={() => setViewingStatus(null)} socket={socket} />)}
      <style>{`
          @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
          .animate-slide-down { animation: slideDown 0.3s ease-out forwards; }
          @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in-up { animation: fadeInUp 0.2s ease-out forwards; }
          @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          .animate-scale-in { animation: scaleIn 0.2s ease-out; }
          .highlighted-search .bg-white, .highlighted-search .bg-\\[\\#d9fdd3\\] { animation: searchPulse 1s ease-in-out infinite; }
          @keyframes searchPulse { 0% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(234, 179, 8, 0); } 100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0); } }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>
    </div>
  );
}

export default MessageArea;