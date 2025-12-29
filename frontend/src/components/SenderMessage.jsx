import React, { useEffect, useRef, useState, forwardRef } from "react";
import { useSelector } from "react-redux";
import { BsCheck2, BsCheck2All } from "react-icons/bs";
import { MdCheckBox, MdCheckBoxOutlineBlank, MdTimer } from "react-icons/md"; 
import { FiChevronDown, FiPlusCircle } from "react-icons/fi";
import { RxCrossCircled, RxCross2 } from "react-icons/rx"; 
import EmojiPicker, { EmojiStyle } from "emoji-picker-react";
import ForwardModal from "./ForwardModal";
import { IoIosAperture } from "react-icons/io";
import { createPortal } from "react-dom";
import { CgSpinner } from "react-icons/cg"; 
import { FaHeadphones, FaPlay, FaPause, FaFileLines } from "react-icons/fa6"; 

const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

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
      replyToMessage,
      socket,
      highlightedMessageId,
      onStatusClick,
      isSelected,
      selectionMode,
      isReactionMenuOpen, 
      onInteraction,
      onCancelUpload,
      mediaType, 
      highlightKeyword,
      isGroup,
      expiresAt // ✅ New Prop
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
    
    const [imageLoaded, setImageLoaded] = useState(false); 
    
    // AUDIO PLAYER STATES
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const [audioDuration, setAudioDuration] = useState("0:00");
    const [audioCurrentTime, setAudioCurrentTime] = useState("0:00");
    const audioRef = useRef(null);

    // VIDEO PLAYER STATES
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const videoRef = useRef(null);

    const contextRef = useRef(null);
    const pickerRef = useRef(null);
    const emojiBtnRef = useRef(null);
    const contextBtnRef = useRef(null);
    
    const pressTimer = useRef(null);
    const bubbleRef = useRef(null);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const touchStartX = useRef(0);
    const [isMobile, setIsMobile] = useState(false);

    const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0 });
    const [pickerStyle, setPickerStyle] = useState({ top: 0, left: 0 });

    const isSending = status === "sending"; 

    // ✅ ROBUST MEDIA DETECTION
    const isAudio = mediaType === 'audio' || (image && typeof image === 'string' && image.match(/\.(mp3|wav|ogg|m4a|aac|webm)$/i) !== null);
    const isVideo = !isAudio && (mediaType === 'video' || (image && typeof image === 'string' && image.match(/\.(mp4|mov|avi|mkv)$/i) !== null));
    const isDocument = !isAudio && !isVideo && (mediaType === 'file' || (image && typeof image === 'string' && image.match(/\.(pdf|docx?|xlsx?|pptx?|txt|rtf|csv|odt|odp|html?|zip|rar|7z)$/i) !== null));

    useEffect(() => {
      if (highlightedMessageId === _id && ref?.current) {
        ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
        ref.current.classList.add("highlighted-message");
        const timer = setTimeout(() => ref.current?.classList.remove("highlighted-message"), 2000);
        return () => clearTimeout(timer);
      }
    }, [highlightedMessageId, _id, ref]);

    useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 640);
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
      const handleClickOutside = (e) => {
        const isClickOutsideMobileQuickReact = !(
          window.innerWidth < 1024 &&
          mobileContext &&
          document.querySelector(".mobile-quick-react-bar")?.contains(e.target)
        );

        if(isMobile && showContext) return;

        if (
          (pickerRef.current && !pickerRef.current.contains(e.target) && !emojiBtnRef.current?.contains(e.target)) ||
          (contextRef.current && !contextRef.current.contains(e.target) && !contextBtnRef.current?.contains(e.target))
        ) {
          setShowEmojiPicker(false);
          setShowContext(false);
          if (isClickOutsideMobileQuickReact) {
            setMobileContext(false);
            setHovered(false);
          }
        }
      };
      if (showEmojiPicker || showContext || mobileContext) {
        document.addEventListener("mousedown", handleClickOutside);
      }
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showEmojiPicker, showContext, mobileContext]);

    // AUDIO PLAYER LOGIC
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
        let top = rect.bottom + 5;
        let left = rect.right - width; 
        if (top + height > viewportH - 80) top = rect.top - height - 5;
        if (left < 10) left = rect.left;
        if (top < 80) top = 80;
        return { top, left };
    };

    const handleEmojiClick = (e) => {
        e.stopPropagation();
        if (!showEmojiPicker) setPickerStyle(calculatePosition(emojiBtnRef, 350, 450));
        setShowEmojiPicker((prev) => !prev);
        setShowContext(false);
    };

    const handleContextClick = (e) => {
        e.stopPropagation();
        if (!showContext && !isMobile) setMenuStyle(calculatePosition(contextBtnRef, 200, 250));
        setShowContext((prev) => !prev);
        setShowEmojiPicker(false);
    };

    const myReaction = reactions.find((r) => r.user === userData._id)?.emoji;
    const sendReaction = (emoji) => {
      const emojiStr = typeof emoji === "string" ? emoji : emoji?.emoji || "";
      onReact(_id, myReaction === emojiStr ? "" : emojiStr);
      setShowEmojiPicker(false);
      setMobileContext(false);
      setShowContext(false);
      setHovered(false);
    };

    const handleTouchStart = (e) => {
      touchStartX.current = e.touches?.[0]?.clientX ?? 0;
      pressTimer.current = setTimeout(() => {
        if (window.innerWidth < 1024 && !isDeleted && onInteraction) onInteraction(_id, 'longPress');
      }, 600);
    };

    const handleTouchMove = (e) => {
      if (window.innerWidth >= 1024) return;
      const currentX = e.touches?.[0]?.clientX ?? 0;
      const deltaX = currentX - touchStartX.current;
      if (deltaX > 0) {
        if (pressTimer.current) clearTimeout(pressTimer.current);
        setSwipeOffset(Math.min(deltaX, 120));
      }
    };

    const handleTouchEnd = () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
      if (swipeOffset > 70) replyMessage();
      setSwipeOffset(0);
    };

    const handleDoubleClick = () => {
      if (isDeleted) return;
      if (!isMobile) {
        setMenuStyle(calculatePosition(contextBtnRef || bubbleRef, 200, 250));
        setShowContext(true);
        setHovered(true);
      } else {
        setHovered((prev) => !prev);
      }
    };
    
    const handleClick = () => {
       if(selectionMode && onInteraction) onInteraction(_id, 'click');
    };

    const handleSelectMessage = () => {
        if (onInteraction) onInteraction(_id, "longPress"); 
        else if (onSelectForActions) onSelectForActions({ _id, select: true });
        setShowContext(false);
    };

    const copyText = () => navigator.clipboard.writeText(message || "");
    const deleteForMe = () => onSelectForActions?.({ _id, deleteForMe: true });
    const deleteForEveryone = () => onSelectForActions?.({ _id, deleteForEveryone: true });
    const replyMessage = () => {
      if (onSelectForActions) onSelectForActions({ _id, reply: true, message, image });
    };

    const viewDetails = () => {
       if (onSelectForActions) onSelectForActions({ _id, details: true });
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
        setTimeout(() => target.classList.remove("highlighted-message"), 2000);
      }
    };

    const toggleMobileEmojiPicker = () => {
      setShowEmojiPicker(true);
      setMobileContext(false);
    };

    const renderMessageWithHighlight = (text, highlight) => {
        if (!highlight || !text) return text;
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return parts.map((part, index) =>
            part.toLowerCase() === highlight.toLowerCase() ? (
                <span key={index} className="bg-yellow-300 text-black">{part}</span>
            ) : part
        );
    };

    return (
      <>
        <div id={`message-${_id}`} ref={ref} className="w-full flex justify-end">
            <div
            className={`w-fit max-w-[85%] sm:max-w-[70%] relative group`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={handleDoubleClick}
            onClick={handleClick}
            >
            {selectionMode && !isMobile && (
                <div 
                  className="absolute -left-10 top-1/2 -translate-y-1/2 z-50 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onInteraction(_id, 'click'); }}
                >
                {isSelected ? <MdCheckBox className="text-green-500 text-2xl bg-white" /> : <MdCheckBoxOutlineBlank className="text-gray-400 text-2xl bg-white" />}
                </div>
            )}

            {!isDeleted && window.innerWidth < 1024 && isReactionMenuOpen && (
                <div className="mobile-quick-react-bar absolute z-50 flex items-center p-1 bg-white rounded-full shadow-xl -top-12 right-0 sm:hidden">
                {quickReactions.map((emoji) => (
                    <button key={emoji} onClick={(e) => { e.stopPropagation(); sendReaction(emoji); }} className="p-1 text-xl hover:bg-gray-100 rounded-full transition-colors">{emoji}</button>
                ))}
                <button onClick={(e) => { e.stopPropagation(); toggleMobileEmojiPicker(); }} className="p-1 ml-1 text-gray-500 hover:text-gray-700 rounded-full transition-colors"><FiPlusCircle size={20} /></button>
                </div>
            )}

            {!isDeleted && !isSending && !selectionMode && (
                <div className={`absolute -left-14 bottom-8 flex gap-1 transition-opacity duration-200 ${hovered && !mobileContext ? "opacity-100" : "opacity-0"} ${isMobile ? "hidden" : "block"}`}>
                <button ref={emojiBtnRef} onClick={handleEmojiClick} className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow hover:bg-gray-100">🙂</button>
                <button ref={contextBtnRef} onClick={handleContextClick} className="w-7 h-7 flex items-center justify-center rounded-full bg-white shadow hover:bg-gray-100"><FiChevronDown /></button>
                </div>
            )}

            <div
                ref={bubbleRef}
                className={`px-[12px] py-[8px] bg-[#d9fdd3] text-black text-[17px] rounded-tr-none rounded-2xl shadow-md flex flex-col gap-[4px] relative overflow-hidden transition-colors duration-200 min-w-[120px]`}
                style={{ transform: `translateX(${swipeOffset}px)`, transition: swipeOffset === 0 ? "transform 0.2s ease-out" : "none" }}
            >
                {isSelected && <div className="absolute inset-0 bg-blue-500/20 z-10 pointer-events-none"></div>}

                {replyToMessage && (
                <div className="bg-gray-100 border-l-4 border-green-500 p-2 rounded mb-1 cursor-pointer hover:bg-gray-200 relative z-0 flex justify-between items-center gap-2" onClick={handleReplyClick}>
                    <div className="flex-1 overflow-hidden">
                        <span className="block font-medium text-gray-600 text-sm">{(replyToMessage.sender?._id?.toString() || replyToMessage.sender?.toString()) === userData._id ? "You" : replyToMessage.sender?.name || "Unknown"}</span>
                        <span className="line-clamp-1 flex items-center gap-1 text-sm text-gray-500">{replyToMessage.isStatus && <IoIosAperture className="text-pink-500" />}{replyToMessage.isStatus ? (replyToMessage.message || "Status") : (replyToMessage.message || "📷 Media")}</span>
                    </div>
                    {replyToMessage.image && (
                        <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-300">
                        {replyToMessage.image.match(/\.(mp4|webm|ogg)$/i) ? <video src={replyToMessage.image} className="w-full h-full object-cover" muted /> : <img src={replyToMessage.image} alt="preview" className="w-full h-full object-cover" />}
                        </div>
                    )}
                </div>
                )}

                {isDeleted ? (
                <span className="flex items-center gap-2 text-gray-500 italic relative z-0"><RxCrossCircled className="text-lg text-gray-400" /> This message was deleted</span>
                ) : (
                <>
                    {image && (
                    <div className="relative z-0">
                        {(isSending && !imageLoaded) && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[2px] rounded-2xl">
                            <CgSpinner className="animate-spin text-white text-4xl mb-2" />
                            {onCancelUpload && <button onClick={(e) => { e.stopPropagation(); onCancelUpload(_id); }} className="bg-gray-800/80 p-1 rounded-full text-white hover:bg-gray-700 transition"><RxCross2 size={20} /></button>}
                        </div>
                        )}
                        
                        {/* AUDIO PLAYER */}
                        {isAudio ? (
                            <div className="flex items-center gap-3 min-w-[260px] p-1 rounded-xl">
                                <button onClick={toggleAudio} className="w-10 h-10 flex-shrink-0 rounded-full bg-gray-500/20 flex items-center justify-center text-gray-700 hover:bg-gray-500/30 transition">
                                    {isPlaying ? <FaPause size={14} /> : <FaPlay size={14} className="ml-0.5" />}
                                </button>
                                <div className="flex flex-col flex-1 justify-center gap-1">
                                    <input type="range" min="0" max="100" value={audioProgress} onChange={handleSeek} onClick={(e) => e.stopPropagation()} className="w-full h-1 bg-gray-400/50 rounded-lg appearance-none cursor-pointer accent-green-600" />
                                    <div className="flex justify-between text-[11px] text-gray-500 font-medium px-0.5"><span>{audioCurrentTime}</span><span>{audioDuration}</span></div>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-gray-400/20 flex items-center justify-center text-gray-500"><FaHeadphones size={14} /></div>
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
                            <div className="flex items-center gap-3 p-3 bg-white/20 rounded-xl min-w-[200px] cursor-pointer hover:bg-white/30 transition" onClick={() => window.open(image, "_blank")}>
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
                            <img src={image} alt="message" onLoad={() => setImageLoaded(true)} onClick={() => !selectionMode && !isSending && onImageClick(image)} className={`rounded-2xl cursor-pointer object-cover max-w-[280px] sm:max-w-[420px] max-h-[400px] w-full h-auto transition-all duration-300 ${isSending && !imageLoaded ? "blur-[3px] brightness-75" : "blur-0"}`} />
                        )}
                    </div>
                    )}
                    {message && <span className="relative z-0 leading-snug">{renderMessageWithHighlight(message, highlightKeyword)}</span>}
                </>
                )}

                <div className="text-[11px] text-gray-500 mt-1 flex justify-end items-center gap-1 relative z-0">
                {/* ✅ EXPIRATION TIMER */}
                {expiresAt && (
                    <span className="flex items-center gap-0.5 text-blue-500 mr-1" title={`Expires: ${new Date(expiresAt).toLocaleString()}`}>
                        <MdTimer size={12} /> 
                        {status !== "sending" && <span className="text-[9px]">24h</span>}
                    </span>
                )}

                {time}
                {status === "sending" && <span className="text-gray-400">🕒</span>}
                {status === "sent" && <BsCheck2 size={16} className="font-bold" />}
                {status === "delivered" && <BsCheck2All size={16} className="font-bold" />}
                {status === "seen" && <BsCheck2All size={16} className="text-blue-500 font-bold" />}
                </div>
            </div>

            {showEmojiPicker && createPortal(
                <div ref={pickerRef} style={{ position: "fixed", top: pickerStyle.top, left: pickerStyle.left, zIndex: 9999 }}>
                <EmojiPicker onEmojiClick={(emojiObject) => { sendReaction(emojiObject.emoji); setShowEmojiPicker(false); setHovered(false); }} theme="light" height={350} emojiStyle={EmojiStyle.NATIVE} searchDisabled={false} skinTonesDisabled={true} previewConfig={{ showPreview: false }} />
                </div>, document.body
            )}

            {showContext && createPortal(
                isMobile ? (
                    <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-black/40" onClick={() => setShowContext(false)}>
                        <div className="bg-white rounded-xl shadow-lg flex flex-col w-64 p-2 animate-scale-in" onClick={(e) => e.stopPropagation()}>
                            <button onClick={handleSelectMessage} className="px-4 py-3 text-left hover:bg-gray-100 rounded-lg text-lg">Select</button>
                            <button onClick={() => { copyText(); setShowContext(false); }} className="px-4 py-3 text-left hover:bg-gray-100 rounded-lg text-lg">Copy</button>
                            <button onClick={() => { replyMessage(); setShowContext(false); }} className="px-4 py-3 text-left hover:bg-gray-100 rounded-lg text-lg">Reply</button>
                            <button onClick={() => { setShareOpen(true); setShowContext(false); }} className="px-4 py-3 text-left hover:bg-gray-100 rounded-lg text-lg">Forward</button>
                            <button onClick={() => { viewDetails(); setShowContext(false); }} className="px-4 py-3 text-left hover:bg-gray-100 rounded-lg text-lg">Details</button>
                            <button onClick={() => { deleteForMe(); setShowContext(false); }} className="px-4 py-3 text-left text-red-600 hover:bg-gray-100 rounded-lg text-lg">Delete for Me</button>
                            <button onClick={() => { deleteForEveryone(); setShowContext(false); }} className="px-4 py-3 text-left text-red-700 hover:bg-gray-100 rounded-lg text-lg">Delete for Everyone</button>
                        </div>
                    </div>
                ) : (
                    <div ref={contextRef} style={{ position: "fixed", top: menuStyle.top, left: menuStyle.left, zIndex: 9999 }} className="bg-white rounded-xl shadow-lg flex flex-col w-48 border border-gray-200">
                    <button onClick={handleSelectMessage} className="px-4 py-2 text-left hover:bg-gray-100">Select</button>
                    <button onClick={() => { copyText(); setShowContext(false); }} className="px-4 py-2 text-left hover:bg-gray-100">Copy</button>
                    <button onClick={() => { replyMessage(); setShowContext(false); }} className="px-4 py-2 text-left hover:bg-gray-100">Reply</button>
                    <button onClick={() => { setShareOpen(true); setShowContext(false); }} className="px-4 py-2 text-left hover:bg-gray-100">Forward</button>
                    <button onClick={() => { viewDetails(); setShowContext(false); }} className="px-4 py-2 text-left hover:bg-gray-100">Details</button>
                    <button onClick={() => { deleteForMe(); setShowContext(false); }} className="px-4 py-2 text-left text-red-600 hover:bg-gray-100">Delete for Me</button>
                    <button onClick={() => { deleteForEveryone(); setShowContext(false); }} className="px-4 py-2 text-left text-red-700 hover:bg-gray-100">Delete for Everyone</button>
                    </div>
                ), document.body
            )}

            {reactions.length > 0 && <div className="absolute -bottom-5 right-2 bg-white text-black text-sm rounded-full px-2 py-0.5 flex gap-1 shadow">{reactions.map((r, idx) => <span key={idx}>{r.emoji}</span>)}</div>}
            </div>
        </div>

        <ForwardModal open={shareOpen} onClose={() => setShareOpen(false)} message={{ _id, message, image }} socket={socket} />

        <style>{`
          .highlighted-message { animation: highlightFlash 2s ease-in-out; border-radius: 4px; }
          @keyframes highlightFlash { 0% { background-color: rgba(224, 255, 255, 0.6); } 50% { background-color: rgba(224, 255, 255, 0.3); } 100% { background-color: transparent; } }
          @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          .animate-scale-in { animation: scaleIn 0.2s ease-out; }
        `}</style>
      </>
    );
  }
);

export default SenderMessage;