import React, { useEffect, useState, useRef } from "react";
import { RxCross2 } from "react-icons/rx";
import { FiMoreVertical } from "react-icons/fi";
import { useSelector, useDispatch } from "react-redux"; 
import axios from "axios";
import { serverUrl } from "../main.jsx";
import dp from "../assets/dp.webp";
import { motion, AnimatePresence } from "framer-motion";
import { IoSend } from "react-icons/io5";
import { BsEmojiSmile, BsMusicNoteBeamed, BsVolumeMuteFill } from "react-icons/bs"; 
import { FaHeart, FaRegHeart } from "react-icons/fa"; 
import EmojiPicker from "emoji-picker-react";
import { toast } from "react-toastify";

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
    { label: "second", seconds: 1 },
  ];
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1)
      return `${count} ${interval.label}${count > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

function StatusViewer({ statuses, index, onClose, onNext, onPrev, onDelete, socket }) {
  const { userData, otherUsers } = useSelector((state) => state.user);
  
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesList, setLikesList] = useState([]);

  const videoRef = useRef(null);
  const audioRef = useRef(null); 
  const timerRef = useRef(null);
  const pickerRef = useRef(null);

  // ✅ DEFENSIVE CHECK: If data is missing, return null (Don't call onClose here)
  if (!statuses || statuses.length === 0 || !statuses[index]) {
      return null;
  }
  
  const status = statuses[index];
  
  // ✅ DETECT STATUS TYPE SAFELY
  const isTextStatus = status.type === 'text' || (!status.mediaUrl && status.text);
  const isVideo = !isTextStatus && status.mediaUrl && status.mediaUrl.match(/\.(mp4|webm|ogg)$/i);

  // Reset UI when changing slides
  useEffect(() => {
    setMenuOpen(false);
    setShowViewers(false);
    setForwardOpen(false);
    setPaused(false);
    setReplyText("");
    setShowEmojiPicker(false);
  }, [index]);

  // ─── INITIALIZE LIKES & VIEWERS ───
  useEffect(() => {
    if (!status) return;

    const userLiked = status.likes?.some(like => 
       (like.user?._id === userData._id) || (like.user === userData._id)
    );
    setIsLiked(!!userLiked);
    setLikesList(status.likes || []);

    if (status.user._id === userData._id) {
      axios
        .get(`${serverUrl}/api/status/${status._id}/viewers`, { withCredentials: true })
        .then((res) => setViewers(res.data || []))
        .catch((err) => {
          if (err.response?.status === 404) {
            console.warn("Status not found on server.");
            // ✅ SAFE CLOSE: Use setTimeout to avoid "update while rendering" error
            setTimeout(() => onClose(), 0);
          } else {
            console.error("Error fetching viewers:", err);
          }
        });
    }
  }, [status, userData._id]);

  // ─── MARK STATUS VIEWED (NON-OWNER) ───
  useEffect(() => {
    setProgress(0);
    
    if (status && status.user._id !== userData._id) {
      const markViewed = async () => {
        try {
          const res = await axios.post(
            `${serverUrl}/api/status/${status._id}/view`,
            {},
            { withCredentials: true }
          );
          if (res.data?.status?.viewers) {
            setViewers(res.data.status.viewers);
            if (socket) {
              socket.emit("statusViewed", {
                statusId: status._id,
                viewers: res.data.status.viewers,
              });
            }
          }
        } catch (err) {
          if (err.response?.status === 404) {
             // ✅ SAFE CLOSE
             setTimeout(() => onClose(), 0);
          }
        }
      };
      markViewed();
    }
  }, [index, status, userData._id, socket]);

  // ─── HANDLE LIKE TOGGLE ───
  const toggleLike = async () => {
      const newLikedState = !isLiked;
      setIsLiked(newLikedState); 

      try {
          const endpoint = newLikedState ? "like" : "unlike";
          const res = await axios.post(
              `${serverUrl}/api/status/${status._id}/${endpoint}`,
              {},
              { withCredentials: true }
          );
          if (res.data?.likes) setLikesList(res.data.likes);
      } catch (error) {
          console.error("Like toggle error:", error);
          setIsLiked(!newLikedState); 
          toast.error("Could not update like");
      }
  };

  // ─── AUTO PROGRESS & AUDIO PLAYBACK ───
  useEffect(() => {
    clearInterval(timerRef.current);
    
    // Audio sync logic
    if (status.musicUrl && audioRef.current && !isVideo) {
        if (paused) {
            audioRef.current.pause();
        } else {
            const startT = Number(status.musicStartTime) || 0;
            const duration = Number(status.musicDuration) || 15; 
            const endT = startT + duration;

            if (audioRef.current.paused || Math.abs(audioRef.current.currentTime - startT) > 0.5) {
               audioRef.current.currentTime = startT;
            }
            
            const checkTime = () => {
                if(audioRef.current && audioRef.current.currentTime >= endT) {
                    audioRef.current.pause();
                }
            };
            audioRef.current.ontimeupdate = checkTime;
            
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => { if (e.name !== "AbortError") console.log("Audio play error", e); });
            }
        }
    }

    if (paused) return;

    if (isVideo) {
      if (videoRef.current) {
        if (!paused) {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch((e) => { if (e.name !== "AbortError") console.log("Video play error:", e); });
          }
        }
        videoRef.current.onended = () => onNext();
        const updateProgress = () => {
          if (videoRef.current && videoRef.current.duration) {
            setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
          }
        };
        videoRef.current.ontimeupdate = updateProgress;
      }
    } else {
      // ✅ Duration logic
      const duration = (status.musicUrl && status.musicDuration) 
         ? Number(status.musicDuration) * 1000 
         : 5000; 

      // Safe check for invalid duration
      const safeDuration = duration > 0 ? duration : 5000;
      const step = 100 / (safeDuration / 100);

      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev + step >= 100) {
            clearInterval(timerRef.current);
            onNext();
            return 100;
          }
          return prev + step;
        });
      }, 100);
    }

    return () => {
      clearInterval(timerRef.current);
      if (isVideo && videoRef.current) videoRef.current.pause();
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    };
  }, [index, isVideo, onNext, paused, status.musicUrl, status.musicStartTime, status.musicDuration]);

  // ... [Rest of handlers unchanged] ...
  useEffect(() => { if (!isVideo || !videoRef.current) return; if (paused) { videoRef.current.pause(); } else { if (videoRef.current.paused) { const playPromise = videoRef.current.play(); if (playPromise !== undefined) { playPromise.catch((error) => { if (error.name !== "AbortError") console.log("Video play interrupted:", error); }); } } } }, [paused, isVideo]); 
  useEffect(() => { if (!socket || status.user._id !== userData._id) return; const handleStatusViewed = ({ statusId, viewers: updatedViewers }) => { if (statusId === status._id) setViewers(updatedViewers); }; const handleStatusLiked = ({ statusId, likes }) => { if (statusId === status._id) setLikesList(likes); }; const handleStatusUnliked = ({ statusId, likes }) => { if (statusId === status._id) setLikesList(likes); }; socket.on("statusViewed", handleStatusViewed); socket.on("statusLiked", handleStatusLiked); socket.on("statusUnliked", handleStatusUnliked); return () => { socket.off("statusViewed", handleStatusViewed); socket.off("statusLiked", handleStatusLiked); socket.off("statusUnliked", handleStatusUnliked); }; }, [socket, status, userData._id]);
  useEffect(() => { const handleClickOutside = (e) => { if(pickerRef.current && !pickerRef.current.contains(e.target)) { setShowEmojiPicker(false); } }; if(showEmojiPicker) { document.addEventListener('mousedown', handleClickOutside); } return () => document.removeEventListener('mousedown', handleClickOutside); }, [showEmojiPicker]);

  const handleDelete = async () => { if (!window.confirm("Are you sure you want to delete this status?")) return; try { await axios.delete(`${serverUrl}/api/status/${status._id}`, { withCredentials: true }); if (socket) socket.emit("statusDeleted", { statusId: status._id }); if (typeof onDelete === "function") onDelete(status._id); setMenuOpen(false); toast.success("Status deleted"); } catch (err) { console.error("Error deleting status:", err); toast.error("Failed to delete status"); } };
  const handleForward = async () => { try { for (let uid of selectedUsers) { await axios.post( `${serverUrl}/api/message/send/${uid}`, { message: status.text || status.caption || "Forwarded Status", mediaUrl: status.mediaUrl, isForwarded: true, statusReplyToId: status._id, statusReplyToUser: status.user._id, }, { withCredentials: true } ); } toast.success("Status forwarded!"); setForwardOpen(false); setPaused(false); setSelectedUsers([]); setMenuOpen(false); } catch (err) { console.error("Error forwarding status:", err); toast.error("Failed to forward"); } };
  const toggleUserSelection = (id) => { setSelectedUsers((prev) => prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id] ); };
  const onEmojiClick = (emojiData) => { setReplyText((prev) => prev + emojiData.emoji); };
  const handleSendReply = async (e) => { e.preventDefault(); if (!replyText.trim()) return; const receiverId = status.user._id; const isNewChat = !otherUsers.some(u => u._id === receiverId); try { const res = await axios.post( `${serverUrl}/api/message/send/${receiverId}`, { message: replyText.trim(), statusReplyToId: status._id, statusReplyToMediaUrl: status.mediaUrl, statusReplyToCaption: status.caption || status.text, statusReplyToUserName: status.user.name, }, { withCredentials: true } ); const newMessage = res.data; if (socket) { socket.emit("newMessage", { ...newMessage, isNewChat, statusReplyToId: status._id, statusReplyToMediaUrl: status.mediaUrl, statusReplyToCaption: status.caption || status.text, statusReplyToUserName: status.user.name, }); } setReplyText(""); setShowEmojiPicker(false); setPaused(false); toast.success("Reply sent to chat!"); } catch (err) { console.error("Error sending reply:", err); toast.error("Failed to send reply."); } };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-50"
      onClick={() => {
          if(menuOpen) { setMenuOpen(false); setPaused(false); }
      }}
    >
      {/* Progress Bars */}
      <div className="absolute top-4 left-0 right-0 flex gap-1 px-4 z-50">
        {statuses.map((_, i) => (
          <div key={i} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{
                width: i < index ? "100%" : i === index ? `${progress}%` : "0%",
                transition: i === index && !isVideo && !paused && !showViewers && !forwardOpen ? "width 0.1s linear" : "none",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 left-6 flex items-center gap-3 z-50">
        <img src={status.user.image || dp} alt={status.user.name} className="w-10 h-10 rounded-full object-cover" />
        <div className="flex flex-col">
          <p className="text-white font-semibold text-sm drop-shadow-md">{status.user.name}</p>
          <p className="text-gray-200 text-xs drop-shadow-md">{timeAgo(status.createdAt)}</p>
        </div>
      </div>

      {/* Top-right buttons */}
      <div className="absolute top-6 right-6 flex items-center gap-2 z-50">
        {status.user._id === userData._id && (
          <div className="relative z-50">
            <FiMoreVertical className="w-6 h-6 text-white cursor-pointer drop-shadow-md" onClick={(e) => { e.stopPropagation(); setMenuOpen((prev) => !prev); setPaused(true); }} />
            <AnimatePresence>
              {menuOpen && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute right-0 mt-2 w-32 bg-white rounded shadow-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { setForwardOpen(true); setMenuOpen(false); setPaused(true); }}>Forward</button>
                  <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500" onClick={handleDelete}>Delete</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <RxCross2 className="w-8 h-8 text-white cursor-pointer z-50 drop-shadow-md" onClick={(e) => { e.stopPropagation(); onClose(); }} />
      </div>

      {/* MAIN CONTENT DISPLAY */}
      <div className="flex-1 flex items-center justify-center w-full h-full relative z-0">
        {isTextStatus ? (
             // ✅ TEXT STATUS RENDER
             <div 
                className="w-full h-full flex items-center justify-center text-center p-6"
                style={{ backgroundColor: status.color || "#000000" }}
             >
                 <p className={`text-white text-3xl sm:text-4xl font-bold break-words whitespace-pre-wrap ${status.font || 'font-sans'}`}>
                    {status.text}
                 </p>
             </div>
        ) : isVideo ? (
          <video
            ref={videoRef}
            src={status.mediaUrl}
            autoPlay={!paused}
            controls={false} // Hide controls for status look
            className="max-w-full max-h-[80vh] object-contain"
            muted={status.isMuted}
            onLoadStart={(e) => e.target.pause()} 
            onCanPlay={() => { if (!paused && videoRef.current && videoRef.current.paused) videoRef.current.play().catch(e => { if (e.name !== "AbortError") console.log("Video play error:", e); }); }}
            onError={() => toast.error("Video unavailable")}
          />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
             <img src={status.mediaUrl} alt="status" className="max-w-full max-h-[90vh] object-contain" onError={() => toast.error("Image unavailable")} />
             {status.musicUrl && (
                <div className="absolute top-20 right-4 bg-black/50 p-2 rounded-full animate-pulse z-20">
                    <BsMusicNoteBeamed className="text-white text-xl" />
                </div>
             )}
          </div>
        )}
        
        {status.musicUrl && !isVideo && (
            <audio ref={audioRef} src={status.musicUrl} loop />
        )}

        {/* Navigation Overlays */}
        {!paused && (
          <div className="absolute inset-0 flex z-10">
            <div className="flex-1" onClick={(e) => { e.stopPropagation(); onPrev(); }} />
            <div className="flex-1" onClick={(e) => { e.stopPropagation(); index + 1 < statuses.length ? onNext() : onClose(); }} />
          </div>
        )}
      </div>

      {/* ... [Viewer Button, Caption, Reply Bar - Unchanged] ... */}
      {status.user._id === userData._id && ( <button onClick={(e) => { e.stopPropagation(); setShowViewers(true); setPaused(true); }} className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded flex items-center gap-1 text-sm viewer-modal z-50"> 👁 {viewers.length} Views </button> )}
      {status.caption && !isTextStatus && ( <div className="absolute bottom-12 left-0 right-0 px-6 text-center z-40 bg-gradient-to-t from-black/80 to-transparent pt-10 pb-4"> <p className="text-white text-base font-medium">{status.caption}</p> </div> )}
      {status.user._id !== userData._id && ( <div className="absolute bottom-4 left-0 right-0 flex justify-center px-4 z-50"> <form onSubmit={handleSendReply} className="w-full md:max-w-[500px] flex items-center gap-2 relative"> {showEmojiPicker && ( <div ref={pickerRef} className="absolute bottom-12 left-0 z-50"> <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" height={350} /> </div> )} <div className="flex-1 relative"> <BsEmojiSmile className="absolute left-3 top-1/2 -translate-y-1/2 text-white/80 cursor-pointer hover:text-white" size={20} onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); setPaused(true); }} /> <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} onFocus={(e) => { e.stopPropagation(); setPaused(true); setShowEmojiPicker(false); }} placeholder={`Reply to ${status.user.name}'s status...`} className="w-full py-2 pl-10 pr-4 bg-white/20 text-white rounded-full border-2 border-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-white/70 shadow-lg" onClick={(e) => e.stopPropagation()} /> </div> <button type="button" onClick={(e) => { e.stopPropagation(); toggleLike(); }} className="p-3 rounded-full text-white transition-transform active:scale-95 hover:bg-white/10" > {isLiked ? ( <FaHeart className="text-red-500 text-2xl animate-pop" /> ) : ( <FaRegHeart className="text-white text-2xl hover:text-red-400" /> )} </button> {replyText.trim() && ( <button type="submit" className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors shadow-lg"> <IoSend className="text-xl" /> </button> )} </form> </div> )}
      {/* ... [Viewer List Modal, Forward Modal - Unchanged] ... */}
      {showViewers && ( <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-[100]" onClick={() => { setShowViewers(false); setPaused(false); }}> <div className="bg-white rounded-lg p-4 w-80 max-h-[80vh] overflow-y-auto viewer-modal" onClick={(e) => e.stopPropagation()}> <div className="flex justify-between items-center mb-3"> <h2 className="text-lg font-semibold">Viewers</h2> <RxCross2 className="w-6 h-6 cursor-pointer" onClick={() => { setShowViewers(false); setPaused(false); }} /> </div> {viewers.length > 0 ? ( viewers.map((viewer) => { const viewerLiked = likesList.some(like => (like.user?._id === viewer._id) || (like.user === viewer._id) ); return ( <div key={viewer._id} className="flex items-center justify-between gap-3 p-2 border-b border-gray-200"> <div className="flex items-center gap-3"> <img src={viewer.image || dp} alt={viewer.name} className="w-10 h-10 rounded-full object-cover" /> <div> <p className="font-medium text-sm">{viewer.name}</p> <p className="text-xs text-gray-500">{timeAgo(viewer.viewedAt)}</p> </div> </div> {viewerLiked && <FaHeart className="text-red-500" />} </div> ); }) ) : ( <p className="text-gray-500 text-sm">No views yet</p> )} </div> </div> )}
      {forwardOpen && ( <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[100] forward-modal" onClick={() => { setForwardOpen(false); setPaused(false); }}> <motion.div className="bg-white rounded-lg p-4 w-80 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}> <h2 className="text-lg font-semibold mb-2">Forward to</h2> <div className="flex flex-col gap-2 mb-2"> {otherUsers.map((user) => ( <label key={user._id} className="flex items-center gap-2"> <input type="checkbox" checked={selectedUsers.includes(user._id)} onChange={() => toggleUserSelection(user._id)} /> <img src={user.image || dp} alt={user.name} className="w-8 h-8 rounded-full object-cover" /> <span>{user.name}</span> </label> ))} </div> <button onClick={handleForward} className="bg-blue-500 text-white px-4 py-2 rounded w-full">Send</button> </motion.div> </div> )}
      
      <style>{`
        @keyframes pop { 0% { transform: scale(1); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }
        .animate-pop { animation: pop 0.2s ease-in-out; }
      `}</style>
    </div>
  );
}

export default StatusViewer;