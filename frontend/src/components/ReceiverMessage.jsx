import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import { useSelector } from "react-redux";
import { FiCopy, FiShare } from "react-icons/fi";
import { RxCrossCircled } from "react-icons/rx";
import { TbTrashX } from "react-icons/tb";
import { BiReply } from "react-icons/bi";
import EmojiPicker, { EmojiStyle } from "emoji-picker-react";
import ForwardModal from "./ForwardModal";
import { createPortal } from "react-dom";
import { IoIosAperture } from "react-icons/io";
import { CgSpinner } from "react-icons/cg";
import { MdCheckBox, MdTimer } from "react-icons/md"; // Added MdTimer
import { FaPlay, FaHeadphones, FaPause, FaFileLines } from "react-icons/fa6"; 
import dp from "../assets/dp.webp";

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
  onStatusClick,
  isSelected,
  selectionMode,
  isReactionMenuOpen,
  onInteraction,
  senderName,
  senderImage, 
  isGroup, 
  highlightKeyword,
  mediaType,
  expiresAt // ✅ New Prop
}) {
  const scroll = useRef(null);
  const { userData, selectedUser } = useSelector((state) => state.user);
  const [hovered, setHovered] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState("0:00");
  const [audioCurrentTime, setAudioCurrentTime] = useState("0:00");
  const audioRef = useRef(null);

  // ✅ VIDEO PLAYER STATES
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef(null);

  const pickerRef = useRef(null);
  const menuRef = useRef(null);
  const emojiBtnRef = useRef(null);
  const bubbleRef = useRef(null);
  const pressTimer = useRef(null);

  const [menuStyle, setMenuStyle] = useState({
    top: 0,
    left: 0,
    direction: "down",
    side: "right",
    arrowTop: 14,
    visible: false,
  });

  const [pickerStyle, setPickerStyle] = useState({
    top: 0,
    left: 0,
  });

  const [menuDirection, setMenuDirection] = useState("down");
  const [openForward, setOpenForward] = useState(false);
  const [forwardData, setForwardData] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  // ✅ ROBUST MEDIA DETECTION
  const isAudio = mediaType === 'audio' || (image && typeof image === 'string' && image.match(/\.(mp3|wav|ogg|m4a|aac|webm)$/i) !== null);
  const isVideo = !isAudio && (mediaType === 'video' || (image && typeof image === 'string' && image.match(/\.(mp4|mov|avi|mkv|webm|ogg)$/i) !== null));
  const isDocument = !isAudio && !isVideo && (mediaType === 'file' || (image && typeof image === 'string' && image.match(/\.(pdf|docx?|xlsx?|pptx?|txt|rtf|csv|odt|odp|html?|zip|rar|7z)$/i) !== null));

  const getSenderColor = (name) => {
    if (!name) return "#1a7fa0";
    const colors = ["#e53935", "#d81b60", "#8e24aa", "#5e35b1", "#3949ab", "#1e88e5", "#039be5", "#00acc1", "#00897b", "#43a047", "#7cb342", "#c0ca33", "#fdd835", "#ffb300", "#fb8c00", "#f4511e", "#6d4c41", "#757575", "#546e7a"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
  }, [message, image, isDeleted]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target) &&
        !emojiBtnRef.current?.contains(e.target)
      ) {
        setShowEmojiPicker(false);
        setShowQuickReactions(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowContext(false);
      }
    };
    if (showEmojiPicker || showContext || showQuickReactions) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showEmojiPicker, showContext, showQuickReactions]);

  useEffect(() => {
    if (!bubbleRef.current) return;
    const rect = bubbleRef.current.getBoundingClientRect();
    const distanceFromBottom = window.innerHeight - rect.bottom;
    if (distanceFromBottom < 200) setMenuDirection("up");
    else setMenuDirection("down");
  }, [hovered, showContext]);

  const formatTime = (time) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const toggleAudio = (e) => {
    e.stopPropagation();
    if (audioRef.current) {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if(audioRef.current) {
        const current = audioRef.current.currentTime;
        const duration = audioRef.current.duration;
        if(duration) {
           setAudioProgress((current / duration) * 100);
           setAudioCurrentTime(formatTime(current));
        }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioCurrentTime("0:00");
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    const seekVal = e.target.value;
    if (audioRef.current && audioRef.current.duration) {
        const seekTime = (seekVal / 100) * audioRef.current.duration;
        audioRef.current.currentTime = seekTime;
        setAudioProgress(seekVal);
    }
  };

  const onLoadedMetadata = () => {
    if(audioRef.current) {
        const duration = audioRef.current.duration;
        if (duration === Infinity) {
            audioRef.current.currentTime = 1e101;
            audioRef.current.ontimeupdate = function() {
                this.ontimeupdate = () => {};
                this.currentTime = 0;
                setAudioDuration(formatTime(this.duration));
                setImageLoaded(true);
            }
        } else {
            setAudioDuration(formatTime(duration));
            setImageLoaded(true);
        }
    }
  };

  // ✅ VIDEO PLAYER LOGIC
  const toggleVideo = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
        if (isVideoPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsVideoPlaying(!isVideoPlaying);
    }
  };

  const calculatePosition = (targetRef, width, height) => {
    if (!targetRef.current) return { top: 0, left: 0 };
    const rect = targetRef.current.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    let top = rect.bottom + 5;
    let left = rect.left;

    if (top + height > viewportH - 80) {
      top = rect.top - height - 5;
    }

    if (left + width > viewportW - 10) {
      left = rect.right - width;
    }

    if (top < 80) top = 80;

    return { top, left };
  };

  const handleEmojiClick = (e) => {
    e.stopPropagation();
    if (!showEmojiPicker) {
      setPickerStyle(calculatePosition(emojiBtnRef, 350, 450));
    }
    setShowEmojiPicker(!showEmojiPicker);
    setShowContext(false);
  };

  useLayoutEffect(() => {
    if (!showContext || isMobile) {
      setMenuStyle((s) => ({ ...s, visible: false }));
      return;
    }
    if (!bubbleRef.current) return;

    const bubbleRect = bubbleRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const estimatedMenuWidth = 200;
    const estimatedMenuHeight = 160;

    const preferSide =
      bubbleRect.left + bubbleRect.width / 2 < viewportW / 2 ? "right" : "left";

    let top = bubbleRect.top + bubbleRect.height / 2 - estimatedMenuHeight / 2;
    let left =
      preferSide === "right"
        ? bubbleRect.right + 8
        : bubbleRect.left - estimatedMenuWidth - 8;
    let direction = "down";

    if (top + estimatedMenuHeight > viewportH - 12) {
      top = Math.max(8, viewportH - estimatedMenuHeight - 12);
      direction = "up";
    }
    if (top < 8) {
      top = 8;
      direction = "down";
    }

    setMenuStyle({
      top,
      left,
      direction,
      side: preferSide,
      arrowTop: Math.max(12, bubbleRect.top + bubbleRect.height / 2 - top - 8),
      visible: false,
    });

    requestAnimationFrame(() => {
      const menuEl = menuRef.current;
      if (!menuEl) {
        setMenuStyle((s) => ({ ...s, visible: true }));
        return;
      }
      const menuRect = menuEl.getBoundingClientRect();
      let actualTop = top;
      let actualLeft = left;

      if (
        preferSide === "right" &&
        actualLeft + menuRect.width > viewportW - 8
      ) {
        actualLeft = bubbleRect.left - menuRect.width - 8;
        if (actualLeft < 8) {
          actualLeft = Math.max(8, viewportW - menuRect.width - 8);
        }
      } else if (preferSide === "left" && actualLeft < 8) {
        actualLeft = bubbleRect.right + 8;
      }

      const bubbleCenterY = bubbleRect.top + bubbleRect.height / 2;
      let arrowTop = bubbleCenterY - actualTop - 8;
      const arrowClampTop = Math.max(
        10,
        Math.min(menuRect.height - 22, arrowTop)
      );

      if (actualTop + menuRect.height > viewportH - 8) {
        actualTop = Math.max(8, viewportH - menuRect.height - 8);
      }
      if (actualTop < 8) actualTop = 8;

      arrowTop = bubbleCenterY - actualTop - 8;
      arrowTop = Math.max(10, Math.min(menuRect.height - 22, arrowTop));

      setMenuStyle({
        top: actualTop,
        left: actualLeft,
        direction: direction,
        side: actualLeft > bubbleRect.left ? "right" : "left",
        arrowTop,
        visible: true,
      });
    });
  }, [showContext, bubbleRef.current, isMobile]);

  const myReaction = reactions.find((r) => r.user === userData._id)?.emoji;

  const sendReaction = (emoji) => {
    const emojiStr = typeof emoji === "string" ? emoji : emoji?.emoji || "";
    onReact(_id, myReaction === emojiStr ? "" : emojiStr);

    setShowEmojiPicker(false);
    setShowQuickReactions(false);
    setShowContext(false);
    setHovered(false);
  };

  const handleTouchStart = (e) => {
    pressTimer.current = setTimeout(() => {
      if (onInteraction) {
        onInteraction(_id, "longPress");
      } else {
        setShowContext(true);
        setShowQuickReactions(true);
      }
    }, 600);
  };
  const handleTouchEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const handleDoubleClick = () => {};

  const handleClick = () => {
    if (selectionMode && onInteraction) {
      onInteraction(_id, "click");
    }
  };

  const handleSelectMessage = () => {
    if (onInteraction) {
      onInteraction(_id, "longPress");
    } else if (onSelectForActions) {
      onSelectForActions({ _id, select: true });
    }
    setShowContext(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(message || "");
    setShowContext(false);
  };

  const forward = () => {
    setForwardData({ _id, message, image });
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

  const handleReplyClick = () => {
    if (!replyToMessage) return;

    if (replyToMessage.isStatus && onStatusClick) {
      onStatusClick(replyToMessage._id);
      return;
    }

    const target = document.getElementById(`message-${replyToMessage._id}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("highlighted-message");
      setTimeout(() => {
        target.classList.remove("highlighted-message");
      }, 2000);
    }
  };

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

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (onInteraction || selectionMode) return;
    setShowContext(true);
  };

  const renderMessageWithHighlight = (text, highlight) => {
    if (!highlight || !text) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, index) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={index} className="bg-yellow-300 text-black">{part}</span>
        ) : (
            part
        )
    );
  };

  useEffect(() => {
    if (!showContext) return;
    const onScroll = () => {
      setMenuStyle((s) => ({ ...s, visible: false }));
      requestAnimationFrame(() => {
        setMenuStyle((s) => ({ ...s, visible: false }));
        setTimeout(() => {
          setMenuStyle((s) => ({ ...s }));
        }, 0);
      });
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [showContext]);

  return (
    <>
      <div 
        id={`message-${_id}`} 
        ref={scroll}
        className="w-full flex justify-start relative items-end" 
      >
        {swipeOffset > 20 && (
            <div className="absolute -left-10 top-1/2 -translate-y-1/2 text-gray-500 text-xl">
            ↩️
            </div>
        )}

        {/* ✅ GROUP AVATAR: Show only for groups */}
        {isGroup && !isDeleted && (
            <div className="mr-2 mb-1 flex-shrink-0">
                <img 
                    src={senderImage || dp} 
                    alt={senderName} 
                    className="w-7 h-7 rounded-full object-cover shadow-sm"
                />
            </div>
        )}

        <div
            className={`w-fit max-w-[85%] sm:max-w-[70%] mr-auto relative group transition-transform`}
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
            onContextMenu={handleContextMenu}
        >
            {selectionMode && !isMobile && (
            <div 
                className="absolute -right-10 top-1/2 -translate-y-1/2 z-50 cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation();
                    handleSelectMessage();
                }}
            >
                {isSelected ? (
                <MdCheckBox className="text-green-500 text-2xl bg-white" />
                ) : (
                <div className="w-5 h-5 border-2 border-gray-400 rounded-sm bg-white" />
                )}
            </div>
            )}

            {!isDeleted && !isMobile && !selectionMode && (
            <div
                className={`absolute -right-14 bottom-8 flex gap-1 transition-opacity duration-200 ${
                hovered ? "opacity-100" : "opacity-0"
                }`}
            >
                <button
                ref={emojiBtnRef}
                onClick={handleEmojiClick}
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

            {!isDeleted && window.innerWidth < 1024 && isReactionMenuOpen && (
            <div className="mobile-quick-react-bar absolute z-50 flex items-center p-1 bg-white rounded-full shadow-xl -top-12 left-0 sm:hidden">
                {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                <button
                    key={emoji}
                    onClick={(e) => {
                    e.stopPropagation();
                    sendReaction(emoji);
                    }}
                    className="p-1 text-xl hover:bg-gray-100 rounded-full transition-colors"
                >
                    {emoji}
                </button>
                ))}
                <button
                onClick={(e) => {
                    e.stopPropagation();
                    setShowEmojiPicker(true);
                }}
                className="p-1 ml-1 text-gray-500 hover:text-gray-700 rounded-full transition-colors"
                >
                +
                </button>
            </div>
            )}

            <div
            ref={bubbleRef}
            className={`relative px-[12px] py-[8px] bg-white text-black text-[17px] rounded-tl-none rounded-2xl shadow-md flex flex-col gap-[6px] overflow-hidden min-w-[120px]`}
            >
            {isSelected && (
                <div className="absolute inset-0 bg-blue-500/20 z-10 pointer-events-none"></div>
            )}

            {/* ✅ GROUP SENDER NAME */}
            {isGroup && !isDeleted && (
                <span 
                    className="text-[13px] font-bold leading-tight"
                    style={{ color: getSenderColor(senderName) }}
                >
                    {senderName || "Unknown"}
                </span>
            )}

            {replyToMessage && (
                <div
                className="bg-gray-100 border-l-4 border-green-500 p-2 rounded mb-1 cursor-pointer hover:bg-gray-200 relative z-0 flex justify-between items-center gap-2"
                onClick={handleReplyClick}
                >
                <div className="flex-1 overflow-hidden">
                    <span className="block font-medium text-gray-600 text-sm">
                    {replyToMessage.sender?._id === userData._id ||
                    replyToMessage.sender === userData._id
                        ? "You"
                        : replyToMessage.sender?.name || ""}
                    </span>

                    <span className="line-clamp-1 flex items-center gap-1 text-sm text-gray-500">
                    {replyToMessage.isStatus && (
                        <IoIosAperture className="text-pink-500" />
                    )}
                    {replyToMessage.isStatus
                        ? replyToMessage.message || "Status"
                        : typeof replyToMessage.message === "string"
                        ? replyToMessage.message
                        : replyToMessage.message?.text || "📷 Media"}
                    </span>
                </div>

                {replyToMessage.image && (
                    <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-300">
                    {replyToMessage.image.match(/\.(mp4|webm|ogg)$/i) ? (
                        <video
                        src={replyToMessage.image}
                        className="w-full h-full object-cover"
                        muted
                        />
                    ) : (
                        <img
                        src={replyToMessage.image}
                        alt="preview"
                        className="w-full h-full object-cover"
                        />
                    )}
                    </div>
                )}
                </div>
            )}

            {isDeleted ? (
                <span className="text-gray-500 italic flex items-center gap-2 relative z-0">
                <RxCrossCircled className="text-lg text-gray-400" />
                This message was deleted
                </span>
            ) : (
                <>
                {image && (
                    <div className="relative z-0">
                    {isAudio ? (
                        <div className="flex items-center gap-3 min-w-[260px] p-1 rounded-xl bg-gray-50">
                            <button onClick={toggleAudio} className="w-10 h-10 flex-shrink-0 rounded-full bg-gray-200/50 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition">
                                {isPlaying ? <FaPause size={14} /> : <FaPlay size={14} className="ml-0.5" />}
                            </button>
                            <div className="flex flex-col flex-1 justify-center gap-1">
                                <input type="range" min="0" max="100" value={audioProgress} onChange={handleSeek} onClick={(e) => e.stopPropagation()} className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                                <div className="flex justify-between text-[11px] text-gray-500 font-medium px-0.5"><span>{audioCurrentTime}</span><span>{audioDuration}</span></div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gray-200/50 flex items-center justify-center text-gray-500"><FaHeadphones size={14} /></div>
                            <audio ref={audioRef} src={image} onTimeUpdate={handleTimeUpdate} onEnded={handleAudioEnded} onLoadedMetadata={onLoadedMetadata} onError={() => setImageLoaded(true)} className="hidden" />
                        </div>
                    ) : isVideo ? (
                        // ✅ PROFESSIONAL VIDEO PLAYER with Center Button
                        <div className="relative w-full max-w-[280px] sm:max-w-[420px] group cursor-pointer" onClick={toggleVideo}>
                            <video 
                                ref={videoRef}
                                src={image} 
                                controls 
                                className="w-full h-auto max-h-[400px] bg-black rounded-xl object-contain" 
                                onLoadedData={() => setImageLoaded(true)} 
                                onError={() => setImageLoaded(true)}
                                onPlay={() => setIsVideoPlaying(true)}
                                onPause={() => setIsVideoPlaying(false)}
                                onEnded={() => setIsVideoPlaying(false)}
                            />
                            {/* Play Button (Visible when paused) */}
                            {!isVideoPlaying && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                                    <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm shadow-xl border border-white/20 hover:scale-110 transition-transform">
                                        <FaPlay className="text-white ml-1" size={20} />
                                    </div>
                                </div>
                            )}
                            {/* Pause Button (Visible on hover when playing) */}
                            {isVideoPlaying && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-xl">
                                    <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm shadow-xl border border-white/20">
                                        <FaPause className="text-white" size={20} />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : isDocument ? (
                        // ✅ DOCUMENT CARD FOR RECEIVER
                        <div className="flex items-center gap-3 p-3 bg-gray-100 rounded-xl min-w-[200px] cursor-pointer hover:bg-gray-200 transition" onClick={() => window.open(image, "_blank")}>
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-orange-500 shadow-sm flex-shrink-0">
                                <FaFileLines size={24} />
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="font-semibold text-sm truncate w-48 text-gray-800">
                                    {decodeURIComponent(image.split('/').pop().split('?')[0]) || "Document"}
                                </span>
                                <span className="text-[10px] uppercase text-gray-600 font-bold">
                                    {image.split('.').pop().split('?')[0].toUpperCase().slice(0,4)} FILE
                                </span>
                            </div>
                        </div>
                    ) : (
                        <>
                        {!imageLoaded && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-[2px] rounded-xl">
                            <CgSpinner className="animate-spin text-white text-4xl" />
                            </div>
                        )}
                        <img
                            src={image}
                            alt="message"
                            onLoad={() => setImageLoaded(true)}
                            onClick={() =>
                            !selectionMode && onImageClick(image)
                            }
                            className={`w-full h-auto max-h-[400px] max-w-[280px] sm:max-w-[420px] rounded-xl object-cover cursor-pointer transition-all duration-300 ${
                            !imageLoaded
                                ? "blur-[3px] brightness-75"
                                : "blur-0"
                            }`}
                        />
                        </>
                    )}
                    </div>
                )}
                {message && <span className="relative z-0 leading-snug">{renderMessageWithHighlight(message, highlightKeyword)}</span>}
                </>
            )}

            <div className="text-[11px] text-gray-500 mt-1 flex justify-end items-center gap-1 relative z-0">
            {/* ✅ EXPIRATION TIMER */}
            {expiresAt && (
                <span className="flex items-center gap-0.5 text-orange-500 mr-1" title="Disappearing Message">
                    <MdTimer size={12} />
                </span>
            )}
            
            {time && (
                <span>
                {time}
                </span>
            )}
            </div>

            {showEmojiPicker &&
                createPortal(
                <div
                    ref={pickerRef}
                    style={{ position: "fixed", top: pickerStyle.top, left: pickerStyle.left, zIndex: 9999 }}
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
                </div>,
                document.body
                )}

            {showQuickReactions && (
                <div
                ref={pickerRef}
                className="absolute -top-12 left-0 right-auto bg-white rounded-full shadow-lg px-2 py-1 flex gap-3 items-center z-[9999]"
                >
                {["👍", "❤️", "😂", "😮", "😢"].map((emo) => (
                    <button
                    key={emo}
                    onClick={() => {
                        sendReaction(emo);
                        setShowQuickReactions(false);
                        setShowEmojiPicker(false);
                        setShowContext(false);
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
                    +
                    </button>
                </div>
            )}
            </div>

            {reactions.length > 0 && (
            <div className="absolute -bottom-5 left-2 bg-white text-black text-sm rounded-full px-2 py-0.5 flex gap-1 shadow">
                {reactions.map((r, idx) => (
                <span key={idx}>{r.emoji}</span>
                ))}
            </div>
            )}
        </div>
      </div>

      {isMobile &&
        showContext &&
        !selectionMode &&
        createPortal(
          <div className="fixed top-0 left-0 right-0 bg-white z-[9999] flex items-center justify-between px-2 py-2 shadow-md">
            <button
              onClick={() => setShowContext(false)}
              className="text-xl px-2 py-1"
            >
              ❌
            </button>
            <div className="flex gap-6">
              <button
                onClick={() => copy()}
                className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100"
              >
                <FiCopy className="text-xl" />
              </button>
              <button
                onClick={() => replyMessage()}
                className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100"
              >
                <BiReply className="text-xl" />
              </button>
              <button
                onClick={() => forward()}
                className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100"
              >
                <FiShare className="text-xl" />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center justify-center text-red-600 p-2 rounded-full hover:bg-red-50"
              >
                <TbTrashX className="text-xl" />
              </button>
            </div>
            <div style={{ width: 40 }} />
          </div>,
          document.body
        )}

      {showDeleteConfirm &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/40 z-[10000] flex items-center justify-center"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <div
              className="bg-white rounded-xl shadow-lg w-72 p-4 flex flex-col gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-center">
                {`Delete message from ${
                  selectedUser?.name || "this user"
                }?`}
              </h3>
              <div className="flex justify-end gap-3 mt-2">
                <button
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm"
                  onClick={() => {
                    deleteForMe();
                    setShowDeleteConfirm(false);
                    setShowContext(false);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {createPortal(
        !isMobile &&
          menuStyle.visible && (
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                top: `${menuStyle.top}px`,
                left: `${menuStyle.left}px`,
                zIndex: 2147483647,
                width: 200,
                borderRadius: 12,
                boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                background: "white",
                border: "1px solid rgba(0,0,0,0.06)",
                transformOrigin:
                  menuStyle.direction === "up" ? "left bottom" : "left top",
                animation: "menuPop .12s ease-out",
                overflow: "visible",
              }}
              onContextMenu={(e) => e.preventDefault()}
              className="text-black"
            >
              <div
                style={{
                  position: "absolute",
                  width: 0,
                  height: 0,
                  borderTop:
                    menuStyle.side === "right"
                      ? `8px solid transparent`
                      : `8px solid transparent`,
                  borderBottom:
                    menuStyle.side === "right"
                      ? `8px solid transparent`
                      : `8px solid transparent`,
                  ...(menuStyle.side === "right"
                    ? {
                        left: -8,
                        top: `${menuStyle.arrowTop}px`,
                        borderRight: `8px solid white`,
                        filter:
                          "drop-shadow(0 1px 1px rgba(0,0,0,0.06))",
                      }
                    : {
                        right: -8,
                        top: `${menuStyle.arrowTop}px`,
                        borderLeft: `8px solid white`,
                        filter:
                          "drop-shadow(0 1px 1px rgba(0,0,0,0.06))",
                      }),
                }}
              />
              <button
                onClick={handleSelectMessage}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Select
              </button>
              <button
                onClick={() => {
                  copy();
                  setShowContext(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Copy
              </button>
              <button
                onClick={() => {
                  replyMessage();
                  setShowContext(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Reply
              </button>
              <button
                onClick={() => {
                  forward();
                  setShowContext(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Forward
              </button>
              
              <button
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setShowContext(false);
                }}
                className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
              >
                Delete
              </button>
            </div>
          ),
        document.body
      )}

      <ForwardModal
        open={openForward}
        onClose={() => setOpenForward(false)}
        message={forwardData}
        socket={socket}
      />

      <style>{`
        .highlighted-message {
          animation: highlightFlash 2s ease-in-out;
          border-radius: 4px;
        }
        @keyframes highlightFlash {
          0% { background-color: rgba(224, 255, 255, 0.6); } 
          50% { background-color: rgba(224, 255, 255, 0.3); } 
          100% { background-color: transparent; }
        }
      `}</style>
    </>
  );
}

export default ReceiverMessage;