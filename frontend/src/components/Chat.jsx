import React, { useState } from "react";
import SenderMessage from "./SenderMessage";
import ChatInput from "./ChatInput";

export default function Chat({ messages, socket, userId }) {
  const [replyMessage, setReplyMessage] = useState(null);

  const handleSend = (text, replyToMessage) => {
    socket.emit("newMessage", {
      senderId: userId,
      receiverId: "receiverId_here",
      message: text,
      replyTo: replyToMessage?._id || null,
    });
  };

  const clearReply = () => setReplyMessage(null);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {messages.map((msg) => (
          <SenderMessage
            key={msg._id}
            {...msg}
            replyToMessage={msg.replyTo ? messages.find(m => m._id === msg.replyTo) : null}
            onSelectForActions={({ reply }) => {
              if (reply) setReplyMessage(msg);
            }}
            socket={socket}
          />
        ))}
      </div>
      <ChatInput
        onSend={handleSend}
        replyMessage={replyMessage}
        clearReply={clearReply}
      />
    </div>
  );
}
