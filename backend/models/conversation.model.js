import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  messages: [
   { type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'}
  ],
  // ✅ Fields for Group Chat
  isGroup: {
    type: Boolean,
    default: false,
  },
  groupName: {
    type: String,
  },
  groupImage: {
    type: String, 
    default: ""
  },
  // ✅ Changed to Array for multiple admins support
  groupAdmins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }]
}, {timestamps: true});

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;