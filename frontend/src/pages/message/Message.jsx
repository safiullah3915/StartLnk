import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navbar } from '../../components/Navbar/Navbar';
import { useSearchParams, useLocation } from 'react-router-dom';
import MessageService from '../../services/MessageService';

const Message = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('conversations');
  const [error, setError] = useState(null);
  const [unreadConversations, setUnreadConversations] = useState(new Set());
  const chatAreaRef = useRef(null);
  const processedUserIdRef = useRef(null);
  const isInitializedRef = useRef(false);

  const storageKey = "messages:lastSeenAt";
  const getLastSeen = () => {
    const v = localStorage.getItem(storageKey);
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const markConversationAsRead = (conversationId) => {
    setUnreadConversations(prev => {
      const next = new Set(prev);
      next.delete(conversationId);
      return next;
    });
    localStorage.setItem(storageKey, String(Date.now()));
  };

  useEffect(() => {
    if (user) {
      initializeMessaging();
      
      // Poll for new messages every 5 seconds
      const interval = setInterval(async () => {
        try {
          const conversationsData = await MessageService.getConversations();
          const allConversations = Array.isArray(conversationsData)
            ? conversationsData.filter(c => !!c?.last_message)
            : [];
          
          // Sort conversations by last_message timestamp (newest first)
          const sortedConversations = [...allConversations].sort((a, b) => {
            const aTime = a?.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0;
            const bTime = b?.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0;
            return bTime - aTime;
          });
          
          setConversations(sortedConversations);
          
          // Update unread conversations
          const lastSeen = getLastSeen();
          const unreadSet = new Set();
          sortedConversations.forEach(conv => {
            const lm = conv?.last_message;
            if (lm) {
              const msgTime = new Date(lm.created_at).getTime();
              const isFromOther = lm?.sender?.id && user?.id && lm.sender.id !== user.id;
              if (isFromOther && msgTime > lastSeen && conv.id !== currentConversation?.id) {
                unreadSet.add(conv.id);
              }
            }
          });
          setUnreadConversations(unreadSet);
        } catch (error) {
          console.error('Failed to refresh conversations:', error);
        }
      }, 5000);
      
      return () => {
        clearInterval(interval);
        // Remove empty conversations when leaving the page (except if they're from URL)
        const conversationIdFromUrl = searchParams.get('conversation');
        setConversations(prev => prev.filter(c => !!c?.last_message || c?.id === conversationIdFromUrl));
      };
    }
  }, [user, searchParams, currentConversation]);

  // Handle user from navigation state when component is already initialized (for subsequent navigations)
  useEffect(() => {
    if (!user || !isInitializedRef.current || !location.state?.selectedUser) return;
    
    // Only handle navigation state changes (not initial load - that's handled in initializeMessaging)
    const selectedUserFromState = location.state.selectedUser;
    if (!selectedUserFromState.id && !selectedUserFromState.email) {
      return;
    }
    
    const userKey = selectedUserFromState.id || selectedUserFromState.email;
    
    // Skip if we already processed this user
    if (processedUserIdRef.current === userKey) {
      // Verify conversation is selected
      const currentOtherUser = currentConversation?.participants?.find(p => String(p.id) !== String(user.id));
      const isAlreadyWithUser = currentOtherUser && (
        (selectedUserFromState.id && String(currentOtherUser.id) === String(selectedUserFromState.id)) ||
        (selectedUserFromState.email && currentOtherUser.email === selectedUserFromState.email)
      );
      
      if (!isAlreadyWithUser) {
        // Find and select existing conversation
        const existingConversation = conversations.find(conv => {
          const otherUser = MessageService.getOtherParticipant(conv, user.id);
          if (!otherUser) return false;
          if (selectedUserFromState.id && String(otherUser.id) === String(selectedUserFromState.id)) return true;
          if (selectedUserFromState.email && otherUser.email === selectedUserFromState.email) return true;
          return false;
        });
        
        if (existingConversation && existingConversation.id !== currentConversation?.id) {
          selectConversation(existingConversation);
        }
      }
      return;
    }
    
    // Process new user from navigation state
    processedUserIdRef.current = userKey;
    selectUser(selectedUserFromState).catch(err => {
      console.error('[Message] Failed to select user from state:', err);
      setError('Failed to start conversation');
    });
    
    // Clear navigation state after processing
    window.history.replaceState({}, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, user?.id, conversations.length]);

  // Auto-scroll to bottom when messages or conversation changes
  useEffect(() => {
    if (chatAreaRef.current && messages.length > 0) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        if (chatAreaRef.current) {
          chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [messages, currentConversation]);

  const initializeMessaging = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load conversations and online users in parallel
      const [conversationsData, onlineUsersData] = await Promise.all([
        MessageService.getConversations(),
        MessageService.getOnlineUsers()
      ]);
      
      // On page load, exclude empty conversations returned by API
      // But include conversations from URL even if they don't have last_message yet
      const conversationIdFromUrl = searchParams.get('conversation');
      const allConversations = Array.isArray(conversationsData)
        ? conversationsData.filter(c => !!c?.last_message || c?.id === conversationIdFromUrl)
        : [];
      
      // Sort conversations by last_message timestamp (newest first)
      const sortedConversations = [...allConversations].sort((a, b) => {
        const aTime = a?.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0;
        const bTime = b?.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0;
        return bTime - aTime; // Descending order (newest first)
      });
      
      setConversations(sortedConversations);
      setOnlineUsers(onlineUsersData.filter(u => u.id !== user.id)); // Exclude current user
      
      // Determine unread conversations
      const lastSeen = getLastSeen();
      const unreadSet = new Set();
      sortedConversations.forEach(conv => {
        const lm = conv?.last_message;
        if (lm) {
          const msgTime = new Date(lm.created_at).getTime();
          const isFromOther = lm?.sender?.id && user?.id && lm.sender.id !== user.id;
          if (isFromOther && msgTime > lastSeen) {
            unreadSet.add(conv.id);
          }
        }
      });
      setUnreadConversations(unreadSet);
      
      // Mark initialization as complete
      isInitializedRef.current = true;
      
      // Check for navigation state or URL params after conversations are loaded
      const selectedUserFromState = location.state?.selectedUser;
      const userIdFromUrl = searchParams.get('user');
      const userToProcess = selectedUserFromState || (userIdFromUrl ? { id: userIdFromUrl } : null);
      
      if (userToProcess && (userToProcess.id || userToProcess.email)) {
        // Process user from navigation state or URL - use fresh conversations data
        const userKey = userToProcess.id || userToProcess.email;
        processedUserIdRef.current = userKey;
        
        // Normalize ID for comparison
        const normalizeId = (id) => String(id || '').replace(/-/g, '').toLowerCase();
        const normalizedUserId = normalizeId(userToProcess.id);
        
        // Check if conversation already exists using fresh data
        const existingConversation = sortedConversations.find(conv => {
          const otherUser = MessageService.getOtherParticipant(conv, user?.id);
          if (!otherUser) return false;
          if (userToProcess.id) {
            const otherId = normalizeId(otherUser.id);
            return otherId === normalizedUserId;
          }
          if (userToProcess.email && otherUser.email === userToProcess.email) {
            return true;
          }
          return false;
        });
        
        if (existingConversation) {
          await selectConversation(existingConversation);
          // Clear navigation state
          if (location.state?.selectedUser) {
            window.history.replaceState({}, '');
          }
          return;
        }
        
        // No existing conversation, create one using selectUser (which will handle it properly)
        // Use setTimeout to ensure state is updated
        setTimeout(async () => {
          try {
            await selectUser(userToProcess);
            // Clear navigation state after processing
            if (location.state?.selectedUser) {
              window.history.replaceState({}, '');
            }
          } catch (err) {
            console.error('[Message] Failed to select user on init:', err);
            setError('Failed to start conversation');
          }
        }, 100);
        return;
      }
      
      // Legacy URL param handling (keep for backward compatibility)
      if (userIdFromUrl) {
        // Find if conversation already exists with this user (using string comparison for IDs)
        const existingConversation = sortedConversations.find(conv => {
          const otherUser = MessageService.getOtherParticipant(conv, user?.id);
          return otherUser && String(otherUser.id) === String(userIdFromUrl);
        });
        
        if (existingConversation) {
          await selectConversation(existingConversation);
        } else {
          // Create or get conversation with this user
          try {
            const conversation = await MessageService.getOrCreateConversation(userIdFromUrl);
            // Update conversations list if it's a new conversation
            if (!sortedConversations.find(c => c.id === conversation.id)) {
              const updatedConversations = [conversation, ...sortedConversations];
              setConversations(updatedConversations);
            }
            await selectConversation(conversation);
          } catch (err) {
            console.error('Failed to create conversation with user from URL:', err);
            setError('Failed to start conversation');
            // Fallback to first conversation if exists
            if (sortedConversations.length > 0) {
              await selectConversation(sortedConversations[0]);
            }
          }
        }
      } else if (conversationIdFromUrl) {
        // Check if conversation ID is in URL query params
        const conversationFromUrl = sortedConversations.find(c => c.id === conversationIdFromUrl);
        if (conversationFromUrl) {
          await selectConversation(conversationFromUrl);
        } else {
          // Conversation might not be loaded yet, try to fetch it
          try {
            const convData = await MessageService.getConversation(conversationIdFromUrl);
            if (convData) {
              // Add to conversations list and sort again
              const updatedConversations = [...sortedConversations];
              if (!updatedConversations.find(c => c.id === convData.id)) {
                updatedConversations.push(convData);
              }
              const reSorted = updatedConversations.sort((a, b) => {
                const aTime = a?.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0;
                const bTime = b?.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0;
                return bTime - aTime;
              });
              setConversations(reSorted);
              await selectConversation(convData);
            }
          } catch (err) {
            console.error('Failed to load conversation from URL:', err);
            // Fallback to first conversation
            if (sortedConversations.length > 0) {
              await selectConversation(sortedConversations[0]);
            }
          }
        }
      } else {
        // Select first conversation if exists and no URL param
        if (sortedConversations.length > 0) {
          await selectConversation(sortedConversations[0]);
        }
      }
    } catch (error) {
      console.error('Failed to initialize messaging:', error);
      setError('Failed to load messaging data');
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conversation) => {
    try {
      setCurrentConversation(conversation);
      MessageService.setCurrentConversation(conversation);
      
      // Mark conversation as read when opened
      markConversationAsRead(conversation.id);
      
      const messagesData = await MessageService.getMessages(conversation.id);
      // Ensure unique messages by id
      const uniqueById = Array.isArray(messagesData)
        ? Object.values(
            messagesData.reduce((acc, msg) => {
              if (msg && msg.id != null) acc[msg.id] = msg;
              return acc;
            }, {})
          )
        : [];
      setMessages(uniqueById);
      setActiveTab('conversations');
    } catch (error) {
      console.error('Failed to load conversation messages:', error);
      setError('Failed to load messages');
    }
  };

  const selectUser = async (selectedUser) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[Message] selectUser called with:', selectedUser);
      
      // If selectedUser has email but no valid ID, fetch user by email first
      let userId = selectedUser.id;
      if (!userId && selectedUser.email) {
        console.log('[Message] No ID found, fetching user by email:', selectedUser.email);
        try {
          const { userAPI } = await import('../../utils/apiServices');
          const searchResponse = await userAPI.getUserByEmail(selectedUser.email);
          const searchResults = searchResponse?.data?.results || [];
          console.log('[Message] Search results:', searchResults);
          const foundUser = searchResults.find(u => u.email === selectedUser.email);
          if (foundUser && foundUser.id) {
            userId = foundUser.id;
            console.log('[Message] Found user by email, ID:', userId);
          } else {
            throw new Error('User not found by email');
          }
        } catch (err) {
          console.error('[Message] Failed to fetch user by email:', err);
          setError('Failed to find user. Please try again.');
          return;
        }
      }
      
      if (!userId) {
        console.error('[Message] No user ID or email provided');
        setError('User ID or email is required');
        return;
      }
      
      console.log('[Message] Using user ID:', userId);
      
      // Always refresh conversations to get latest data (important for new conversations)
      const conversationsData = await MessageService.getConversations();
      const allConversations = Array.isArray(conversationsData)
        ? conversationsData.filter(c => !!c?.last_message || c?.participants?.length === 2)
        : [];
      
      // Update conversations state
      setConversations(allConversations);
      
      // Use the fresh conversations list for checking
      const freshConversations = allConversations;
      
      // Normalize userId for comparison (handle UUID formats with/without dashes)
      const normalizeId = (id) => String(id || '').replace(/-/g, '').toLowerCase();
      const normalizedUserId = normalizeId(userId);
      
      // Check if conversation already exists - compare normalized IDs using fresh conversations
      const existingConversation = freshConversations.find(conv => {
        const otherUser = MessageService.getOtherParticipant(conv, user?.id);
        if (!otherUser || !otherUser.id) return false;
        const otherUserId = normalizeId(otherUser.id);
        return otherUserId === normalizedUserId;
      });
      
      if (existingConversation) {
        await selectConversation(existingConversation);
        return;
      }
      
      // Ensure userId is in correct format (with dashes for UUID)
      let formattedUserId = String(userId);
      // If it's a 32-character hex string without dashes, convert to UUID format
      if (formattedUserId.length === 32 && !formattedUserId.includes('-')) {
        formattedUserId = `${formattedUserId.slice(0,8)}-${formattedUserId.slice(8,12)}-${formattedUserId.slice(12,16)}-${formattedUserId.slice(16,20)}-${formattedUserId.slice(20)}`;
        console.log('[Message] Converted UUID format:', formattedUserId);
      }
      
      console.log('[Message] Creating/getting conversation with user ID:', formattedUserId);
      // Create or get conversation with this user
      const conversation = await MessageService.getOrCreateConversation(formattedUserId);
      console.log('[Message] Conversation result:', conversation);
      
      // Refresh conversations after creating new one to ensure we have the full conversation data
      const updatedConversationsData = await MessageService.getConversations();
      const updatedConversations = Array.isArray(updatedConversationsData)
        ? updatedConversationsData.filter(c => !!c?.last_message || c?.participants?.length === 2)
        : [];
      setConversations(updatedConversations);
      
      // Find the conversation in the updated list
      const createdConversation = updatedConversations.find(c => c.id === conversation.id) || conversation;
      await selectConversation(createdConversation);
    } catch (error) {
      console.error('Failed to create conversation with user:', error);
      setError('Failed to start conversation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim() !== '' && currentConversation && user) {
      try {
        const newMessage = await MessageService.sendMessage(currentConversation.id, inputMessage.trim());
        // Append safely without creating duplicates (by id)
        setMessages(prev => {
          if (newMessage?.id && prev.some(m => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
        setInputMessage('');
        
      // Update conversation in the list to show latest message and re-sort
      setConversations(prev => {
        const updated = prev.map(conv => 
          conv.id === currentConversation.id 
            ? { ...conv, last_message: newMessage, updated_at: newMessage.created_at }
            : conv
        );
        // Re-sort by last_message timestamp (newest first)
        return updated.sort((a, b) => {
          const aTime = a?.last_message?.created_at ? new Date(a.last_message.created_at).getTime() : 0;
          const bTime = b?.last_message?.created_at ? new Date(b.last_message.created_at).getTime() : 0;
          return bTime - aTime;
        });
      });
      } catch (error) {
        console.error('Failed to send message:', error);
        setError('Failed to send message');
      }
    }
  };

  return (
    <>
      <style>
        {`
        .app-container {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 160px); /* Account for navbar height and margin */
          width: 100%;
          max-width: 100%;
          background-color: #f3f4f6;
          padding: 1rem;
          margin-top: 80px; /* Spacing from navbar */
          overflow-x: hidden;
          box-sizing: border-box;
        }
        .main-wrapper {
          background-color: #fff;
          border-radius: 1.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          max-width: 100%;
          box-sizing: border-box;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          max-width: 100%;
          box-sizing: border-box;
          overflow-x: hidden;
        }
        .header-section {
          display: flex;
          align-items: center;
          flex: 1;
          gap: 1rem;
        }
        .search-input {
          width: 100%;
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          border: 1px solid #d1d5db;
          outline: none;
          box-shadow: 0 0 0 2px transparent;
          transition: box-shadow 0.2s;
        }
        .search-input:focus {
          box-shadow: 0 0 0 2px #3e387f;
        }
        .nav-buttons-container {
          flex: 1;
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          padding-right: 25rem;

        }
        .nav-button {
          padding: 0.5rem 1.5rem;
          border-radius: 9999px;
          font-weight: 600;
          transition: background-color 0.2s;
        }
        .nav-button.active {
          background-color: #3e387f;
          color: #fff;
        }
        .nav-button.inactive {
          background-color: #e5e7eb;
          color: #1f2937;
        }
        .nav-button.inactive:hover {
          background-color: #d1d5db;
        }
        .main-content {
          display: flex;
          flex: 1;
          overflow: hidden;
          min-height: 0;
          max-width: 100%;
        }
        .user-list {
          width: 25%;
          background-color: #f9fafb;
          border-right: 1px solid #e5e7eb;
          overflow-y: auto;
          padding: 1rem;
        }
        .user-list h2 {
          font-size: 1.125rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: #4b5563;
        }
        .user-item {
          padding: 0.75rem;
          background-color: #fff;
          border-radius: 0.75rem;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          transition: background-color 0.2s;
          cursor: pointer;
          margin-bottom: 0.5rem;
        }
        .user-item:hover {
          background-color: #f3f4f6;
        }
        .user-item.active {
          background-color: #3e387f;
          color: #fff;
        }
        .user-item.active:hover {
          background-color: #2c2865;
        }
        .chat-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
          gap: 1rem;
          overflow-y: auto;
          overflow-x: hidden;
          background-color: #fff;
          max-width: 100%;
          box-sizing: border-box;
        }
        .chat-message {
          max-width: 28rem;
          padding: 1rem;
          border-radius: 0.75rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
        }
        .chat-message.user {
          background-color: #3e387f;
          color: #fff;
          align-self: flex-end;
        }
        .chat-message.other {
          background-color: #e5e7eb;
          color: #1f2937;
          align-self: flex-start;
        }
        .empty-chat {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          font-size: 1.125rem;
          font-weight: 300;
        }
        .message-input-container {
          padding: 1.5rem;
          background-color: #fff;
          border-top: 1px solid #e5e7eb;
          max-width: 100%;
          box-sizing: border-box;
          color: white;
    
          
        }
        .message-input-container div {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .message-input {
          flex: 1;
          padding: 1rem 1.5rem;
          border-radius: 9999px;
          border: 2px solid #d1d5db;
          outline: none;
          transition: box-shadow 0.2s;
          color:white;
        }
        .message-input:focus {
          box-shadow: 0 0 0 2px #3e387f;
          color:white;
        }
        .send-button {
          padding: 1rem;
          border-radius: 9999px;
          background-color: #3e387f;
          color: #fff;
          transition: background-color 0.2s;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .send-button:hover {
          background-color: #2c2865;
        }
        .send-icon {
          width: 1.5rem;
          height: 1.5rem;
        }
        .footer {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 1rem;
          font-size: 0.75rem;
          color: #6b7280;
          gap: 1.5rem;
          border-top: 1px solid #e5e7eb;
          background-color: #f3f4f6;
        }
        .footer a {
          transition: color 0.2s;
        }
        .footer a:hover {
          color: #3e387f;
        }
        .social-link {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        `}
      </style>
      
      <Navbar />
      
      <div className="app-container">
        <div className="main-wrapper">
          {/* Header */}
          <header className="header">
            <div className="header-section">
              <input
                type="text"
                placeholder="Search..."
                className="search-input"
              />
            </div>
            <div className="nav-buttons-container">
              <button 
                className={`nav-button ${activeTab === 'conversations' ? 'active' : 'inactive'}`}
                onClick={() => setActiveTab('conversations')}
              >
                Conversations
              </button>
              <button 
                className={`nav-button ${activeTab === 'people' ? 'active' : 'inactive'}`}
                onClick={() => setActiveTab('people')}
              >
                People
              </button>
            </div>
          </header>

          {/* Main Content: User List and Chat Area */}
          <main className="main-content">
            {/* User/Conversation List */}
            <div className="user-list">
              {loading ? (
                <div>Loading...</div>
              ) : error ? (
                <div style={{ color: 'red' }}>Error: {error}</div>
              ) : activeTab === 'conversations' ? (
                <div>
                  <h2>Conversations</h2>
                  {conversations.length === 0 ? (
                    <div className="user-item">No conversations yet</div>
                  ) : (
                    conversations.map(conversation => {
                      const otherUser = MessageService.getOtherParticipant(conversation, user?.id);
                      const title = MessageService.getConversationTitle(conversation, user?.id);
                      const isUnread = unreadConversations.has(conversation.id);
                      const isActive = currentConversation?.id === conversation.id;
                      return (
                        <div 
                          key={conversation.id} 
                          className={`user-item ${isActive ? 'active' : ''} ${isUnread ? 'unread' : ''}`}
                          onClick={() => selectConversation(conversation)}
                          style={{
                            backgroundColor: isUnread && !isActive ? '#e3f2fd' : undefined,
                            fontWeight: isUnread && !isActive ? '600' : undefined,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: isUnread ? 'bold' : 'bold' }}>{title}</span>
                            {isUnread && !isActive && (
                              <span style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: '#2196f3',
                                display: 'inline-block'
                              }}></span>
                            )}
                          </div>
                          {conversation.last_message && (
                            <div style={{ fontSize: '0.8em', color: '#666', marginTop: '4px' }}>
                              {conversation.last_message.content.substring(0, 50)}{conversation.last_message.content.length > 50 ? '...' : ''}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div>
                  <h2>Online Users</h2>
                  {onlineUsers.length === 0 ? (
                    <div className="user-item">No users online</div>
                  ) : (
                    onlineUsers.map(onlineUser => (
                      <div 
                        key={onlineUser.id} 
                        className="user-item"
                        onClick={() => selectUser({ id: onlineUser.id, email: onlineUser.email })}
                      >
                        <div style={{ fontWeight: 'bold' }}>{onlineUser.username}</div>
                        <div style={{ fontSize: '0.8em', color: '#666' }}>{onlineUser.email}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Chat Area */}
            <div className="chat-area" ref={chatAreaRef}>
              {!currentConversation ? (
                <div className="empty-chat">
                  {activeTab === 'conversations' ? 'Select a conversation to start messaging' : 'Select a user to start messaging'}
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg, index) => {
                  const isCurrentUser = msg.sender.id === user?.id;
                  return (
                    <div
                      key={msg.id || index}
                      className={`chat-message ${isCurrentUser ? 'user' : 'other'}`}
                    >
                      {!isCurrentUser && (
                        <div style={{ fontSize: '0.8em', color: '#666', marginBottom: '4px' }}>
                          {msg.sender.username}
                        </div>
                      )}
                      <div>{msg.content}</div>
                      <div style={{ fontSize: '0.7em', color: '#999', marginTop: '4px' }}>
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-chat">
                  No messages yet. Start the conversation!
                </div>
              )}
            </div>
          </main>

          {/* Message Input */}
          <div className="message-input-container">
            <div>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
                placeholder={currentConversation ? "Type a message..." : "Select a conversation to start messaging"}
                className="message-input"
                disabled={!currentConversation || loading}
              />
              <button
                onClick={handleSendMessage}
                className="send-button"
                disabled={!currentConversation || loading || !inputMessage.trim()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="send-icon">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.917H12.75a.75.75 0 010 1.5H4.984l-2.432 7.918a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Footer */}
          {/*<footer className="footer">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms & Conditions</a>
            <div className="social-link">
              <span role="img" aria-label="discord">
                👾
              </span>
              <span>Discord</span>
            </div>
            <div className="social-link">
              <span role="img" aria-label="instagram">
                📸
              </span>
              <span>Instagram</span>
            </div>
          </footer>*/}
        </div>
      </div>
    </>
  );
};

export default Message;
