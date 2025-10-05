import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
} from "react";
import axios from "axios";
import { serverUrl } from "../main.jsx";
import { useSelector } from "react-redux";
import { BsCheck2, BsCheck2All } from "react-icons/bs";
import { MdContentCopy } from "react-icons/md";
import { FiShare2, FiChevronDown } from "react-icons/fi";
import { RiDeleteBin6Line } from "react-icons/ri";
import { TbTrashX } from "react-icons/tb";
import { RxCrossCircled } from "react-icons/rx";
import EmojiPicker, { EmojiStyle } from "emoji-picker-react";
import ForwardModal from "./ForwardModal";
import {
RiInformationLine,
RiReplyLine,
} from "react-icons/ri";
const SenderMessage = forwardRef(
  (
    {
      _id,
      image,
      message,
      time,
      reactions = [],
      status,
      onReact,
      onImageClick,
      onSelectForActions,
      isDeleted,
      replyToMessage, // ✅ reply message object
      socket,
      onReplyClick, // ✅ parent callback for jump
      highlightedMessageId, // ✅ for highlighting target
    },
    ref
  ) => {
    const { userData } = useSelector((state) => state.user);
    const [hovered, setHovered] = useState(false);
    const [showContext, setShowContext] = useState(false);
    const [mobileContext, setMobileContext] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const contextRef = useRef(null);
    const pickerRef = useRef(null);
    const pressTimer = useRef(null);
    const [menuDirection, setMenuDirection] = useState("down");
    const bubbleRef = useRef(null);
    // Swipe-to-reply
    const [swipeOffset, setSwipeOffset] = useState(0);
    const touchStartX = useRef(0);

    // ✅ Highlight + scroll when this message is being jumped to
    useEffect(() => {
      if (highlightedMessageId === _id && bubbleRef.current) {
        bubbleRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        bubbleRef.current.classList.add("highlighted");
        const timer = setTimeout(() => {
          bubbleRef.current?.classList.remove("highlighted");
        }, 2000);

        return () => clearTimeout(timer);
      }
    }, [highlightedMessageId, _id]);

    useEffect(() => {
      const handleClickOutside = (e) => {
        if (
          (pickerRef.current && !pickerRef.current.contains(e.target)) ||
          (contextRef.current && !contextRef.current.contains(e.target))
        ) {
          setShowEmojiPicker(false);
          setShowContext(false);
          setMobileContext(false);
          setHovered(false);
        }
      };
      if (showEmojiPicker || showContext || mobileContext) {
        document.addEventListener("mousedown", handleClickOutside);
      }
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, [showEmojiPicker, showContext, mobileContext]);

    useEffect(() => {
      if (!bubbleRef.current) return;
      const rect = bubbleRef.current.getBoundingClientRect();
      const distanceFromBottom = window.innerHeight - rect.bottom;
      if (distanceFromBottom < 200) setMenuDirection("up");
      else setMenuDirection("down");
    }, [showContext, hovered]);

    const myReaction = reactions.find(
      (r) => r.user === userData._id
    )?.emoji;

    const sendReaction = async (emoji) => {
      try {
        const emojiStr =
          typeof emoji === "string" ? emoji : emoji?.emoji || "";
        if (myReaction === emojiStr) {
          await axios.put(
            `${serverUrl}/api/message/react/${_id}`,
            { emoji: "" },
            { withCredentials: true }
          );
          onReact(_id, []);
        } else {
          await axios.put(
            `${serverUrl}/api/message/react/${_id}`,
            { emoji: emojiStr },
            { withCredentials: true }
          );
          onReact(
            _id,
            [
              ...reactions.filter((r) => r.user !== userData._id),
              { user: userData._id, emoji: emojiStr },
            ]
          );
        }
      } catch (err) {
        console.error("Reaction error:", err);
      }
    };

   const handleTouchStart = (e) => {
  touchStartX.current = e.touches?.[0]?.clientX ?? 0;
  pressTimer.current = setTimeout(() => {
    if (window.innerWidth < 1024 && !isDeleted) {
      setMobileContext(true);
      setHovered(true);
    }
  }, 600);
};

    const handleTouchMove = (e) => {
  if (window.innerWidth >= 1024) return; // only small/medium
  const currentX = e.touches?.[0]?.clientX ?? 0;
  const deltaX = currentX - touchStartX.current;

  // Swiping right → shift bubble
  if (deltaX > 0) {
    if (pressTimer.current) clearTimeout(pressTimer.current); // cancel long-press if swiping
    setSwipeOffset(Math.min(deltaX, 120)); // clamp for nice feel
  }
};

  const handleTouchEnd = () => {
  if (pressTimer.current) clearTimeout(pressTimer.current);
  if (swipeOffset > 70) {
    replyMessage(); // fire reply
  }
  setSwipeOffset(0); // reset smoothly
};


    const handleDoubleClick = () => {
      if (isDeleted) return;
      if (window.innerWidth >= 1024) {
        setShowContext(true);
        setHovered(true);
      } else {
        setHovered((prev) => !prev);
      }
    };

    const copyText = () =>
      navigator.clipboard.writeText(message || "");
    const forwardMessage = () =>
      onSelectForActions?.({
        _id,
        message,
        image,
        openForward: true,
      });
    const deleteForMe = () =>
      onSelectForActions?.({ _id, deleteForMe: true });
    const deleteForEveryone = () =>
      onSelectForActions?.({ _id, deleteForEveryone: true });

    const replyMessage = () => {
      if (onSelectForActions) {
        onSelectForActions({
          _id,
          reply: true,
          message,
          image,
        });
      }
    };
      const handleReplyClick = () => {
      if (!replyToMessage?._id) return;
      const target = document.getElementById(`message-${replyToMessage._id}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("highlighted-message");
        setTimeout(() => target.classList.remove("highlighted-message"), 2000);
      }
    };

    const viewDetails = () => setDetailsOpen(true);

    return (
      <>
        {/* Mobile context menu */}
       {!isDeleted && mobileContext && window.innerWidth < 1024 && (
<div className="fixed top-0 left-0 right-0 bg-white shadow-md flex justify-around items-center z-50 p-2 border-b border-gray-200">
<button onClick={() => { copyText(); setMobileContext(false); }}>
<MdContentCopy size={22} />
</button>
<button onClick={() => { setShareOpen(true); setMobileContext(false); }}>
<FiShare2 size={22} />
</button>
<button onClick={() => { replyMessage(); setMobileContext(false); }}>
<RiReplyLine size={22} />
</button>
<button onClick={() => { viewDetails(); setMobileContext(false); }}>
<RiInformationLine size={22} />
</button>
<button onClick={() => { deleteForMe(); setMobileContext(false); }}>
<RiDeleteBin6Line size={22} className="text-red-600" />
</button>
<button onClick={() => { deleteForEveryone(); setMobileContext(false); }}>
<TbTrashX size={22} className="text-red-700" />
</button>
<button onClick={() => setMobileContext(false)}>
<RxCrossCircled size={22} className="text-gray-500" />
</button>
</div>
)}

        {/* Message bubble wrapper */}
        <div
  id={`message-${_id}`}
  ref={ref}
  className="w-fit max-w-[500px] ml-auto relative group"
  onMouseEnter={() => setHovered(true)}
  onMouseLeave={() => setHovered(false)}
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
  onDoubleClick={handleDoubleClick}
>

          {/* Floating hover buttons */}
          {!isDeleted && (
            <div
              className={`absolute -left-14 bottom-8 flex gap-1 transition-opacity duration-200 ${
                hovered ? "opacity-100" : "opacity-0"
              }`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEmojiPicker((prev) => !prev);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow hover:bg-gray-100"
              >
                🙂
              </button>
              <button
                onClick={() => {
                  setShowContext((prev) => !prev);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow hover:bg-gray-100"
              >
                <FiChevronDown />
              </button>
            </div>
          )}

          {/* Message bubble */}
         <div
  ref={bubbleRef}
  className="px-[20px] py-[10px] bg-[#d9fdd3] text-black text-[19px] rounded-tr-none rounded-2xl shadow-md flex flex-col gap-[6px] relative"
  style={{
    transform: `translateX(${swipeOffset}px)`,
    transition: swipeOffset === 0 ? "transform 0.2s ease-out" : "none",
  }}
>

            {/* ✅ WhatsApp-style Reply Preview */}
{/* Replied message preview */}
{replyToMessage && (
  <div
    className="bg-gray-100 border-l-4 border-green-500 p-2 rounded mb-1 text-sm text-gray-700 cursor-pointer hover:bg-gray-200"
    onClick={handleReplyClick}
  >
    <span className="block font-medium text-gray-600">
 {(replyToMessage.sender?._id?.toString() || replyToMessage.sender?.toString()) === userData._id
  ? "You"
  : replyToMessage.sender?.name || "Unknown"}

    </span>

    <span className="line-clamp-1">
      {replyToMessage.message || "📷 Media"}
    </span>
  </div>
)}



            {/* Main message */}
            {isDeleted ? (
              <span className="flex items-center gap-2 text-gray-500 italic">
                <RxCrossCircled className="text-lg text-gray-400" />
                This message was deleted
              </span>
            ) : (
              <>
               {image && (
  <div className="relative">
    <img
      src={image}
      alt="message"
      onClick={() => onImageClick(image)}
      className="rounded-2xl cursor-pointer object-contain max-w-[280px] sm:max-w-[320px] max-h-[320px] w-full h-auto"
    />
  </div>
)}

                {message && <span>{message}</span>}
              </>
            )}

            {/* Time + status */}
            <div className="text-[12px] text-gray-500 mt-1 flex justify-end items-center gap-1">
              {time}
              {status === "sent" && (
                <BsCheck2 size={16} className="font-bold" />
              )}
              {status === "delivered" && (
                <BsCheck2All size={16} className="font-bold" />
              )}
              {status === "seen" && (
                <BsCheck2All
                  size={16}
                  className="text-blue-500 font-bold"
                />
              )}
            </div>
          </div>

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div
              ref={pickerRef}
              className={`absolute ${
                menuDirection === "up"
                  ? "bottom-full mb-2"
                  : "top-full mt-2"
              } right-0 z-50`}
            >
              <EmojiPicker
                onEmojiClick={(emojiObject) => {
                  sendReaction(emojiObject.emoji);
                  setShowEmojiPicker(false);
                  setHovered(false);
                }}
                theme="light"
                height={350}
                emojiStyle={EmojiStyle.NATIVE}
                searchDisabled={false}
                skinTonesDisabled={true}
                previewConfig={{ showPreview: false }}
              />
            </div>
          )}

          {/* Context Menu */}
          {showContext && (
            <div
              ref={contextRef}
              className={`absolute ${
                menuDirection === "up"
                  ? "bottom-full mb-2"
                  : "top-full mt-2"
              } right-0 bg-white rounded-xl shadow-lg flex flex-col z-50 w-48 border border-gray-200`}
            >
              <button
                onClick={() => {
                  copyText();
                  setShowContext(false);
                }}
                className="px-4 py-2 text-left hover:bg-gray-100"
              >
                Copy
              </button>
              <button
                onClick={() => {
                  replyMessage();
                  setShowContext(false);
                }}
                className="px-4 py-2 text-left hover:bg-gray-100"
              >
                Reply
              </button>
              <button
                onClick={() => {
                  setShareOpen(true);
                  setShowContext(false);
                }}
                className="px-4 py-2 text-left hover:bg-gray-100"
              >
                Forward
              </button>
              <button
                onClick={() => {
                  viewDetails();
                  setShowContext(false);
                }}
                className="px-4 py-2 text-left hover:bg-gray-100"
              >
                Details
              </button>
              <button
                onClick={() => {
                  deleteForMe();
                  setShowContext(false);
                }}
                className="px-4 py-2 text-left text-red-600 hover:bg-gray-100"
              >
                Delete for Me
              </button>
              <button
                onClick={() => {
                  deleteForEveryone();
                  setShowContext(false);
                }}
                className="px-4 py-2 text-left text-red-700 hover:bg-gray-100"
              >
                Delete for Everyone
              </button>
            </div>
          )}

          {/* Reactions */}
          {reactions.length > 0 && (
            <div className="absolute -bottom-5 right-2 bg-white text-black text-sm rounded-full px-2 py-0.5 flex gap-1 shadow">
              {reactions.map((r, idx) => (
                <span key={idx}>{r.emoji}</span>
              ))}
            </div>
          )}
        </div>

        <ForwardModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          messageId={_id}
          socket={socket}
        />

        {/* Message Details Modal */}
        {detailsOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg w-[90%] sm:w-[400px]">
              <h2 className="text-lg font-semibold mb-4">
                Message Details
              </h2>
              <p>
                <b>ID:</b> {_id}
              </p>
              <p>
                <b>Message:</b> {message || "Media"}
              </p>
              <p>
                <b>Time:</b> {time}
              </p>
              <p>
                <b>Status:</b> {status}
              </p>
              <p>
                <b>Reactions:</b>{" "}
                {reactions.map((r) => r.emoji).join(" ") ||
                  "None"}
              </p>
              <button
                onClick={() => setDetailsOpen(false)}
                className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }
);

export default SenderMessage;
