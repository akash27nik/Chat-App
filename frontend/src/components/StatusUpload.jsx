import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { serverUrl } from "../main.jsx";
import { useSelector } from "react-redux";
import { RxCross2 } from "react-icons/rx";
import { 
  BsEmojiSmile, 
  BsMusicNoteBeamed, 
  BsSearch, 
  BsPlayFill, 
  BsPauseFill, 
  BsCloudArrowUp,
  BsCrop,
  BsVolumeUpFill, 
  BsVolumeMuteFill,
  BsPlayCircleFill,
  BsType,       
  BsPalette     
} from "react-icons/bs";
import { IoMdSend } from "react-icons/io";
import { FaPhotoVideo, FaPen } from "react-icons/fa"; 
import EmojiPicker from "emoji-picker-react";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import MediaEditor from "./MediaEditor";

// Background Colors for Text Status
const BG_COLORS = [
  "#e91e63", "#9c27b0", "#673ab7", "#3f51b5", "#2196f3", "#00bcd4", 
  "#009688", "#4caf50", "#8bc34a", "#cddc39", "#ffeb3b", "#ffc107", 
  "#ff9800", "#ff5722", "#795548", "#607d8b", "#000000"
];

const FONTS = [ "font-sans", "font-serif", "font-mono", "font-[cursive]", "font-[fantasy]" ];

// ... [Music Library same as before] ...
const FULL_LENGTH_MUSIC_LIBRARY = [
  { trackId: "lib-1", trackName: "Summer Breeze", artistName: "Sunny Days", artworkUrl60: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=60&h=60&fit=crop", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { trackId: "lib-2", trackName: "Electronic Future", artistName: "Tech Vibes", artworkUrl60: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=60&h=60&fit=crop", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
  { trackId: "lib-3", trackName: "Piano Dreams", artistName: "Calm Keys", artworkUrl60: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=60&h=60&fit=crop", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
];

function StatusUpload({ onClose, onUploadStart, onUploadEnd }) { // ✅ Accept Props
  const { userData } = useSelector((state) => state.user);
  const [file, setFile] = useState(null);
  const [editedFile, setEditedFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const [mode, setMode] = useState("media"); 
  const [textContent, setTextContent] = useState("");
  const [bgColorIndex, setBgColorIndex] = useState(0);
  const [fontIndex, setFontIndex] = useState(0);

  const [showMusicModal, setShowMusicModal] = useState(false);
  const [activeTab, setActiveTab] = useState("library");
  const [musicSearchQuery, setMusicSearchQuery] = useState("");
  const [musicResults, setMusicResults] = useState([]);
  const [isSearchingMusic, setIsSearchingMusic] = useState(false);
  const [playingPreview, setPlayingPreview] = useState(null);
  
  const [selectedMusicFile, setSelectedMusicFile] = useState(null);
  const [selectedMusicData, setSelectedMusicData] = useState(null); 
  
  const [musicTotalDuration, setMusicTotalDuration] = useState(0); 
  const [startTime, setStartTime] = useState(0);
  const [isPlayingSelection, setIsPlayingSelection] = useState(false);
  const [statusDuration, setStatusDuration] = useState(15); 
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);

  const pickerRef = useRef(null);
  const musicInputRef = useRef(null);
  const audioPreviewRef = useRef(new Audio());
  const hiddenAudioRef = useRef(new Audio()); 
  const playTimeoutRef = useRef(null);
  const videoPreviewRef = useRef(null);

  // ... [Keep helper functions unchanged] ...
  const formatTime = (time) => { if (!time && time !== 0) return "0:00"; const min = Math.floor(time / 60); const sec = Math.floor(time % 60); return `${min}:${sec < 10 ? "0" : ""}${sec}`; };
  const toggleMainPlayback = () => { if (!videoPreviewRef.current) return; if (videoPreviewRef.current.paused) { videoPreviewRef.current.play(); setIsVideoPlaying(true); if (selectedMusicData && hiddenAudioRef.current) { hiddenAudioRef.current.currentTime = startTime; hiddenAudioRef.current.play(); } } else { videoPreviewRef.current.pause(); setIsVideoPlaying(false); if (selectedMusicData && hiddenAudioRef.current) { hiddenAudioRef.current.pause(); setIsPlayingSelection(false); if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current); } } };
  const searchMusic = async (e) => { e.preventDefault(); if (!musicSearchQuery.trim()) return; setIsSearchingMusic(true); setPlayingPreview(null); audioPreviewRef.current.pause(); try { const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(musicSearchQuery)}&media=music&entity=song&limit=15`); const data = await res.json(); setMusicResults(data.results); } catch (error) { console.error("Music search error:", error); } finally { setIsSearchingMusic(false); } };
  const handlePreviewPlay = (url) => { if (playingPreview === url) { audioPreviewRef.current.pause(); setPlayingPreview(null); } else { audioPreviewRef.current.src = url; audioPreviewRef.current.play(); setPlayingPreview(url); } };
  const handleSelectMusicFromApi = (track) => { const data = { name: `${track.trackName} - ${track.artistName}`, url: track.previewUrl }; setSelectedMusicData(data); setSelectedMusicFile(null); setShowMusicModal(false); audioPreviewRef.current.pause(); setPlayingPreview(null); hiddenAudioRef.current.src = track.previewUrl; setStartTime(0); };
  const handleMusicFileChange = (e) => { const file = e.target.files[0]; if (file) { setSelectedMusicFile(file); setSelectedMusicData({ name: file.name, url: URL.createObjectURL(file) }); setShowMusicModal(false); hiddenAudioRef.current.src = URL.createObjectURL(file); setStartTime(0); } };
  useEffect(() => { const audio = hiddenAudioRef.current; const onLoadedMetadata = () => { if(audio.duration !== Infinity && !isNaN(audio.duration)) { setMusicTotalDuration(audio.duration); } else { audio.currentTime = 10000; setTimeout(() => { audio.currentTime = 0; if(audio.duration !== Infinity) setMusicTotalDuration(audio.duration); else setMusicTotalDuration(300); }, 500); } }; audio.addEventListener("loadedmetadata", onLoadedMetadata); audio.load(); return () => { audio.removeEventListener("loadedmetadata", onLoadedMetadata); if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current); }; }, [selectedMusicData]);
  const toggleDuration = () => { if (statusDuration === 15) setStatusDuration(30); else if (statusDuration === 30) setStatusDuration(60); else setStatusDuration(15); };
  const toggleSelectionPlay = () => { if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current); if (isPlayingSelection) { hiddenAudioRef.current.pause(); setIsPlayingSelection(false); } else { hiddenAudioRef.current.currentTime = startTime; hiddenAudioRef.current.play(); setIsPlayingSelection(true); playTimeoutRef.current = setTimeout(() => { hiddenAudioRef.current.pause(); setIsPlayingSelection(false); }, statusDuration * 1000); } };
  const handleStartTimeChange = (e) => { let val = Number(e.target.value); setStartTime(val); if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current); hiddenAudioRef.current.currentTime = val; if (hiddenAudioRef.current.paused) { hiddenAudioRef.current.play(); setIsPlayingSelection(true); } playTimeoutRef.current = setTimeout(() => { hiddenAudioRef.current.pause(); setIsPlayingSelection(false); }, statusDuration * 1000); };
  const cycleColor = () => setBgColorIndex((prev) => (prev + 1) % BG_COLORS.length);
  const cycleFont = () => setFontIndex((prev) => (prev + 1) % FONTS.length);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setMode("media"); 
    setIsMuted(false); 
    setIsVideoPlaying(true);
  };

  const handleSubmit = async () => {
    if (mode === "media" && !file && !editedFile) return;
    if (mode === "text" && !textContent.trim()) return;

    const formData = new FormData();
    if (mode === "media") {
        formData.append("type", "media");
        formData.append("media", editedFile || file);
        formData.append("caption", caption);
        formData.append("musicStartTime", startTime);
        formData.append("musicDuration", statusDuration);
        formData.append("isMuted", isMuted);
        if (selectedMusicFile) formData.append("music", selectedMusicFile);
        else if (selectedMusicData?.url) formData.append("musicUrl", selectedMusicData.url);
    } else {
        formData.append("type", "text");
        formData.append("text", textContent);
        formData.append("color", BG_COLORS[bgColorIndex]);
        formData.append("font", FONTS[fontIndex]);
    }

    try {
      setLoading(true);
      if (onUploadStart) onUploadStart(); // ✅ Trigger Start

      const res = await axios.post(`${serverUrl}/api/status`, formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      if (res.data) {
          onClose();
          // We intentionally do NOT call onUploadEnd here because onClose unmounts this component.
          // The parent (Sidebar) will handle setting upload to false when it receives the socket event or manual timeout if desired,
          // BUT simpler approach: Call it here before closing? No, Sidebar controls this.
          // Correct way: We tell Sidebar "I started". Sidebar shows spinner.
          // When done, we tell Sidebar "I finished".
          if (onUploadEnd) onUploadEnd(); 
      }
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Error uploading status");
      if (onUploadEnd) onUploadEnd(); // ✅ Trigger End on error
    } finally {
      setLoading(false);
    }
  };

  const handleEmojiClick = (emojiData) => {
    if (mode === "media") setCaption((prev) => prev + emojiData.emoji);
    else setTextContent((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEditorSave = ({ file: newFile, caption: editedCaption }) => {
    setEditedFile(newFile);
    if (editedCaption) setCaption(editedCaption);
    setShowEditor(false);
  };

  const isImage = (editedFile || file)?.type.startsWith("image");

  if (!file && mode === "media") {
      return (
        <div className="fixed inset-0 bg-black z-[9999] flex flex-col animate-fade-in">
            {/* ... [Selector Screen same as before] ... */}
             <div className="flex justify-between items-center p-4"> <RxCross2 className="text-white w-8 h-8 cursor-pointer" onClick={onClose} /> <h2 className="text-white font-semibold text-lg">New Status</h2> <div className="w-8"></div> </div> <div className="flex-1 flex flex-col items-center justify-center gap-6 relative"> <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center animate-bounce-slow"> <FaPhotoVideo className="text-gray-400 text-4xl" /> </div> <div className="text-center"> <p className="text-white text-xl font-bold mb-2">Add to your status</p> <p className="text-gray-400 text-sm">Share photos, videos, or text</p> </div> <div className="flex flex-col gap-4 w-full max-w-xs px-4"> <label className="bg-[#20c7ff] hover:bg-[#1aaad9] text-white py-3 rounded-full font-semibold cursor-pointer transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"> <BsCloudArrowUp size={20} /> Select Media <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" /> </label> <button onClick={() => setMode("text")} className="bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-full font-semibold cursor-pointer transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2" > <FaPen size={16} /> Type a Status </button> </div> </div>
        </div>
      );
  }

  return (
    <>
      {showEditor && file && (<MediaEditor file={file} onCancel={() => setShowEditor(false)} onSave={handleEditorSave} />)}
      <div className={`fixed inset-0 bg-black z-[9999] flex flex-col ${showEditor || showMusicModal ? "hidden" : "flex"}`}>
          <div className="absolute top-0 w-full p-4 flex justify-between items-start z-30 bg-gradient-to-b from-black/60 to-transparent"> <div className="bg-black/40 backdrop-blur-md rounded-full p-2 cursor-pointer hover:bg-black/60 transition" onClick={onClose}> <RxCross2 className="text-white w-6 h-6" /> </div> <div className="flex gap-4"> {mode === "text" && ( <> <button onClick={cycleFont} className="bg-black/40 backdrop-blur-md rounded-full p-2.5 cursor-pointer hover:bg-black/60 transition text-white"> <BsType size={20} /> </button> <button onClick={cycleColor} className="bg-black/40 backdrop-blur-md rounded-full p-2.5 cursor-pointer hover:bg-black/60 transition text-white"> <BsPalette size={20} /> </button> </> )} {mode === "media" && isImage && ( <button onClick={() => setShowEditor(true)} className="bg-black/40 backdrop-blur-md rounded-full p-2.5 cursor-pointer hover:bg-black/60 transition text-white" title="Edit Image"> <BsCrop size={20} /> </button> )} {mode === "media" && !isImage && ( <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="bg-black/40 backdrop-blur-md rounded-full p-2.5 cursor-pointer hover:bg-black/60 transition text-white" title={isMuted ? "Unmute Video" : "Mute Video"}> {isMuted ? <BsVolumeMuteFill size={20} /> : <BsVolumeUpFill size={20} />} </button> )} {mode === "media" && isImage && ( <button onClick={() => setShowMusicModal(true)} className={`bg-black/40 backdrop-blur-md rounded-full p-2.5 cursor-pointer hover:bg-black/60 transition ${selectedMusicData ? 'text-[#20c7ff]' : 'text-white'}`} title="Add Music"> <BsMusicNoteBeamed size={20} /> </button> )} </div> </div>

          <div className="flex-1 flex items-center justify-center relative overflow-hidden transition-colors duration-300" style={{ backgroundColor: mode === "text" ? BG_COLORS[bgColorIndex] : "black" }} onClick={mode === "media" ? toggleMainPlayback : null}> {mode === "text" ? ( <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Type a status..." className={`w-full max-w-lg bg-transparent text-white text-center text-3xl outline-none placeholder-white/50 resize-none overflow-hidden ${FONTS[fontIndex]}`} rows={5} autoFocus /> ) : ( <> {isImage ? ( <img src={URL.createObjectURL(editedFile || file)} alt="preview" className="w-full h-full object-contain" /> ) : ( <div className="relative w-full h-full flex items-center justify-center"> <video ref={videoPreviewRef} src={URL.createObjectURL(editedFile || file)} autoPlay playsInline loop className="w-full h-full object-contain" muted={isMuted} /> {!isVideoPlaying && ( <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10"> <div className="bg-black/50 p-4 rounded-full backdrop-blur-sm animate-scale-in"> <BsPlayCircleFill className="text-white text-5xl opacity-90" /> </div> </div> )} </div> )} </> )} {mode === "media" && selectedMusicData && ( <div className="absolute bottom-24 left-4 right-4 z-20 bg-black/70 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl animate-slide-up" onClick={(e) => e.stopPropagation()}> <div className="flex justify-between items-center mb-4"> <div className="flex items-center gap-3 overflow-hidden"> <button onClick={toggleSelectionPlay} className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-lg active:scale-95 transition-transform"> {isPlayingSelection ? <BsPauseFill className="text-black text-xl" /> : <BsPlayFill className="text-black text-xl ml-0.5" />} </button> <div className="flex flex-col overflow-hidden"> <span className="text-white text-sm font-bold truncate">{selectedMusicData.name}</span> <span className="text-gray-300 text-[10px] font-mono tracking-wide">{formatTime(startTime)} - {formatTime(startTime + statusDuration)} <span className="opacity-50">/ {formatTime(musicTotalDuration)}</span></span> </div> </div> <button onClick={() => { setSelectedMusicData(null); setSelectedMusicFile(null); hiddenAudioRef.current.pause(); }} className="p-2 hover:bg-white/20 rounded-full transition"><RxCross2 className="text-white" size={18} /></button> </div> <div className="flex items-center gap-4"> <button onClick={toggleDuration} className="w-8 h-8 rounded-full border border-white/60 flex items-center justify-center shrink-0 text-white text-[10px] font-bold active:scale-95 transition">{statusDuration}s</button> <div className="flex-1 relative h-8 bg-white/20 rounded-full overflow-hidden flex items-center"> <div className="absolute inset-0 flex items-center justify-center gap-[2px] opacity-50 px-2 pointer-events-none"> {Array.from({ length: 50 }).map((_, i) => ( <div key={i} className="w-0.5 bg-white rounded-full" style={{ height: `${30 + Math.random() * 60}%` }}></div> ))} </div> <div className="absolute h-full bg-[#20c7ff]/40 border-x-2 border-[#20c7ff] pointer-events-none transition-all duration-75" style={{ left: `${(startTime / musicTotalDuration) * 100}%`, width: `${(statusDuration / musicTotalDuration) * 100}%` }}></div> <input type="range" min="0" max={musicTotalDuration > statusDuration ? musicTotalDuration - statusDuration : 0} step="0.1" value={startTime} onChange={handleStartTimeChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" /> </div> </div> </div> )} </div>

          <div className="absolute bottom-0 w-full p-4 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-12"> <div className="flex items-center gap-3"> {mode === "media" && ( <div className="flex-1 bg-white/20 backdrop-blur-md rounded-full flex items-center px-4 py-2 border border-white/10 transition-colors focus-within:bg-white/30"> <BsEmojiSmile className="text-white text-xl cursor-pointer hover:scale-110 transition-transform" onClick={() => setShowEmojiPicker(!showEmojiPicker)} /> <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Add a caption..." className="bg-transparent border-none outline-none text-white placeholder-gray-300 ml-3 w-full text-sm" disabled={loading} /> </div> )} {mode === "text" && ( <button className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md" onClick={() => setShowEmojiPicker(!showEmojiPicker)}> <BsEmojiSmile className="text-white text-xl" /> </button> )} <button onClick={handleSubmit} disabled={loading || (mode === "text" && !textContent.trim())} className="bg-[#20c7ff] hover:bg-[#1aaad9] text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed ml-auto"> {loading ? <AiOutlineLoading3Quarters className="animate-spin text-xl" /> : <IoMdSend className="text-xl ml-1" />} </button> </div> {showEmojiPicker && ( <div className="absolute bottom-20 left-4 z-40 animate-slide-up"> <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" width={300} height={350} /> </div> )} </div>
      </div>
      {showMusicModal && ( <div className="fixed inset-0 bg-black/90 flex justify-center items-end sm:items-center z-[100] animate-fade-in"> <div className="bg-white w-full sm:w-[450px] h-[90%] sm:h-[600px] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl relative animate-slide-up"> <div className="p-4 border-b flex justify-between items-center bg-gray-50"> <h3 className="font-bold text-gray-800 text-lg">Music Library</h3> <div className="bg-gray-200 p-1.5 rounded-full cursor-pointer hover:bg-gray-300 transition" onClick={() => { setShowMusicModal(false); audioPreviewRef.current.pause(); setPlayingPreview(null); }}> <RxCross2 size={20} className="text-gray-600"/> </div> </div> <div className="flex border-b bg-white"> <button className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'library' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'}`} onClick={() => setActiveTab('library')}> Full Songs </button> <button className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'search' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'}`} onClick={() => setActiveTab('search')}> Search </button> </div> <div className="flex-1 overflow-y-auto bg-gray-50 p-2 custom-scrollbar"> {activeTab === 'library' && ( <div className="space-y-2 pt-2"> {FULL_LENGTH_MUSIC_LIBRARY.map((track) => ( <div key={track.trackId} className="flex items-center gap-3 p-3 bg-white hover:bg-gray-100 rounded-xl cursor-pointer transition-all shadow-sm border border-gray-100" onClick={() => handleSelectMusicFromApi(track)}> <div className="relative w-12 h-12 shrink-0 group"> <img src={track.artworkUrl60} alt="art" className="w-full h-full rounded-lg object-cover" /> <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg" onClick={(e) => { e.stopPropagation(); handlePreviewPlay(track.previewUrl); }}> {playingPreview === track.previewUrl ? <BsPauseFill className="text-white" size={20} /> : <BsPlayFill className="text-white" size={20} />} </div> </div> <div className="flex-1 min-w-0"> <p className="font-bold text-sm text-gray-900 truncate">{track.trackName}</p> <p className="text-xs text-gray-500 truncate">{track.artistName}</p> </div> </div> ))} <div className="py-4 flex justify-center"> <button onClick={() => musicInputRef.current.click()} className="flex items-center gap-2 bg-white border border-gray-300 px-6 py-2.5 rounded-full text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:shadow-md transition-all"> <BsCloudArrowUp size={18} className="text-[#20c7ff]" /> Upload from Device </button> </div> </div> )} {activeTab === 'search' && ( <div className="pt-2"> <form onSubmit={searchMusic} className="relative mb-4 px-2"> <BsSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" /> <input type="text" className="w-full bg-white border border-gray-200 rounded-full pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-black/10 focus:border-black outline-none shadow-sm" placeholder="Search songs..." value={musicSearchQuery} onChange={(e) => setMusicSearchQuery(e.target.value)} autoFocus /> </form> <div className="space-y-2"> {isSearchingMusic ? ( <div className="flex justify-center py-10"><AiOutlineLoading3Quarters className="animate-spin text-2xl text-gray-400" /></div> ) : musicResults.length > 0 ? ( musicResults.map((track) => ( <div key={track.trackId} className="flex items-center gap-3 p-3 bg-white hover:bg-gray-100 rounded-xl cursor-pointer transition-all shadow-sm border border-gray-100" onClick={() => handleSelectMusicFromApi(track)}> <div className="relative w-12 h-12 shrink-0"> <img src={track.artworkUrl60} alt="art" className="w-full h-full rounded-lg object-cover" /> <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg" onClick={(e) => { e.stopPropagation(); handlePreviewPlay(track.previewUrl); }}> {playingPreview === track.previewUrl ? <BsPauseFill className="text-white" size={20} /> : <BsPlayFill className="text-white" size={20} />} </div> </div> <div className="flex-1 min-w-0"> <p className="font-bold text-sm text-gray-900 truncate">{track.trackName}</p> <p className="text-xs text-gray-500 truncate">{track.artistName}</p> </div> </div> )) ) : ( <div className="text-center text-gray-400 py-10 text-sm"> Try searching for "Pop", "Rock", or artist names. </div> )} </div> </div> )} </div> <input type="file" accept="audio/*" ref={musicInputRef} className="hidden" onChange={handleMusicFileChange} /> </div> </div> )}
      <style>{`
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; } .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; } .animate-bounce-slow { animation: bounce 2s infinite; } .animate-scale-in { animation: scaleIn 0.2s ease-out forwards; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } } .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>
    </>
  );
}

export default StatusUpload;