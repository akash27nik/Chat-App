import React, { useEffect, useRef, useState } from "react";
import { IoIosArrowRoundBack } from "react-icons/io";
import { RxCross2 } from "react-icons/rx";
import dp from "../assets/dp.webp";
import notificationSound from "/notification.mp3";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedUser, setTyping } from "../redux/userSlice";
import { RiEmojiStickerLine } from "react-icons/ri";
import { FaImages } from "react-icons/fa6";
import { RiSendPlane2Fill } from "react-icons/ri";
import { FiEye, FiEyeOff } from "react-icons/fi";
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

function MessageArea({ activeTab }) {
  const dispatch = useDispatch();
  const { selectedUser, userData, socket, onlineUsers, typingUsers } =
    useSelector((state) => state.user);
  const { messages } = useSelector((state) => state.message);
  const { unreadMessages } = useSelector((state) => state.unread);

  const [showPicker, setShowPicker] = useState(false);
  const [input, setInput] = useState("");
  const [frontendImage, setFrontendImage] = useState(null);
  const [backendImage, setBackendImage] = useState(null);
  const [imageCaption, setImageCaption] = useState("");
  const [viewOnce, setViewOnce] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [mediaViewOpen, setMediaViewOpen] = useState(false);
  const [fullMediaView, setFullMediaView] = useState(null); // now holds {index, url, type}
  const [selectedActionMessage, setSelectedActionMessage] = useState(null);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(null);
  const [lastSentMessageId, setLastSentMessageId] = useState(null);


  const image = useRef();
  const messagesEndRef = useRef();
  const pickerRef = useRef();
  const typingTimeout = useRef(null);
  const audioRef = useRef(new Audio(notificationSound));
  const scrollContainerRef = useRef(null);
const [isAtBottom, setIsAtBottom] = useState(true);
const [newMsgCount, setNewMsgCount] = useState(0);
const [hasNewMessages, setHasNewMessages] = useState(false);




  const allMedia = messages?.filter((msg) => msg.image || msg.video) || [];
  const reactionEmojis = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

  // inside MessageArea component
const messageRefs = useRef({});

const handleJumpToMessage = (id) => {
  const element = messageRefs.current[id];
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });

    // highlight effect
    element.classList.add("bg-yellow-200");
    setTimeout(() => {
      element.classList.remove("bg-yellow-200");
    }, 1500);
  }
};

const handleScroll = () => {
  if (!scrollContainerRef.current) return;
  const { scrollTop, scrollHeight, clientHeight } =
    scrollContainerRef.current;

  const atBottom = scrollTop + clientHeight >= scrollHeight - 50; // small tolerance
  setIsAtBottom(atBottom);

  if (atBottom) {
    // Clear badge when user scrolls down manually
    setHasNewMessages(false);
    setNewMsgCount(0);
  }
};



  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBackendImage(file);
    setFrontendImage(URL.createObjectURL(file));
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() && !backendImage) return;

    try {
      const formData = new FormData();
      formData.append("message", input || imageCaption);
      if (backendImage) formData.append("image", backendImage);
      if (viewOnce) formData.append("viewOnce", viewOnce);
      if (replyingTo) formData.append("replyTo", replyingTo._id);

      const result = await axios.post(
        `${serverUrl}/api/message/send/${selectedUser._id}`,
        formData,
        { withCredentials: true }
      );

      dispatch(setMessages([...(messages || []), result.data]));
      setLastSentMessageId(result.data._id);

      setInput("");
      setFrontendImage(null);
      setBackendImage(null);
      setImageCaption("");
      setViewOnce(false);
      setReplyingTo(null);

      socket.emit("stopTyping", {
        senderId: userData._id,
        receiverId: selectedUser._id,
      });
    } catch (error) {
      console.error("Send message error:", error);
      if (error.response) {
        toast.error(
          `Message failed: ${error.response.data.message || "Server error"}`
        );
      } else if (error.request) {
        toast.error("No response from server. Try again.");
      } else {
        toast.error("Error sending message. Try again.");
      }
    }
  };

  const onEmojiClick = (emojiData) => {
    setInput((prev) => prev + emojiData.emoji);
  };

  const handleReaction = async (messageId, emoji) => {
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
  };

useEffect(() => {
  if (!messagesEndRef.current || !lastSentMessageId) return;

  const lastMsg = messages[messages.length - 1];

  // ✅ Only scroll if the last message is the one YOU sent
  if (lastMsg._id === lastSentMessageId) {
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    setLastSentMessageId(null); // reset after scrolling
  }
}, [messages, lastSentMessageId]);


  useEffect(() => {
  const container = scrollContainerRef.current;
  if (!container) return;

  container.addEventListener("scroll", handleScroll);
  return () => container.removeEventListener("scroll", handleScroll);
}, []);


  // --- media open helpers ---
  const openMedia = (index) => {
    const msg = allMedia[index];
    setCurrentMediaIndex(index);
    setFullMediaView({
      url: msg.image || msg.video,
      type: msg.image ? "image" : "video",
    });
  };

  const handleNext = () => {
    const nextIndex = (currentMediaIndex + 1) % allMedia.length;
    openMedia(nextIndex);
  };

  const handlePrev = () => {
    const prevIndex = (currentMediaIndex - 1 + allMedia.length) % allMedia.length;
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
      dispatch(setMessages([...(messages || []), formattedMessage]));

      if (formattedMessage.sender !== userData._id) {
        toast.info(
          `💬 ${formattedMessage.senderName || "Someone"}: ${
            formattedMessage.message || "📷 Image"
          }`
        );

        if (Notification.permission === "granted") {
          new Notification(formattedMessage.senderName || "New Message", {
            body: formattedMessage.message || "📷 Image",
            icon: formattedMessage.senderImage || dp,
          });
        }

        try {
          audioRef.current.currentTime = 0;
          audioRef.current.play();
        } catch (err) {
          console.error("Sound play blocked:", err);
        }

        if (!selectedUser || selectedUser._id !== formattedMessage.sender) {
          dispatch(
            setUnreadMessages({
              userId: formattedMessage.sender,
              count:
                (unreadMessages[formattedMessage.sender]?.count || 0) + 1,
              lastUpdated: Date.now(),
            })
          );
        }
      } else {
        toast.success(
          `📤 Message sent to ${formattedMessage.receiverName || "User"}`
        );
      }
    });

    socket.on("messagesSeen", ({ userId, messageIds }) => {
      dispatch(
        setMessages(
          messages.map((msg) =>
            messageIds?.includes(msg._id.toString())
              ? { ...msg, status: "seen" }
              : msg
          )
        )
      );
    });

    socket.on("messageDelivered", ({ messageId }) => {
      dispatch(
        setMessages(
          messages.map((msg) =>
            msg._id === messageId ? { ...msg, status: "delivered" } : msg
          )
        )
      );
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

    return () => {
      socket.off("newMessage");
      socket.off("messagesSeen");
      socket.off("messageDelivered");
      socket.off("typing");
      socket.off("stopTyping");
      socket.off("messageReacted");
      socket.off("messageDeleted");
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

    // ✅ tell backend to mark all as delivered
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
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleTyping = (e) => {
    setInput(e.target.value);

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
  };

  const getLastSeen = () => {
    if (!selectedUser?.lastSeen) return null;
    return `last seen ${formatDistanceToNow(new Date(selectedUser.lastSeen), {
      addSuffix: true,
    })}`;
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

  if (activeTab === "status" && window.innerWidth < 1024 && !selectedUser) {
    return null;
  }

  return (
    <div
      className={`relative lg:w-[70%] w-full h-full bg-slate-200 border-l-2 border-gray-300 ${
        selectedUser || activeTab === "status" ? "flex" : "hidden"
      } lg:flex`}
    >
      {selectedUser ? (
        <div className="flex flex-col w-full h-full">
          {/* Header */}
          <div className="h-[100px] bg-[#1a7fa0] rounded-b-[30px] shadow-md flex items-center gap-5 px-6 relative">
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
            <div className="flex flex-col">
              <h1 className="text-white font-semibold text-xl">
                {selectedUser?.name || "User"}
              </h1>
              <span className="text-white text-sm">
                {onlineUsers?.includes(selectedUser?._id)
                  ? typingUsers[selectedUser._id]
                    ? "typing..."
                    : "Online"
                  : getLastSeen() || ""}
              </span>
            </div>

            {selectedActionMessage && window.innerWidth < 1024 && (
              <div className="absolute bottom-2 left-4 right-4 bg-white rounded-xl shadow-md flex items-center justify-around px-3 py-2">
                <button
                  className="text-sm font-medium"
                  onClick={() => handleCopy(selectedActionMessage.message)}
                >
                  Copy
                </button>
                <button
                  className="text-sm font-medium"
                  onClick={() => openForwardModal(selectedActionMessage._id)}
                >
                  Forward
                </button>
                <button
                  className="text-sm text-red-600 font-medium"
                  onClick={() =>
                    handleDelete(selectedActionMessage._id, false)
                  }
                >
                  Delete (Me)
                </button>
                {selectedActionMessage?.sender === userData._id && (
                  <button
                    className="text-sm text-red-700 font-semibold"
                    onClick={() =>
                      handleDelete(selectedActionMessage._id, true)
                    }
                  >
                    Delete (All)
                  </button>
                )}
                <button
                  className="text-sm text-gray-500"
                  onClick={() => setSelectedActionMessage(null)}
                >
                  Close
                </button>
              </div>
            )}
          </div>

          {/* Profile Modal */}
          {profileModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-[400px] relative flex flex-col">
                <RxCross2
                  className="absolute top-4 right-4 text-gray-700 cursor-pointer"
                  onClick={() => setProfileModalOpen(false)}
                />
                <div className="flex flex-col items-center gap-4">
                  {/* Profile picture */}
                  <div
                    className="w-24 h-24 rounded-full overflow-hidden cursor-pointer relative group"
                    onClick={() => setFullMediaView({url:selectedUser.image,type:"image",  isProfile: true })}
                  >
                    <img
                      src={selectedUser?.image || dp}
                      alt="profile"
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span className="text-white text-sm">View</span>
                    </div>
                  </div>

                  {/* User name */}
                  <h2 className="text-xl font-semibold">{selectedUser?.name}</h2>

                  {/* Last seen */}
                  {selectedUser.lastSeen && (
                    <span className="text-gray-500 text-sm">
                      Last seen:{" "}
                      {formatDistanceToNow(new Date(selectedUser.lastSeen), {
                        addSuffix: true,
                      })}
                    </span>
                  )}

                  {/* Media toggle button */}
                  <button
                    className="bg-blue-500 text-white px-4 py-2 rounded-full mt-2"
                    onClick={() => setMediaViewOpen((prev) => !prev)}
                  >
                    Media
                  </button>

                  {/* Media Grid */}
                  {mediaViewOpen && (
                    <div className="mt-4 w-full h-80 overflow-y-auto">
                      {allMedia.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {allMedia.map((msg, idx) => (
                            <div
                              key={idx}
                              className="relative cursor-pointer group rounded"
                              onClick={() => openMedia(idx)}
                            >
                              <img
                                src={msg.image || msg.video}
                                alt="media"
                                className="w-full h-24 object-cover rounded transition-transform duration-200 group-hover:scale-105"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-20 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded transition-opacity duration-200">
                                <span className="text-white text-sm">View</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm mt-2">
                          No media shared yet
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            {messages.map((mess, index) => {
              if (mess.deletedFor?.includes(userData._id)) return null;
             const replyMsg =
  mess.replyTo && typeof mess.replyTo === "object"
    ? {
        ...mess.replyTo,
        sender: mess.replyTo.sender || {}, // ensure sender object exists
      }
    : messages.find((m) => m._id === mess.replyTo);


              return (
                <React.Fragment key={mess._id || index}>
                  {renderDateDivider(mess, messages[index - 1])}
                  {(mess.sender?._id?.toString() || mess.sender?.toString()) === userData._id ? (
                    <SenderMessage
                    ref={(el) => (messageRefs.current[mess._id] = el)}
                      {...mess}
                      replyToMessage={replyMsg}
                      isLast={index === messages.length - 1}
                      time={
                        mess.createdAt
                          ? format(new Date(mess.createdAt), "hh:mm a")
                          : ""
                      }
                      onImageClick={() => openMedia(allMedia.findIndex(m=>m._id===mess._id))}
                      onReact={handleReaction}
                      onSelectForActions={(payload) => {
                        if (payload?.deleteForMe) {
                          handleDelete(mess._id, false);
                          return;
                        }
                        if (payload?.deleteForEveryone) {
                          handleDelete(mess._id, true);
                          return;
                        }
                        if (payload?.openForward) {
                          openForwardModal(mess._id);
                          return;
                        }
                        if (payload?.reply) {
                          setReplyingTo({
                            _id: mess._id,
                            message: mess.message,
                            image: mess.image,
                          });
                          return;
                        }
                        setSelectedActionMessage({
                          _id: mess._id,
                          message: mess.message,
                          image: mess.image,
                          sender: mess.sender,
                        });
                      }}
                    />
                  ) : (
                    <ReceiverMessage
                      {...mess}
                      replyToMessage={replyMsg}
                      isLast={index === messages.length - 1}
                      time={
                        mess.createdAt
                          ? format(new Date(mess.createdAt), "hh:mm a")
                          : ""
                      }
                      onImageClick={() => openMedia(allMedia.findIndex(m=>m._id===mess._id))}
                      onReact={handleReaction}
                      onSelectForActions={(payload) => {
                        if (payload?.deleteForMe) {
                          handleDelete(mess._id, false);
                          return;
                        }
                        if (payload?.openForward) {
                          openForwardModal(mess._id);
                          return;
                        }
                        if (payload?.reply) {
                          setReplyingTo({
                            _id: mess._id,
                            message: mess.message,
                            image: mess.image,
                          });
                          return;
                        }
                        setSelectedActionMessage({
                          _id: mess._id,
                          message: mess.message,
                          image: mess.image,
                          sender: mess.sender,
                        });
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

{/* Floating new message button */}
{hasNewMessages && (
  <div className="absolute bottom-20 right-6">
    <button
      onClick={() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        setHasNewMessages(false);
        setNewMsgCount(0);
      }}
      className="bg-blue-500 text-white px-3 py-2 rounded-full shadow-lg text-sm hover:bg-blue-600 transition flex items-center gap-2"
    >
      {newMsgCount} New Message{newMsgCount > 1 ? "s" : ""} ↓
    </button>
  </div>
)}

          {/* Image Preview */}
          {frontendImage && (
            <div className="relative w-full flex justify-start px-4 mb-2">
              <div className="flex items-center bg-white rounded-2xl shadow-md max-w-[60%] relative">
                <img
                  src={frontendImage}
                  alt="preview"
                  className="max-w-full max-h-40 rounded-2xl object-cover"
                />
                <input
                  type="text"
                  placeholder="Add a caption..."
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded"
                />
                <button
                  type="button"
                  onClick={() => setViewOnce((prev) => !prev)}
                  className="absolute top-2 right-2 bg-black bg-opacity-50 p-1 rounded text-white"
                  title="View Once"
                >
                  {viewOnce ? <FiEyeOff /> : <FiEye />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFrontendImage(null);
                    setBackendImage(null);
                    setImageCaption("");
                    setViewOnce(false);
                  }}
                  className="absolute top-1 right-10 w-6 h-6 flex items-center justify-center text-white bg-black bg-opacity-50 rounded-full hover:bg-opacity-80 transition"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Input with Reply Preview */}
          <div className="p-4">
            {replyingTo && (
              <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 mb-2 shadow">
                <div className="flex-1 text-sm text-gray-700 italic truncate">
                  Replying to: {replyingTo.message || "Media"}
                </div>
                <button
                  className="text-gray-500 font-bold"
                  onClick={() => setReplyingTo(null)}
                >
                  ✕
                </button>
              </div>
            )}

            <form
              className="w-full bg-[#1797c2] rounded-full h-[60px] shadow-md flex items-center gap-4 px-4 relative"
              onSubmit={handleSendMessage}
            >
              <div className="relative" ref={pickerRef}>
                <RiEmojiStickerLine
                  className="w-[25px] h-[25px] text-white cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPicker((prev) => !prev);
                  }}
                />
                {showPicker && (
                  <div className="absolute bottom-full mb-2 left-0 z-50">
                    <EmojiPicker
                      width={250}
                      height={350}
                      onEmojiClick={onEmojiClick}
                    />
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                ref={image}
                hidden
                onChange={handleImage}
              />
              <input
                type="text"
                className="flex-1 bg-transparent text-white text-[18px] outline-none placeholder-white"
                placeholder="Type a message"
                value={input}
                onChange={handleTyping}
              />
              <FaImages
                className="w-[25px] h-[25px] text-white cursor-pointer"
                onClick={() => image.current.click()}
              />
              {(input.trim() || backendImage) && (
                <button type="submit">
                  <RiSendPlane2Fill className="w-[25px] h-[25px] text-white cursor-pointer" />
                </button>
              )}
            </form>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col justify-center items-center">
          <h1 className="text-gray-700 font-bold text-[50px]">Welcome to Chit-Chat</h1>
          <span className="text-gray-700 font-semibold text-[35px]">Chat Friendly</span>
        </div>
      )}

      <ForwardModal
        open={forwardOpen}
        onClose={() => setForwardOpen(false)}
        message={selectedActionMessage}
      />

      {/* ✅ Fullscreen media viewer */}
      {fullMediaView && (
  <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50">
    {/* Prev Button (only if not profile) */}
    {!fullMediaView.isProfile && (
      <button
        onClick={handlePrev}
        className="absolute left-4 text-white text-4xl p-2 bg-black/50 rounded-full"
      >
        ◀
      </button>
    )}

    {/* Media */}
    {fullMediaView.type === "image" ? (
      <img
        src={fullMediaView.url}
        alt="media"
        className="max-w-[90%] max-h-[90%] object-contain"
      />
    ) : (
      <video
        src={fullMediaView.url}
        controls
        autoPlay
        className="max-w-[90%] max-h-[90%] object-contain"
      />
    )}

    {/* Next Button (only if not profile) */}
    {!fullMediaView.isProfile && (
      <button
        onClick={handleNext}
        className="absolute right-4 text-white text-4xl p-2 bg-black/50 rounded-full"
      >
        ▶
      </button>
    )}

    {/* Close */}
    <RxCross2
      className="absolute top-4 right-4 text-white text-3xl cursor-pointer"
      onClick={() => setFullMediaView(null)}
    />
  </div>
)}

    </div>
  );
}

export default MessageArea;
