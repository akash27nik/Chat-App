import React, { useEffect, useState, useRef } from "react";
import { RxCross2 } from "react-icons/rx";
import { FiMoreVertical } from "react-icons/fi";
import { useSelector } from "react-redux";
import axios from "axios";
import { serverUrl } from "../main.jsx";
import dp from "../assets/dp.webp";
import { motion, AnimatePresence } from "framer-motion";

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
  const videoRef = useRef(null);
  const timerRef = useRef(null);

  if (!statuses || statuses.length === 0 || !statuses[index]) return null;
  const status = statuses[index];
  const isVideo = status.mediaUrl?.match(/\.(mp4|webm|ogg)$/i);

  // ─── FETCH INITIAL VIEWERS (OWNER ONLY) ───
  useEffect(() => {
    if (status.user._id === userData._id) {
      axios
        .get(`${serverUrl}/api/status/${status._id}/viewers`, { withCredentials: true })
        .then((res) => setViewers(res.data || []))
        .catch((err) => {
          if (err.response?.status === 404) {
            console.warn("Status not found, closing viewer...");
            onClose();
          } else {
            console.error("Error fetching viewers:", err);
          }
        });
    }
  }, [status, userData._id, onClose]);

  // ─── MARK STATUS VIEWED (NON-OWNER) ───
  useEffect(() => {
    if (status.user._id !== userData._id) {
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
          console.error("Error marking status viewed:", err);
        }
      };
      markViewed();
    }
  }, [index, status, userData._id, socket]);

  // ─── AUTO PROGRESS ───
  useEffect(() => {
    clearInterval(timerRef.current);
    if (paused) return;

    if (isVideo) {
      if (videoRef.current) {
        videoRef.current.onended = () => onNext();
      }
    } else {
      const duration = 5000;
      const step = 100 / (duration / 100);
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

    return () => clearInterval(timerRef.current);
  }, [index, isVideo, onNext, paused]);

  // ─── SOCKET: STATUS VIEWED (OWNER ONLY) ───
  useEffect(() => {
    if (!socket || status.user._id !== userData._id) return;

    const handleStatusViewed = ({ statusId, viewers: updatedViewers }) => {
      if (statusId === status._id) setViewers(updatedViewers);
    };

    socket.on("statusViewed", handleStatusViewed);
    return () => socket.off("statusViewed", handleStatusViewed);
  }, [socket, status, userData._id]);

  // ─── DELETE STATUS ───
  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this status?")) return;

    try {
      await axios.delete(`${serverUrl}/api/status/${status._id}`, {
        withCredentials: true,
      });

      if (socket) {
        socket.emit("statusDeleted", { statusId: status._id });
      }

      if (typeof onDelete === "function") {
        onDelete(status._id);
      }

      onClose(); 
    } catch (err) {
      console.error("Error deleting status:", err);
      alert("Failed to delete status");
    }
  };

  // ─── FORWARD STATUS ───
  const handleForward = async () => {
    try {
      for (let uid of selectedUsers) {
        await axios.post(
          `${serverUrl}/api/message/send/${uid}`,
          {
            message: status.caption || "",
            mediaUrl: status.mediaUrl,
            isForwarded: true,
          },
          { withCredentials: true }
        );
      }

      alert("Status forwarded!");
      setForwardOpen(false);
      setPaused(false);
      setSelectedUsers([]);
    } catch (err) {
      console.error("Error forwarding status:", err);
      alert("Failed to forward");
    }
  };

  const toggleUserSelection = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-50">
      {/* Progress Bars */}
      <div className="absolute top-4 left-0 right-0 flex gap-1 px-4">
        {statuses.map((_, i) => (
          <div key={i} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{
                width: i < index ? "100%" : i === index ? `${progress}%` : "0%",
                transition: i === index && !isVideo && !paused ? "width 0.1s linear" : "none",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header with profile + name */}
      <div className="absolute top-6 left-6 flex items-center gap-3 z-50">
        <img
          src={status.user.image || dp}
          alt={status.user.name}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <p className="text-white font-semibold text-sm">{status.user.name}</p>
          <p className="text-gray-300 text-xs">{timeAgo(status.createdAt)}</p>
        </div>
      </div>

      {/* Top-right buttons */}
      <div className="absolute top-6 right-6 flex items-center gap-2 z-50">
        {status.user._id === userData._id && (
          <div className="relative z-50">
            <FiMoreVertical
              className="w-6 h-6 text-white cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((prev) => !prev);
                setPaused(true);
              }}
            />
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-32 bg-white rounded shadow-lg overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                    onClick={() => {
                      setForwardOpen(true);
                      setMenuOpen(false);
                      setPaused(true);
                    }}
                  >
                    Forward
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500"
                    onClick={handleDelete}
                  >
                    Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <RxCross2
          className="w-8 h-8 text-white cursor-pointer z-50"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        />
      </div>

      {/* Media with tap zones */}
      <div className="flex-1 flex items-center justify-center w-full relative z-0 px-2">
        {isVideo ? (
          <video
            ref={videoRef}
            src={status.mediaUrl}
            autoPlay
            controls
            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg"
          />
        ) : (
          <img
            src={status.mediaUrl}
            alt="status"
            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg"
          />
        )}

        {/* Tap zones */}
        <div className="absolute inset-0 flex">
          <div
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
          />
          <div
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              index + 1 < statuses.length ? onNext() : onClose();
            }}
          />
        </div>
      </div>

      {/* 👁 Viewer button fixed position */}
      {status.user._id === userData._id && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowViewers(true);
            setPaused(true);
          }}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded flex items-center gap-1 text-sm viewer-modal"
        >
          👁 {viewers.length} Views
        </button>
      )}

      {/* Caption at bottom */}
      {status.caption && (
        <div className="absolute bottom-8 left-0 right-0 px-6 text-center">
          <p className="text-white text-sm">{status.caption}</p>
        </div>
      )}

      {/* Viewer Modal */}
      {showViewers && (
        <div
          className="fixed inset-0 bg-black/70 flex justify-center items-center z-50"
          onClick={() => {
            setShowViewers(false);
            setPaused(false);
          }}
        >
          <div
            className="bg-white rounded-lg p-4 w-80 max-h-[80vh] overflow-y-auto viewer-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">Viewers</h2>
              <RxCross2
                className="w-6 h-6 cursor-pointer"
                onClick={() => {
                  setShowViewers(false);
                  setPaused(false);
                }}
              />
            </div>
            {viewers.length > 0 ? (
              viewers.map((viewer) => (
                <div
                  key={viewer._id}
                  className="flex items-center justify-between gap-3 p-2 border-b border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={viewer.image || dp}
                      alt={viewer.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <p className="font-medium">{viewer.name}</p>
                  </div>
                  <p className="text-xs text-gray-500">{timeAgo(viewer.viewedAt)}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No views yet</p>
            )}
          </div>
        </div>
      )}

      {/* Forward Modal */}
      {forwardOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 forward-modal"
          onClick={() => {
            setForwardOpen(false);
            setPaused(false);
          }}
        >
          <motion.div
            className="bg-white rounded-lg p-4 w-80 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-2">Forward to</h2>
            <div className="flex flex-col gap-2 mb-2">
              {otherUsers.map((user) => (
                <label key={user._id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user._id)}
                    onChange={() => toggleUserSelection(user._id)}
                  />
                  <img
                    src={user.image || dp}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span>{user.name}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleForward}
              className="bg-blue-500 text-white px-4 py-2 rounded w-full"
            >
              Send
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default StatusViewer;
