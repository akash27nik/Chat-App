import React, { useEffect, useState } from "react";
import axios from "axios";
import { serverUrl } from "../main.jsx";
import dp from "../assets/dp.webp";
import { RxCross2 } from "react-icons/rx";
import { IoSend } from "react-icons/io5";
import { IoIosAperture } from "react-icons/io";

// ✅ Updated to accept 'messages' (array) for bulk forwarding
export default function ForwardModal({ open, onClose, message, messages, socket }) {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchUsers();
      setSelectedUsers([]); // Reset selection on open
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/user`, {
        withCredentials: true,
      });
      setUsers(res.data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const toggleSelectUser = (user) => {
    if (selectedUsers.find((u) => u._id === user._id)) {
      setSelectedUsers(selectedUsers.filter((u) => u._id !== user._id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const removeSelectedUser = (userId) => {
    setSelectedUsers(selectedUsers.filter((u) => u._id !== userId));
  };

  const handleForward = async () => {
    // Determine which messages to send (Bulk array or Single object)
    const msgsToForward = messages && messages.length > 0 
        ? messages 
        : (message ? [message] : []);

    if (selectedUsers.length === 0 || msgsToForward.length === 0) return;
    
    setLoading(true);

    try {
      // Loop through selected users
      for (let u of selectedUsers) {
        // Loop through all selected messages
        for (let msg of msgsToForward) {
             const res = await axios.post(
              `${serverUrl}/api/message/forward/${u._id}`,
              { 
                messageId: msg._id,
                message: msg.message, // Sending content incase backend needs it
                image: msg.image
              },
              { withCredentials: true }
            );
            
            if (socket) {
              socket.emit("newMessage", res.data);
            }
        }
      }
      onClose();
      setSelectedUsers([]);
    } catch (err) {
      console.error("Error forwarding message:", err);
      if(err.response && err.response.status === 404) {
          alert("Error: Backend route '/api/message/forward/:id' is missing.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  // Helper to determine what to show in preview
  const isBulk = messages && messages.length > 1;
  const singleMsg = messages && messages.length === 1 ? messages[0] : message;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-[100]">
      <div className="bg-white rounded-xl w-96 max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Forward to...</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 transition"
          >
            <RxCross2 size={22} className="text-gray-600" />
          </button>
        </div>

        {/* ✅ Message Preview Area */}
        <div className="m-3 p-2 bg-gray-100 rounded-lg border-l-4 border-teal-500 flex flex-col gap-1 shadow-inner">
             <span className="text-xs font-bold text-teal-600">Forwarding</span>
             
             {isBulk ? (
                 // Bulk Preview
                 <div className="flex items-center gap-3 py-2">
                    <div className="w-10 h-10 bg-teal-600 text-white flex items-center justify-center rounded font-bold">
                        {messages.length}
                    </div>
                    <p className="text-sm text-gray-700">
                       {messages.length} messages selected
                    </p>
                 </div>
             ) : singleMsg ? (
                 // Single Message Preview
                 <div className="flex items-center gap-3">
                    {/* Media Preview */}
                    {singleMsg.image ? (
                       <img src={singleMsg.image} alt="preview" className="w-10 h-10 object-cover rounded bg-gray-300" />
                    ) : singleMsg.video ? (
                       <div className="w-10 h-10 bg-black flex items-center justify-center rounded text-white text-xs">Video</div>
                    ) : null}
                    
                    {/* Text Preview */}
                    <p className="text-sm text-gray-700 line-clamp-2">
                       {singleMsg.message || (singleMsg.image ? "📷 Photo" : singleMsg.video ? "🎥 Video" : "Media")}
                    </p>
                 </div>
             ) : null}
        </div>

        {/* Selected Users Strip */}
        {selectedUsers.length > 0 && (
          <div className="flex gap-3 px-4 py-2 border-b bg-white overflow-x-auto no-scrollbar items-center">
            {selectedUsers.map((u) => (
              <div key={u._id} className="relative flex-shrink-0 flex flex-col items-center w-12 animate-fadeIn">
                <div className="relative">
                    <img
                    src={u.image || dp}
                    alt={u.name}
                    className="w-10 h-10 rounded-full object-cover border border-gray-300"
                    />
                    <button
                    onClick={() => removeSelectedUser(u._id)}
                    className="absolute -top-1 -right-1 bg-gray-500 text-white rounded-full p-[2px] hover:bg-red-600 transition"
                    >
                    <RxCross2 size={10} />
                    </button>
                </div>
                <span className="text-[10px] text-gray-600 truncate w-full text-center mt-1">
                    {u.name.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* User list */}
        <div className="flex-1 overflow-y-auto p-2">
          <p className="px-2 text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Recent Chats</p>
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-20 text-gray-500">
               <p className="text-sm">No users found</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {users.map((u) => {
                const isSelected = selectedUsers.some((sel) => sel._id === u._id);
                return (
                  <li
                    key={u._id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                       isSelected ? "bg-teal-50" : "hover:bg-gray-100"
                    }`}
                    onClick={() => toggleSelectUser(u)}
                  >
                    <div className="relative w-10 h-10">
                      <img
                        src={u.image || dp}
                        alt={u.name}
                        className={`w-10 h-10 rounded-full object-cover border border-gray-100 transition-opacity ${
                          isSelected ? "opacity-100" : ""
                        }`}
                      />
                      {isSelected && (
                        <div className="absolute -bottom-1 -right-1 bg-teal-500 text-white rounded-full p-[2px] border-2 border-white">
                           <BsCheck2 size={12} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col flex-1">
                        <span className={`text-sm ${isSelected ? "font-semibold text-teal-800" : "text-gray-800"}`}>
                            {u.name}
                        </span>
                        <span className="text-xs text-gray-500 truncate">
                            {u.about || "Available"} 
                        </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer with send button */}
        {selectedUsers.length > 0 && (
          <div className="p-3 bg-white border-t flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <span className="text-xs text-gray-500 ml-2">
                {selectedUsers.length} selected
            </span>
            <button
              onClick={handleForward}
              disabled={loading}
              className="flex items-center gap-2 bg-[#1a7fa0] text-white px-5 py-2.5 rounded-full hover:bg-[#156b85] disabled:opacity-70 transition-all shadow-md active:scale-95"
            >
              <span className="text-sm font-medium">{loading ? "Sending..." : "Send"}</span>
              <IoSend size={16} />
            </button>
          </div>
        )}
      </div>
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
            animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// Helper icon since I used it above
const BsCheck2 = ({size}) => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 16 16" height={size} width={size} xmlns="http://www.w3.org/2000/svg">
        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"></path>
    </svg>
);