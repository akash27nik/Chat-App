import React, { useState } from "react";
import { FiX } from "react-icons/fi";

export default function ChatInput({ onSend, replyMessage, clearReply }) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text, replyMessage);
    setText("");
    clearReply();
  };

  return (
    <div className="p-2 bg-gray-100">
      {/* Reply Preview */}
      {replyMessage && (
        <div className="bg-white px-3 py-2 rounded-l-lg border-l-4 border-green-500 flex justify-between items-center mb-1 shadow-sm">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">Replying to:</span>
            <span className="text-sm font-medium truncate max-w-xs">
              {replyMessage.text || "Media"}
            </span>
          </div>
          <button
            onClick={clearReply}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <FiX size={18} />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none"
          placeholder="Type a message..."
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          Send
        </button>
      </div>
    </div>
  );
}
