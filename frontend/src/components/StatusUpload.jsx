// StatusUpload.jsx
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { serverUrl } from "../main.jsx";
import { useSelector } from "react-redux";
import { RxCross2 } from "react-icons/rx";
import { BsEmojiSmile } from "react-icons/bs";
import EmojiPicker from "emoji-picker-react";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import MediaEditor from "./MediaEditor"; // MediaEditor modal

function StatusUpload({ onClose }) {
  const { userData } = useSelector((state) => state.user);
  const [file, setFile] = useState(null);
  const [editedFile, setEditedFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState("bottom");
  const [showEditor, setShowEditor] = useState(false);
  const inputWrapperRef = useRef(null);
  const pickerRef = useRef(null);

  // Open MediaEditor immediately after file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setShowEditor(true);
  };

  const handleEmojiClick = (emojiData) => {
    setCaption((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const toggleEmojiPicker = () => {
    if (inputWrapperRef.current) {
      const rect = inputWrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setPickerPosition(spaceBelow < 350 ? "top" : "bottom");
    }
    setShowEmojiPicker((prev) => !prev);
  };

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target) &&
        !inputWrapperRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setShowEmojiPicker(false);
        onClose && onClose();
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Handle saving from MediaEditor
  const handleEditorSave = ({ file: newFile, caption: editedCaption }) => {
    setEditedFile(newFile);
    if (editedCaption) setCaption(editedCaption);
    setShowEditor(false);
  };

  // Upload the edited or original file
  const handleSubmit = async () => {
    if (!editedFile && !file) {
      alert("Please select an image or video");
      return;
    }

    const formData = new FormData();
    formData.append("media", editedFile || file);
    formData.append("caption", caption);

    try {
      setLoading(true);
      const res = await axios.post(`${serverUrl}/api/status`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data) onClose();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Error uploading status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* MediaEditor modal */}
      {showEditor && file && (
        <MediaEditor
          file={file}
          onCancel={() => setShowEditor(false)}
          onSave={handleEditorSave}
        />
      )}

      {/* StatusUpload modal */}
      <div className={`fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 ${showEditor ? "pointer-events-none" : ""}`}>
        <div className="bg-white rounded-xl p-6 w-[350px] relative">
          <RxCross2
            className="absolute top-3 right-3 w-6 h-6 cursor-pointer text-gray-700"
            onClick={onClose}
          />
          <h2 className="text-lg font-semibold mb-4">Add Status</h2>

          {/* File Input */}
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="mb-3 w-full"
            disabled={loading}
          />

          {/* Preview */}
          {(editedFile || file) && (
            <div className="mb-3">
              {(editedFile || file).type.startsWith("image") ? (
                <img
                  src={URL.createObjectURL(editedFile || file)}
                  alt="preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
              ) : (
                <video
                  src={URL.createObjectURL(editedFile || file)}
                  controls
                  className="w-full h-48 rounded-lg"
                />
              )}
              <p className="text-xs text-gray-500 mt-1">
                {(editedFile || file).type.startsWith("image") ? "Image" : "Video"}
              </p>
            </div>
          )}

          {/* Caption input */}
          <div className="relative mb-4" ref={inputWrapperRef}>
            <BsEmojiSmile
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
              onClick={toggleEmojiPicker}
            />
            <input
              type="text"
              placeholder="Add a caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="border border-gray-300 rounded-lg w-full pl-10 p-2"
              disabled={loading}
            />
            {showEmojiPicker && (
              <div
                ref={pickerRef}
                className={`absolute z-50 ${pickerPosition === "top" ? "bottom-12" : "top-12"} left-0`}
              >
                <EmojiPicker onEmojiClick={handleEmojiClick} />
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#20c7ff] text-white py-2 rounded-lg shadow-md hover:bg-[#1aaad9] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <AiOutlineLoading3Quarters className="animate-spin" size={20} />
                Uploading...
              </>
            ) : (
              "Upload"
            )}
          </button>
        </div>
      </div>
    </>
  );
}

export default StatusUpload;
