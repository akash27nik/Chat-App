import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { 
  FiX, FiSearch, FiCheck, FiLoader, FiUserPlus, FiUsers, 
  FiInfo, FiTrash2, FiLogOut, FiEdit2, FiCamera 
} from "react-icons/fi";
import { RiCrownLine } from "react-icons/ri";
import { setSelectedUser, setOtherUsers } from "../redux/userSlice";
import { serverUrl } from "../main.jsx";
import dp from "../assets/dp.webp";

/**
 * GROUP CHAT FEATURES (Debugged & Forced Visibility)
 * - Icons moved out of "absolute" position to ensure they are seen.
 * - Admin logic checks multiple data paths.
 */
const GroupChatFeatures = () => {
  const dispatch = useDispatch();
  const { otherUsers, selectedUser, userData } = useSelector((state) => state.user);
  const fileInputRef = useRef(null);

  // --- LOCAL STATE ---
  const [activeModal, setActiveModal] = useState(null); 
  const [loading, setLoading] = useState(false);
  
  // Forms
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  // Edit Mode States
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  // --- DERIVED STATE ---
  const currentChat = otherUsers?.find((u) => u._id === selectedUser?._id) || selectedUser;
  const isGroup = currentChat?.isGroup;

  // --- ROBUST ADMIN CHECK ---
  // We check both 'groupAdmins' (populated objects) and 'admins' (simple ID arrays)
  const amIAdmin = isGroup && (
    currentChat?.groupAdmins?.some(admin => 
      (typeof admin === 'object' ? admin._id : admin)?.toString() === userData?._id?.toString()
    ) || 
    currentChat?.admins?.some(adminId => 
      adminId?.toString() === userData?._id?.toString()
    )
  );

  // DEBUGGING LOG (Check your browser console F12)
  useEffect(() => {
    if (activeModal === 'info') {
      console.log("--- DEBUG GROUP ADMIN ---");
      console.log("My ID:", userData?._id);
      console.log("Group Admins:", currentChat?.groupAdmins);
      console.log("AM I ADMIN?", amIAdmin);
    }
  }, [activeModal, amIAdmin, userData, currentChat]);

  // Filter users for search
  const filteredUsers = otherUsers?.filter((u) => 
    !u.isGroup && 
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- HELPERS ---
  const closeModal = () => {
    setActiveModal(null);
    setGroupName("");
    setSearchQuery("");
    setSelectedMembers([]);
    setLoading(false);
    setIsEditingName(false);
  };

  const updateReduxGroup = (updatedGroup) => {
    const updatedList = otherUsers.map((u) => 
      u._id === updatedGroup._id ? updatedGroup : u
    );
    dispatch(setOtherUsers(updatedList));
    
    if (selectedUser?._id === updatedGroup._id) {
      dispatch(setSelectedUser(updatedGroup));
    }
  };

  // --- API ACTIONS ---
  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length < 2) {
      return toast.warning("Group needs a name and at least 2 members.");
    }
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${serverUrl}/api/message/group/create`,
        { name: groupName, members: selectedMembers },
        { withCredentials: true }
      );
      dispatch(setOtherUsers([data, ...otherUsers]));
      dispatch(setSelectedUser(data));
      toast.success("Group created successfully!");
      closeModal();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (userId) => {
    setLoading(true);
    try {
      const { data } = await axios.put(
        `${serverUrl}/api/message/group/add/${selectedUser._id}`,
        { userId },
        { withCredentials: true }
      );
      updateReduxGroup(data);
      toast.success("Member added!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to remove ${userName} from the group?`)) return;
    setLoading(true);
    try {
      const { data } = await axios.put(
        `${serverUrl}/api/message/group/remove/${selectedUser._id}`,
        { userId },
        { withCredentials: true }
      );
      updateReduxGroup(data);
      toast.success(`${userName} removed.`);
    } catch (error) {
      toast.error("Failed to remove member");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;
    setLoading(true);
    try {
      await axios.put(
        `${serverUrl}/api/message/group/exit/${selectedUser._id}`,
        {},
        { withCredentials: true }
      );
      dispatch(setSelectedUser(null));
      toast.success("You left the group.");
      closeModal();
    } catch (error) {
      toast.error("Failed to leave group");
    } finally {
      setLoading(false);
    }
  };

  const handleRenameGroup = async () => {
    if (!editedName.trim()) return toast.warning("Name cannot be empty");
    setLoading(true);
    try {
      const { data } = await axios.put(
        `${serverUrl}/api/message/group/rename/${selectedUser._id}`,
        { name: editedName },
        { withCredentials: true }
      );
      updateReduxGroup(data);
      toast.success("Group name updated");
      setIsEditingName(false);
    } catch (error) {
      toast.error("Failed to rename group");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.warning("Please select an image file");

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const { data } = await axios.put(
        `${serverUrl}/api/message/group/image/${selectedUser._id}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" }, withCredentials: true }
      );
      updateReduxGroup(data);
      toast.success("Group icon updated");
    } catch (error) {
      toast.error("Failed to update group icon");
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  // --- RENDER ---
  return (
    <div className="flex items-center gap-1">
      {/* HEADER ICONS */}
      <button 
        onClick={() => setActiveModal('create')}
        className="p-2.5 hover:bg-gray-100 rounded-full text-gray-600 transition-all active:scale-95"
        title="Create Group"
      >
        <FiUsers size={20} />
      </button>

      {isGroup && (
         <button 
           onClick={() => {
             setActiveModal('info');
             setEditedName(currentChat?.name || "");
           }}
           className="p-2.5 hover:bg-gray-100 rounded-full text-gray-600 transition-all active:scale-95"
           title="Group Info"
         >
           <FiInfo size={20} />
         </button>
      )}

      {/* CREATE MODAL */}
      {activeModal === 'create' && (
        <ModalWrapper title="Create New Group" onClose={closeModal}>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Group Name</label>
              <input
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Group Name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex flex-col h-[320px]">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Add Members ({selectedMembers.length})
              </label>
              <div className="relative mb-2">
                <FiSearch className="absolute left-3 top-3 text-gray-400" />
                <input 
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-50 border-none text-sm focus:ring-2 focus:ring-blue-100 placeholder-gray-400"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                {filteredUsers?.map((user) => {
                  const isSelected = selectedMembers.includes(user._id);
                  return (
                    <div
                      key={user._id}
                      onClick={() => setSelectedMembers(prev => prev.includes(user._id) ? prev.filter(id => id !== user._id) : [...prev, user._id])}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border ${isSelected ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50 border-transparent"}`}
                    >
                      <img src={user.image || dp} className="w-10 h-10 rounded-full object-cover" alt="" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-700">{user.name}</h4>
                      </div>
                      {isSelected && <FiCheck className="text-blue-500" />}
                    </div>
                  );
                })}
              </div>
            </div>
            <button
              onClick={handleCreateGroup}
              disabled={loading}
              className="w-full bg-[#1a7fa0] text-white font-bold py-3.5 rounded-xl disabled:opacity-70 flex justify-center items-center gap-2"
            >
              {loading ? <FiLoader className="animate-spin" /> : "Create Group Chat"}
            </button>
          </div>
        </ModalWrapper>
      )}

      {/* INFO MODAL */}
      {activeModal === 'info' && (
        <ModalWrapper title="Group Info" onClose={closeModal}>
          <div className="flex flex-col items-center mb-6">
            
            {/* 1. Group Image */}
            <div className="relative mb-2">
               <img 
                 src={currentChat?.image || dp} 
                 className="w-28 h-28 rounded-full object-cover border-4 border-gray-100 shadow-sm" 
                 alt="Group"
               />
               <input type="file" ref={fileInputRef} onChange={handleImageChange} hidden accept="image/*" />
            </div>

            {/* BUTTON 1: CHANGE PHOTO (Explicitly placed outside relative container to ensure visibility) */}
            {amIAdmin && (
                <button 
                  onClick={triggerFileInput}
                  className="mb-4 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-2"
                >
                  <FiCamera /> Change Photo
                </button>
            )}

            {/* 2. Group Name */}
            <div className="w-full flex flex-col items-center justify-center mb-1">
               {isEditingName && amIAdmin ? (
                  <div className="flex items-center gap-2 w-full justify-center animate-fade-in-up">
                    <input 
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="w-[70%] border-b-2 border-blue-500 text-center font-bold text-xl outline-none pb-1 text-gray-800"
                      autoFocus
                    />
                    <button onClick={handleRenameGroup} className="text-green-600 bg-green-50 p-2 rounded-full hover:bg-green-100"><FiCheck /></button>
                    <button onClick={() => { setIsEditingName(false); setEditedName(currentChat.name); }} className="text-red-500 bg-red-50 p-2 rounded-full hover:bg-red-100"><FiX /></button>
                  </div>
               ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-gray-800 text-center">{currentChat?.name}</h2>
                    {/* BUTTON 2: EDIT NAME */}
                    {amIAdmin && (
                      <button 
                        onClick={() => { setEditedName(currentChat?.name); setIsEditingName(true); }} 
                        className="text-gray-400 hover:text-[#1a7fa0] p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                        title="Edit Name"
                      >
                        <FiEdit2 size={18} />
                      </button>
                    )}
                  </div>
               )}
            </div>

            <p className="text-gray-500 text-sm font-medium mt-1">Group • {currentChat?.participants?.length} Participants</p>
          </div>

          {amIAdmin && (
             <button 
               onClick={() => setActiveModal('add-member')}
               className="w-full flex items-center justify-center gap-2 p-3.5 mb-6 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-semibold transition-colors border border-blue-100"
             >
               <FiUserPlus size={18} /> Add New Participants
             </button>
          )}

          <div className="space-y-3 mb-6">
             <div className="flex justify-between items-end px-1">
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Group Members</h3>
               <span className="text-xs text-gray-400">{currentChat?.participants?.length} Total</span>
             </div>
             <div className="max-h-[300px] overflow-y-auto space-y-1 bg-gray-50 rounded-2xl p-2 custom-scrollbar">
                {currentChat?.participants?.map((member) => {
                  const isAdmin = (currentChat?.groupAdmins || []).some(a => (typeof a === 'object' ? a._id : a).toString() === member._id.toString());
                  const isMe = member._id.toString() === userData._id.toString();

                  return (
                    <div key={member._id} className="flex items-center justify-between p-2.5 hover:bg-white rounded-xl transition-all group">
                      <div className="flex items-center gap-3">
                        <img src={member.image || dp} className="w-10 h-10 rounded-full object-cover" alt="" />
                        <div>
                           <div className="flex items-center gap-1.5">
                             <p className="text-sm font-semibold text-gray-800">{isMe ? "You" : member.name}</p>
                             {isAdmin && <RiCrownLine className="text-amber-500" size={14} />}
                           </div>
                           <p className="text-[11px] text-gray-400">{isAdmin ? "Group Admin" : "Member"}</p>
                        </div>
                      </div>
                      {amIAdmin && !isMe && (
                        <button onClick={() => handleRemoveMember(member._id, member.name)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                          <FiTrash2 size={18} />
                        </button>
                      )}
                    </div>
                  );
                })}
             </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
             <button onClick={handleLeaveGroup} className="w-full flex items-center justify-center gap-2 text-red-600 bg-red-50 hover:bg-red-100 py-3.5 rounded-xl font-semibold transition-colors">
               <FiLogOut /> Exit Group
             </button>
          </div>
        </ModalWrapper>
      )}

      {/* ADD MEMBER MODAL */}
      {activeModal === 'add-member' && (
        <ModalWrapper title="Add Participants" onClose={() => setActiveModal('info')}>
           <div className="relative mb-4">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input 
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border-none text-sm focus:ring-2 focus:ring-blue-100"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="h-[350px] overflow-y-auto space-y-2 custom-scrollbar">
              {filteredUsers?.map((user) => {
                const isAlreadyIn = currentChat?.participants?.some(p => p._id === user._id);
                if (isAlreadyIn) return null;
                return (
                  <div key={user._id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <img src={user.image || dp} className="w-10 h-10 rounded-full object-cover" alt="" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-700 text-sm">{user.name}</span>
                        <span className="text-xs text-gray-400">{user.about || "Available"}</span>
                      </div>
                    </div>
                    <button onClick={() => handleAddMember(user._id)} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors">
                      <FiUserPlus size={18} />
                    </button>
                  </div>
                );
              })}
              {filteredUsers?.length === 0 && <p className="text-center text-gray-400 mt-10">No users found</p>}
            </div>
            <button onClick={() => setActiveModal('info')} className="w-full mt-4 text-gray-500 py-3 hover:bg-gray-100 rounded-xl font-medium">Back to Group Info</button>
        </ModalWrapper>
      )}
    </div>
  );
};

const ModalWrapper = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div className="absolute inset-0" onClick={onClose}></div>
    <div className="bg-white w-full max-w-[420px] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10 animate-slide-up">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 backdrop-blur sticky top-0 z-20">
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><FiX size={20} /></button>
      </div>
      <div className="p-6 overflow-y-auto custom-scrollbar">{children}</div>
    </div>
  </div>
);

export default GroupChatFeatures;