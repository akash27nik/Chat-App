import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { serverUrl } from "../main.jsx";
import { useSelector } from "react-redux";
import { FiCopy, FiShare } from "react-icons/fi";
import { RxCrossCircled } from "react-icons/rx";
import { TbTrashX } from "react-icons/tb";
import { BiReply } from "react-icons/bi";
import EmojiPicker, { EmojiStyle } from "emoji-picker-react";
import ForwardModal from "./ForwardModal";
import { createPortal } from "react-dom";

function ReceiverMessage({
  _id,
  image,
  message,
  time,
  reactions = [],
  onReact,
  onImageClick,
  onSelectForActions,
  isDeleted,
  replyToMessage,
  socket,
}) {
  const scroll = useRef(null);
  const { userData } = useSelector((state) => state.user);
  const [hovered, setHovered] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const pickerRef = useRef(null);
  const contextRef = useRef(null);
  const bubbleRef = useRef(null);
  const pressTimer = useRef(null);
  const [menuDirection, setMenuDirection] = useState("down");

  const [openForward, setOpenForward] = useState(false);
  const [forwardMsgId, setForwardMsgId] = useState(null);

  // 🔹 Swipe state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(null);

  // track small screen
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    scroll.current?.scrollIntoView({ behavior: "smooth" });
  }, [message, image, isDeleted]);

  // Close context or emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
        setShowQuickReactions(false);
      }
      if (contextRef.current && !contextRef.current.contains(e.target)) {
        setShowContext(false);
      }
    };
    if (showEmojiPicker || showContext || showQuickReactions) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker, showContext, showQuickReactions]);

  // Menu direction based on viewport
  useEffect(() => {
    if (!bubbleRef.current) return;
    const rect = bubbleRef.current.getBoundingClientRect();
    const distanceFromBottom = window.innerHeight - rect.bottom;
    if (distanceFromBottom < 200) setMenuDirection("up");
    else setMenuDirection("down");
  }, [hovered, showContext]);

  const myReaction = reactions.find((r) => r.user === userData._id)?.emoji;

  const sendReaction = async (emoji) => {
    try {
      if (myReaction === emoji) {
        // Optimistic: remove reaction
        onReact(
          _id,
          reactions.filter((r) => r.user !== userData._id)
        );

        // API call
        await axios.put(
          `${serverUrl}/api/message/react/${_id}`,
          { emoji: "" },
          { withCredentials: true }
        );
      } else {
        // Optimistic: add/update my reaction
        onReact(
          _id,
          [
            ...reactions.filter((r) => r.user !== userData._id),
            { user: userData._id, emoji },
          ]
        );

        // API call
        await axios.put(
          `${serverUrl}/api/message/react/${_id}`,
          { emoji },
          { withCredentials: true }
        );
      }
    } catch (err) {
      console.error("Reaction error:", err);
    }
  };

  const handleTouchStart = () => {
    pressTimer.current = setTimeout(() => {
      if (isMobile) {
        setShowContext(true);
        setShowQuickReactions(true);
      } else {
        onSelectForActions?.({ _id, message, image });
      }
    }, 600);
  };
  const handleTouchEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const handleDoubleClick = () => {};
  const handleClick = () => {};

  const copy = () => {
    navigator.clipboard.writeText(message || "");
    setShowContext(false);
  };
  const forward = () => {
    setForwardMsgId(_id);
    setOpenForward(true);
    setShowContext(false);
  };
  const deleteForMe = () => {
    onSelectForActions?.({ _id, deleteForMe: true });
    setShowContext(false);
  };
  const replyMessage = () => {
    onSelectForActions?.({ _id, reply: true, message, image });
    setShowContext(false);
  };

  // 🔹 Scroll + highlight effect for original message
  const handleReplyClick = () => {
    if (!replyToMessage?._id) return;
    const target = document.getElementById(`message-${replyToMessage._id}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("highlighted-message");
      setTimeout(() => {
        target.classList.remove("highlighted-message");
      }, 2000);
    }
  };

  // 🔹 Swipe handlers for reply (receiver side)
  const handleTouchStartSwipe = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMoveSwipe = (e) => {
    if (touchStartX.current === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;
    if (diff > 0 && diff < 80) {
      setSwipeOffset(diff);
    }
  };

  const handleTouchEndSwipe = () => {
    if (swipeOffset > 60) {
      replyMessage();
    }
    setSwipeOffset(0);
    touchStartX.current = null;
  };

  return (
    <>
      {swipeOffset > 20 && (
        <div className="absolute -left-10 top-1/2 -translate-y-1/2 text-gray-500 text-xl">
          ↩️
        </div>
      )}
      <div
        id={`message-${_id}`}
        ref={scroll}
        className="w-fit max-w-[500px] mr-auto relative group transition-transform"
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={(e) => {
          handleTouchStart(e);
          handleTouchStartSwipe(e);
        }}
        onTouchMove={handleTouchMoveSwipe}
        onTouchEnd={(e) => {
          handleTouchEnd(e);
          handleTouchEndSwipe(e);
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onDoubleClick={handleDoubleClick}
        onClick={handleClick}
      >
        {/* Hover buttons for desktop */}
        {!isDeleted && !isMobile && (
          <div
            className={`absolute -right-14 bottom-8 flex gap-1 transition-opacity duration-200 ${
              hovered ? "opacity-100" : "opacity-0"
            }`}
          >
            <button
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow hover:bg-gray-100"
            >
              🙂
            </button>
            <button
              onClick={() => setShowContext((prev) => !prev)}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow hover:bg-gray-100"
            >
              ⬇️
            </button>
          </div>
        )}

        {/* Message bubble */}
        <div
          ref={bubbleRef}
          className="relative px-[20px] py-[10px] bg-white text-black text-[19px] rounded-tl-none rounded-2xl shadow-md flex flex-col gap-[6px]"
        >
          {/* Replied message preview */}
          {replyToMessage && (
            <div
              className="bg-gray-100 border-l-4 border-green-500 p-2 rounded mb-1 text-sm text-gray-700 cursor-pointer hover:bg-gray-200"
              onClick={handleReplyClick}
            >
              <span className="block font-medium text-gray-600">
                {replyToMessage.sender?._id === userData._id ||
                replyToMessage.sender === userData._id
                  ? "You"
                  : replyToMessage.sender?.name || ""}
              </span>

              <span className="line-clamp-1">
                {replyToMessage.message || "📷 Media"}
              </span>
            </div>
          )}

          {isDeleted ? (
            <span className="text-gray-500 italic flex items-center gap-2">
              <RxCrossCircled className="text-lg text-gray-400" />
              This message was deleted
            </span>
          ) : (
            <>
              {image && (
                <img
                  src={image}
                  alt="message"
                  onClick={() => onImageClick(image)}
                  className="w-auto h-auto rounded-xl object-cover cursor-pointer max-w-[80vw] max-h-[60vh] sm:max-w-[50vw] sm:max-h-[50vh]"
                />
              )}
              {message && <span>{message}</span>}
            </>
          )}

          {time && (
            <span className="text-[12px] text-gray-500 mt-1 flex justify-end">
              {time}
            </span>
          )}

          {/* ✅ Emoji picker via Portal */}
          {showEmojiPicker &&
            createPortal(
              <div
                className="fixed inset-0 flex items-center justify-center bg-black/20 z-[99999]"
                onClick={() => setShowEmojiPicker(false)}
              >
                <div
                  className="bg-white rounded-2xl shadow-xl p-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <EmojiPicker
                    onEmojiClick={(emojiObj) => {
                      sendReaction(emojiObj.emoji); 
                      setShowEmojiPicker(false);
                      setShowQuickReactions(false);
                      setHovered(false);
                    }}
                    theme="light"
                    height={350}
                    emojiStyle={EmojiStyle.NATIVE}
                    searchDisabled={false}
                    skinTonesDisabled
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              </div>,
              document.body
            )}

          {/* ✅ Quick reactions (mobile only, centered) */}
          {isMobile && showQuickReactions && (
            <div
              ref={pickerRef}
              className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-lg px-2 py-1 flex gap-3 items-center z-[9999]"
            >
              {["👍", "❤️", "😂", "😮", "😢"].map((emo) => (
                <button
                  key={emo}
                  onClick={() => {
                    sendReaction(emo);
                    setShowQuickReactions(false);
                    setShowEmojiPicker(false);
                  }}
                  className="text-2xl hover:scale-110 transition-transform"
                >
                  {emo}
                </button>
              ))}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEmojiPicker((prev) => !prev);
                }}
                className="text-2xl"
              >
                ➕
              </button>
            </div>
          )}

          {/* Context menu */}
          {!isMobile && showContext && (
            <div
              ref={contextRef}
              className={`absolute ${
                menuDirection === "up" ? "bottom-full mb-2" : "top-full mt-2"
              } left-0 bg-white rounded-xl shadow-lg flex flex-col z-50 w-48 border border-gray-200`}
            >
              <button
                onClick={copy}
                className="px-4 py-2 text-left hover:bg-gray-100"
              >
                Copy
              </button>
              <button
                onClick={replyMessage}
                className="px-4 py-2 text-left hover:bg-gray-100"
              >
                Reply
              </button>
              <button
                onClick={forward}
                className="px-4 py-2 text-left hover:bg-gray-100"
              >
                Forward
              </button>
              <button
                onClick={deleteForMe}
                className="px-4 py-2 text-left text-red-600 hover:bg-gray-100"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className="absolute -bottom-5 left-2 bg-white text-black text-sm rounded-full px-2 py-0.5 flex gap-1 shadow">
            {reactions.map((r, idx) => (
              <span key={idx}>{r.emoji}</span>
            ))}
          </div>
        )}
      </div>

      {/* Context menu header for mobile */}
      {isMobile && showContext && (
        <div
          ref={contextRef}
          className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 flex justify-around py-2 shadow-md"
        >
          <button onClick={copy} className="text-xl">
            <FiCopy />
          </button>
          <button onClick={replyMessage} className="text-xl">
            <BiReply />
          </button>
          <button onClick={forward} className="text-xl">
            <FiShare />
          </button>
          <button onClick={deleteForMe} className="text-xl text-red-600">
            <TbTrashX />
          </button>
        </div>
      )}

      {/* Forward modal */}
      <ForwardModal
        open={openForward}
        onClose={() => setOpenForward(false)}
        messageId={forwardMsgId}
        socket={socket}
      />

      {/* Highlight CSS */}
      <style>
        {`
          .highlighted-message {
            animation: highlightFlash 2s ease-in-out;
          }
          @keyframes highlightFlash {
            0% { background-color: #fff3cd; }
            50% { background-color: #ffeeba; }
            100% { background-color: transparent; }
          }
        `}
      </style>
    </>
  );
}

export default ReceiverMessage;
