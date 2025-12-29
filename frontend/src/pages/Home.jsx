import React, { useState } from 'react'
import Sidebar from '../components/Sidebar'
import MessageArea from '../components/MessageArea'
import { useSelector } from 'react-redux'
import getMessage from '../customHooks/getMessages'

function Home() {
  let {selectedUser} = useSelector(state=>state.user)
  getMessage()
  const [activeTab, setActiveTab] = useState("chats");
  return (
    <div className='w-full h-[100vh] flex overflow-hidden'>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
    <MessageArea activeTab={activeTab} />
    </div>
  )
}

export default Home
