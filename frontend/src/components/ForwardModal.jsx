import React, { useEffect, useState } from "react";
import axios from "axios";
import { serverUrl } from "../main.jsx";
import dp from "../assets/dp.webp";
import { RxCross2 } from "react-icons/rx";
import { IoSend } from "react-icons/io5";

export default function ForwardModal({ open, onClose, messageId, socket }) {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) fetchUsers();
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
    if (selectedUsers.length === 0) return;
    setLoading(true);

    try {
      for (let u of selectedUsers) {
        const res = await axios.post(
          `${serverUrl}/api/message/forward/${u._id}`,
          { messageId },
          { withCredentials: true }
        );
        if (socket) {
          socket.emit("new message", res.data);
        }
      }
      onClose();
      setSelectedUsers([]);
    } catch (err) {
      console.error("Error forwarding message:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg w-96 max-h-[80vh] flex flex-col shadow-lg">
        {/* Header */}
        <div className="flex justify-between items-center border-b p-3">
          <h2 className="text-lg font-semibold">Forward Message</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <RxCross2 size={20} />
          </button>
        </div>

        {/* ✅ Selected users avatar strip */}
        {selectedUsers.length > 0 && (
          <div className="flex gap-3 p-2 border-b bg-gray-50 overflow-x-auto no-scrollbar">
            {selectedUsers.map((u) => (
              <div key={u._id} className="relative flex-shrink-0">
                <img
                  src={u.image || dp}
                  alt={u.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-green-500"
                />
                <button
                  onClick={() => removeSelectedUser(u._id)}
                  className="absolute -top-1 -right-1 bg-white rounded-full shadow p-[2px] hover:bg-gray-200"
                >
                  <RxCross2 size={14} className="text-red-600" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* User list */}
        <div className="flex-1 overflow-y-auto p-3">
          {users.length === 0 ? (
            <p className="text-sm text-gray-500">No users available</p>
          ) : (
            <ul>
              {users.map((u) => {
                const isSelected = selectedUsers.some((sel) => sel._id === u._id);
                return (
                  <li
                    key={u._id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer"
                    onClick={() => toggleSelectUser(u)}
                  >
                    <div className="relative w-10 h-10">
                      <img
                        src={u.image || dp}
                        alt={u.name}
                        className={`w-10 h-10 rounded-full object-cover ${
                          isSelected ? "opacity-60" : ""
                        }`}
                      />
                      {isSelected && (
                        <span className="absolute inset-0 flex items-center justify-center text-green-600 bg-white bg-opacity-70 rounded-full">
                          ✓
                        </span>
                      )}
                    </div>
                    <span className="text-gray-800">{u.name}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer with send button */}
        {selectedUsers.length > 0 && (
          <div className="border-t p-3 flex justify-end">
            <button
              onClick={handleForward}
              disabled={loading}
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 disabled:opacity-50"
            >
              <IoSend size={18} />
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
