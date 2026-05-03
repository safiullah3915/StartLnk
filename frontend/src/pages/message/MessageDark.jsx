import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from '../../components/Navbar/Navbar';
import { useAuth } from '../../contexts/AuthContext';
import MessageService from '../../services/MessageService';
import { userAPI, positionAPI } from '../../utils/apiServices';
import { toast } from 'react-toastify';

const TeamMemberRow = React.memo(({
  member,
  isSelected,
  assignment,
  isDropdownOpen,
  positionOptions,
  onToggleMember,
  onToggleRoleDropdown,
  onSelectRole,
  onCustomRoleChange
}) => (
  <div className="member-item-wrapper">
    <div
      className={`member-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onToggleMember(member)}
    >
      <div className="member-avatar">{member.username.charAt(0).toUpperCase()}</div>
      <div className="member-info">
        <div className="member-name">{member.username}</div>
        <div className="member-email">{member.email}</div>
      </div>
      <div className="select-btn">
        {isSelected ? (
          <svg width="10" height="10" fill="none" stroke="white" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </div>
    {isSelected && (
      <div className="inline-role-row">
        <span className="inline-role-label">POSITION:</span>
        <div className="custom-dropdown-container" style={{ flex: 1 }}>
          <div
            className="custom-dropdown-header"
            onClick={(e) => {
              e.stopPropagation();
              onToggleRoleDropdown(member.id);
            }}
            style={{ border: '1px solid rgba(79, 70, 229, 0.55)', background: '#020617', padding: '0.45rem 0.75rem', minHeight: 'auto', borderRadius: '0.6rem' }}
          >
            <span style={{ fontSize: '0.85rem' }}>{assignment.role === '__other__' ? 'Other' : assignment.role || 'Select position...'}</span>
            <svg className="dropdown-chevron" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', margin: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {isDropdownOpen && (
            <div className="custom-dropdown-list" style={{ top: 'calc(100% + 4px)', zIndex: 1000 }}>
              {positionOptions.map((title) => (
                <div
                  key={title}
                  className={`custom-dropdown-item ${assignment.role === title ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRole(member.id, title);
                  }}
                >
                  {title}
                </div>
              ))}
              <div
                className={`custom-dropdown-item ${assignment.role === '__other__' ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectRole(member.id, '__other__');
                }}
              >
                Other
              </div>
            </div>
          )}
        </div>
        {assignment.role === '__other__' && (
          <input
            type="text"
            className="inline-role-custom-input"
            placeholder="Custom title"
            value={assignment.customRole}
            onChange={(e) => onCustomRoleChange(member.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    )}
  </div>
));

const MessageDark = () => {
  const { user, isEntrepreneur } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [presenceByUser, setPresenceByUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chats'); // 'chats', 'people', 'teams'

  const getDateLabel = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (messageDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [userStartups, setUserStartups] = useState([]);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditTeamLoading, setIsEditTeamLoading] = useState(false);
  const [editingConversation, setEditingConversation] = useState(null);
  const [isRemoveTeamConfirmOpen, setIsRemoveTeamConfirmOpen] = useState(false);
  const [isStartupDropdownOpen, setIsStartupDropdownOpen] = useState(false);
  const [openRoleDropdownId, setOpenRoleDropdownId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [customNotification, setCustomNotification] = useState(null);
  const chatAreaRef = useRef(null);

  useEffect(() => {
    if (customNotification) {
      const timer = setTimeout(() => {
        setCustomNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [customNotification]);

  // Team Modal States
  const [selectedStartup, setSelectedStartup] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [startupPositions, setStartupPositions] = useState([]);
  const [memberAssignments, setMemberAssignments] = useState({});
  const [allUsersForSearch, setAllUsersForSearch] = useState([]);

  // Memoized filtered members to prevent lag during search
  const filteredMembers = React.useMemo(() => {
    const search = memberSearch.toLowerCase();
    return allUsersForSearch.filter(u =>
      u.username.toLowerCase().includes(search) ||
      (u.email || '').toLowerCase().includes(search)
    );
  }, [allUsersForSearch, memberSearch]);

  const activeTeamStartupIds = React.useMemo(() => new Set(
    conversations
      .filter(conv => conv.team_id && conv.startup_id)
      .map(conv => String(conv.startup_id))
  ), [conversations]);

  const createTeamStartupOptions = React.useMemo(() => (
    userStartups.filter(startup =>
      !startup.team_conversation_exists &&
      !activeTeamStartupIds.has(String(startup.id))
    )
  ), [userStartups, activeTeamStartupIds]);

  useEffect(() => {
    if (user) {
      initializeMessaging();
    }
    return () => {
      // Remove empty conversations when leaving the page
      setConversations(prev => prev.filter(c => !!c?.last_message));
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const refreshOnlineUsers = async () => {
      try {
        const onlineUsersData = await MessageService.getOnlineUsers();
        const safeUsers = Array.isArray(onlineUsersData) ? onlineUsersData : [];
        setOnlineUsers(safeUsers.filter(u => u.id !== user.id));
      } catch (error) {
        console.error('Failed to refresh online users:', error);
      }
    };

    const interval = setInterval(refreshOnlineUsers, 5000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const getDirectParticipantIds = () => {
      const ids = conversations
        .map(conv => {
          if (!Array.isArray(conv.participants) || conv.participants.length !== 2) return null;
          return MessageService.getOtherParticipant(conv, user.id)?.id;
        })
        .filter(Boolean);

      if (currentConversation?.participants?.length === 2) {
        const activeUserId = MessageService.getOtherParticipant(currentConversation, user.id)?.id;
        if (activeUserId) ids.push(activeUserId);
      }

      return Array.from(new Set(ids));
    };

    const refreshPresence = async (force = false) => {
      const ids = getDirectParticipantIds();
      if (!ids.length) return;
      const presence = await MessageService.refreshPresenceForUsers(ids, { force });
      setPresenceByUser(prev => ({ ...prev, ...presence }));
    };

    refreshPresence();
    const interval = setInterval(() => refreshPresence(true), 30000);
    return () => clearInterval(interval);
  }, [user, conversations, currentConversation]);

  const getConversationPresence = (conversation) => {
    // Presence should only be shown for one-to-one conversations (2 participants, no team_id)
    if (!conversation?.participants || conversation.participants.length !== 2 || conversation.team_id) return null;
    const otherUser = MessageService.getOtherParticipant(conversation, user?.id);
    return otherUser?.id ? presenceByUser[String(otherUser.id)] : null;
  };

  const isStartupFounderForConversation = (conversation) => {
    if (!conversation?.team_id || !user?.id) return false;
    if (conversation.startup_owner_id) {
      return String(conversation.startup_owner_id) === String(user.id);
    }

    const startup = userStartups.find(s => String(s.id) === String(conversation.startup_id));
    return startup?.owner?.id && String(startup.owner.id) === String(user.id);
  };

  useEffect(() => {
    const loadStartupPositions = async () => {
      if (!selectedStartup?.id) {
        setStartupPositions([]);
        setMemberAssignments({});
        return;
      }

      try {
        const response = await positionAPI.getStartupPositions(selectedStartup.id);
        const positions = response.data?.positions || (Array.isArray(response.data) ? response.data : []);
        setStartupPositions(positions);
        setMemberAssignments({});
      } catch (error) {
        console.error('Failed to load startup positions:', error);
        setStartupPositions([]);
        setMemberAssignments({});
      }
    };

    loadStartupPositions();
  }, [selectedStartup]);

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

  const initializeMessaging = async ({ autoSelectFirst = true } = {}) => {
    try {
      setLoading(true);

      // Load conversations, online users, and user's startups in parallel
      const [conversationsData, onlineUsersData, startupsData] = await Promise.all([
        MessageService.getConversations(),
        MessageService.getOnlineUsers(),
        userAPI.getUserStartups()
      ]);

      const safeConversationsRaw = Array.isArray(conversationsData)
        ? conversationsData
        : (conversationsData && Array.isArray(conversationsData.results) ? conversationsData.results : []);

      const safeConversations = safeConversationsRaw.filter(c => !!c?.last_message || !!c?.team_id);
      const safeUsers = Array.isArray(onlineUsersData) ? onlineUsersData : [];

      // Robust extraction of startups body from axios response
      const startupsBody = Array.isArray(startupsData) ? startupsData : startupsData?.data;
      let safeStartups = [];
      if (Array.isArray(startupsBody)) {
        safeStartups = startupsBody;
      } else if (startupsBody?.data && Array.isArray(startupsBody.data)) {
        safeStartups = startupsBody.data;
      } else if (startupsBody && Array.isArray(startupsBody.results)) {
        safeStartups = startupsBody.results;
      } else if (startupsBody?.startups && Array.isArray(startupsBody.startups)) {
        safeStartups = startupsBody.startups;
      }

      setConversations(safeConversations);
      setOnlineUsers(safeUsers.filter(u => u.id !== user.id)); // Exclude current user
      setUserStartups(safeStartups);

      // Select first conversation if exists and none selected
      if (autoSelectFirst && safeConversations.length > 0 && !currentConversation) {
        await selectConversation(safeConversations[0]);
      }
    } catch (error) {
      console.error('Failed to initialize messaging:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conversation) => {
    try {
      setIsSidebarOpen(false); // Close sidebar immediately on mobile before loading messages
      setCurrentConversation(conversation);
      MessageService.setCurrentConversation(conversation);

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
      // We don't automatically switch tab to 'chats' anymore to allow staying in People/Teams while selecting
    } catch (error) {
      console.error('Failed to load conversation messages:', error);
    }
  };

  const selectUser = async (selectedUser) => {
    try {
      setLoading(true);
      const conversation = await MessageService.getOrCreateConversation(selectedUser.id);

      // Update conversations list if it's a new conversation
      if (!conversations.find(c => c.id === conversation.id)) {
        setConversations(prev => [conversation, ...prev]);
      }

      await selectConversation(conversation);
      setActiveTab('chats');
      setIsSidebarOpen(false); // Close sidebar on mobile
    } catch (error) {
      console.error('Failed to create conversation with user:', error);
      toast.error('Failed to start conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchTeamChat = async () => {
    if (!selectedStartup) {
      toast.error('Please select a startup');
      return;
    }
    if (selectedMembers.length === 0) {
      toast.error('Please add at least one member');
      return;
    }

    const missingAssignments = selectedMembers.some((member) => {
      const assignment = memberAssignments[member.id];
      if (!assignment?.role) return true;
      if (assignment.role === '__other__' && !assignment.customRole?.trim()) return true;
      return false;
    });

    if (missingAssignments) {
      toast.error('Please assign a position for each selected member');
      return;
    }

    try {
      // Show loading and close modal IMMEDIATELY for instant feedback
      setLoading(true);
      setIsTeamModalOpen(false);
      setActiveTab('chats');
      setIsSidebarOpen(false);

      const participantIds = selectedMembers.map(m => m.id);
      const title = selectedStartup.title;

      const memberRoles = {};
      selectedMembers.forEach(member => {
        const assignment = memberAssignments[member.id];
        memberRoles[member.id] = assignment.role === '__other__'
          ? assignment.customRole.trim()
          : assignment.role;
      });

      const conversation = await MessageService.createConversation(
        participantIds,
        title,
        selectedStartup.id,
        memberRoles
      );

      // Refresh the entire state from backend
      await initializeMessaging({ autoSelectFirst: false });
      await selectConversation(conversation);
      setActiveTab('chats');
      setIsSidebarOpen(false);

      setSelectedStartup(null);
      setSelectedMembers([]);
      setStartupPositions([]);
      setMemberAssignments({});
      setEditingConversation(null);

      // Determine specialized success message for better UX
      let successMsg = isEditMode ? 'Team updated successfully!' : 'Team chat launched!';
      if (isEditMode) {
        const removedName = conversation.removed_member_names?.[0];

        if (conversation.member_added && conversation.member_removed) {
          successMsg = 'Team members updated successfully!';
        } else if (conversation.member_added) {
          successMsg = 'New member added successfully!';
        } else if (conversation.member_removed) {
          successMsg = removedName
            ? `${removedName} removed successfully!`
            : 'Member removed successfully!';
        }
      }

      setCustomNotification({
        type: 'success',
        message: successMsg
      });
    } catch (error) {
      console.error('Failed to launch team chat:', error);

      // Even if API fails, we refresh to ensure state is clean and spinner finishes
      await initializeMessaging();

      let backendError = error.response?.data?.member_roles || error.response?.data?.detail;

      // Handle server busy scenario
      if (!backendError && error.response?.status >= 500) {
        backendError = "Server is busy, try again later.";
      }

      // Handle DRF array errors
      if (Array.isArray(backendError)) {
        backendError = backendError[0];
      }

      // Show professional error message for the end user
      const isBusy = error.response?.status >= 500;
      setCustomNotification({
        type: 'error',
        message: isBusy
          ? 'Server is busy. Please try again later.'
          : 'Unable to process your request. Please try again.'
      });
    } finally {
      // Ensure loading is off in case initializeMessaging didn't handle it
      setLoading(false);
    }
  };

  const handleEditTeamClick = async (conversation) => {
    try {
      setIsEditTeamLoading(true);
      setIsSidebarOpen(false);
      setIsEditMode(true);
      setEditingConversation(conversation);

      // Prefer the backend relationship over title matching. Older chats may have titles like "Name Team".
      const normalizedConversationTitle = (conversation.startup_title || conversation.title || '')
        .replace(/\s+Team$/i, '')
        .trim()
        .toLowerCase();
      const startup = userStartups.find(s => String(s.id) === String(conversation.startup_id))
        || userStartups.find(s => s.title?.trim().toLowerCase() === normalizedConversationTitle)
        || (conversation.startup_id ? {
          id: conversation.startup_id,
          title: conversation.startup_title || conversation.title?.replace(/\s+Team$/i, '') || conversation.title
        } : null);
      if (!startup) {
        setCustomNotification({ type: 'error', message: "Could not find associated startup" });
        return;
      }

      setSelectedStartup(startup);

      const users = await MessageService.getAllUsers();
      const filteredUsers = users.filter(u => u.id !== user?.id);

      // Pre-populate members and roles
      const teamRoles = conversation.team_roles || {};
      const selectedMems = [];
      const assignments = {};

      Object.keys(teamRoles).forEach(userId => {
        const memberUser = users.find(u => u.id === userId);
        if (memberUser && userId !== user?.id) {
          selectedMems.push(memberUser);
          assignments[userId] = {
            role: teamRoles[userId],
            customRole: ''
          };
        }
      });

      // Sort users: selected first
      const sortedUsers = [...filteredUsers].sort((a, b) => {
        const aSelected = Object.keys(teamRoles).includes(a.id);
        const bSelected = Object.keys(teamRoles).includes(b.id);
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;
        return a.username.localeCompare(b.username);
      });

      setAllUsersForSearch(sortedUsers);
      setSelectedMembers(selectedMems);
      setMemberAssignments(assignments);
      setIsTeamModalOpen(true);
    } catch (error) {
      console.error("Failed to setup edit mode:", error);
      setCustomNotification({ type: 'error', message: "Failed to load team data" });
    } finally {
      setIsEditTeamLoading(false);
    }
  };

  const closeTeamModal = () => {
    setIsTeamModalOpen(false);
    setIsEditMode(false);
    setEditingConversation(null);
    setIsRemoveTeamConfirmOpen(false);
  };

  const handleRemoveTeamChat = async () => {
    if (!editingConversation?.id) return;
    const conversationId = editingConversation.id;

    try {
      // Close popups immediately for instant feedback
      setIsRemoveTeamConfirmOpen(false);
      setIsTeamModalOpen(false);

      setLoading(true);
      await MessageService.removeTeamConversation(conversationId);

      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
        MessageService.setCurrentConversation(null);
      }

      // Final cleanup
      setIsEditMode(false);
      setEditingConversation(null);

      await initializeMessaging();
      setCustomNotification({
        type: 'success',
        message: 'Team and associated chat removed successfully'
      });
    } catch (error) {
      console.error('Failed to remove team chat:', error);

      // Professional error messaging for the end user
      const isBusy = error.response?.status >= 500;
      setCustomNotification({
        type: 'error',
        message: isBusy
          ? 'Server is busy. Please try again in a moment.'
          : 'Unable to process your request. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim() !== '' && currentConversation?.can_send !== false && user) {
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

        // Update conversation in the list to show latest message
        setConversations(prev => prev.map(conv =>
          conv.id === currentConversation.id
            ? { ...conv, last_message: newMessage, updated_at: newMessage.created_at }
            : conv
        ));
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  };

  const selectedMemberIds = React.useMemo(
    () => new Set(selectedMembers.map(member => member.id)),
    [selectedMembers]
  );

  const positionOptions = React.useMemo(() => Array.from(
    new Set(
      startupPositions
        .map((position) => position?.title?.trim())
        .filter(Boolean)
    )
  ), [startupPositions]);

  const updateMemberAssignment = React.useCallback((memberId, updates) => {
    setMemberAssignments((prev) => ({
      ...prev,
      [memberId]: {
        role: '',
        customRole: '',
        ...(prev[memberId] || {}),
        ...updates
      }
    }));
  }, []);

  const handleToggleMember = React.useCallback((member) => {
    setSelectedMembers(prev => {
      const isSelected = prev.some(selected => selected.id === member.id);
      return isSelected
        ? prev.filter(selected => selected.id !== member.id)
        : [...prev, member];
    });

    setMemberAssignments(prev => {
      if (prev[member.id]) {
        const updated = { ...prev };
        delete updated[member.id];
        return updated;
      }

      return {
        ...prev,
        [member.id]: { role: '', customRole: '' }
      };
    });
  }, []);

  const handleToggleRoleDropdown = React.useCallback((memberId) => {
    setOpenRoleDropdownId(prev => prev === memberId ? null : memberId);
  }, []);

  const handleSelectRole = React.useCallback((memberId, role) => {
    updateMemberAssignment(memberId, { role, customRole: '' });
    setOpenRoleDropdownId(null);
  }, [updateMemberAssignment]);

  const handleCustomRoleChange = React.useCallback((memberId, customRole) => {
    updateMemberAssignment(memberId, { customRole });
  }, [updateMemberAssignment]);

  return (
    <>
      <style>
        {`
        :root {
          --bg-dark: #0a0e17;
          --bg-sidebar: #0d121f;
          --bg-card: #151b2b;
          --primary: #4f46e5;
          --primary-hover: #4338ca;
          --text-main: #e2e8f0;
          --text-muted: #94a3b8;
          --accent-blue: #3b82f6;
          --accent-purple: #8b5cf6;
          --glass-bg: rgba(255, 255, 255, 0.03);
          --glass-border: rgba(255, 255, 255, 0.1);
        }

        html, body {
          background-color: var(--bg-dark) !important;
          margin: 0;
          padding: 0;
        }

        .app-container {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 80px);
          width: 100%;
          background-color: var(--bg-dark);
          padding: 1rem;
          margin-top: 80px;
          box-sizing: border-box;
          overflow: hidden;
        }

        .main-wrapper {
          background-color: var(--bg-sidebar);
          border-radius: 1.5rem;
          border: 1px solid var(--glass-border);
          display: flex;
          height: 100%;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          position: relative;
        }

        /* --- Sidebar --- */
        .sidebar {
          width: 320px;
          border-right: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          background-color: var(--bg-sidebar);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 50;
        }

        .mobile-sidebar-close {
          display: none;
          background: transparent;
          border: none;
          color: white;
          padding: 8px;
          cursor: pointer;
        }

        .sidebar-header {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .search-container {
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          width: 1.25rem;
        }

        /* Force override with high specificity */
        #messaging-root-container .sidebar-search,
        #messaging-root-container .force-dark-input {
          background-color: #020617 !important;
          background: #020617 !important;
          border: 1px solid var(--glass-border) !important;
          border-radius: 0.5rem !important;
          padding: 0.6rem 1rem 0.6rem 3rem !important;
          color: #ffffff !important;
          outline: none !important;
          font-size: 0.875rem !important;
          transition: border-color 0.2s !important;
        }

        #messaging-root-container .message-input-wrapper {
          background-color: #020617 !important;
          background: #020617 !important;
          border: 1px solid var(--glass-border) !important;
          border-radius: 0.75rem !important;
        }

        #messaging-root-container .message-input-wrapper input {
          background-color: transparent !important;
          background: transparent !important;
          color: #ffffff !important;
          border: none !important;
        }

        /* Segmented Tabs */
        .tab-switcher {
          display: flex;
          background: #111827;
          border-radius: 0.75rem;
          padding: 0.25rem;
          margin-bottom: 0.5rem;
        }

        .tab-btn {
          flex: 1;
          padding: 0.5rem;
          border-radius: 0.5rem;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-muted);
          background: transparent;
          transition: all 0.2s;
          cursor: pointer;
        }

        .tab-btn.active {
          background: var(--primary);
          color: white;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
        }

        .sidebar-content {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem 1rem;
        }

        .sidebar-content::-webkit-scrollbar {
          width: 4px;
        }
        .sidebar-content::-webkit-scrollbar-thumb {
          background: var(--glass-border);
          border-radius: 10px;
        }

        .list-section-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.05em;
          margin: 0.5rem 0 0.75rem 0.5rem;
          text-transform: uppercase;
        }

        .chat-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem;
          border-radius: 1rem;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 0.25rem;
        }

        .chat-item:hover {
          background: var(--glass-bg);
        }

        .chat-item.active {
          background: rgba(79, 70, 229, 0.15);
          border: 1px solid rgba(79, 70, 229, 0.3);
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), var(--accent-purple));
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
          flex-shrink: 0;
          position: relative;
        }

        .status-dot {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid var(--bg-sidebar);
          background: #10b981;
        }

        .status-dot.offline {
          background: #64748b;
        }


        .chat-info {
          flex: 1;
          min-width: 0;
        }

        .chat-name-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.125rem;
        }

        .chat-name {
          font-weight: 700 !important;
          font-size: 0.9375rem;
          color: #ffffff !important;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chat-time {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .chat-snippet {
          font-size: 0.8125rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .unread-badge {
          background: var(--accent-blue);
          color: white;
          font-size: 0.75rem;
          padding: 0.125rem 0.4rem;
          border-radius: 999px;
          min-width: 1rem;
          text-align: center;
        }

        /* Teams Tab Cards */
        .team-building-card {
          background: linear-gradient(135deg, rgba(79, 70, 229, 0.1), rgba(139, 92, 246, 0.1));
          border: 1px dashed var(--primary);
          padding: 1.25rem;
          border-radius: 1rem;
          margin-bottom: 1.5rem;
        }

        .team-card-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: white;
        }

        .team-card-desc {
          font-size: 0.8125rem;
          color: var(--text-muted);
          line-height: 1.4;
          margin-bottom: 1rem;
        }

        .create-btn {
          width: 100%;
          background: var(--primary);
          color: white;
          padding: 0.6rem;
          border-radius: 0.75rem;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .create-btn:hover {
          background: var(--primary-hover);
        }

        /* --- Chat Area --- */
        .chat-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          background-color: var(--bg-dark);
        }

        .chat-header {
          padding: 1rem 1.5rem;
          background: var(--bg-sidebar);
          border-bottom: 1px solid var(--glass-border);
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .hamburger-menu {
          display: none;
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
        }

        .header-avatar {
          width: 44px;
          height: 44px;
        }

        .header-info {
          display: flex;
          flex-direction: column;
        }

        .header-name {
          font-weight: 700;
          font-size: 1.0625rem;
          color: white;
        }

        .header-status {
          font-size: 0.8125rem;
          color: #10b981;
          font-weight: 500;
        }

        .header-status.offline {
          color: #64748b;
        }


        .message-viewport {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          background-image: radial-gradient(circle at center, #1a2235 0%, #0a0e17 100%);
        }

        .message-viewport::-webkit-scrollbar {
          width: 6px;
        }
        .message-viewport::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }

        .beginning-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          margin: 1.5rem 0;
          color: var(--text-muted);
        }

        .beginning-icon {
          width: 2.5rem;
          height: 2.5rem;
          padding: 0.6rem;
          background: var(--glass-bg);
          border-radius: 0.5rem;
          border: 1px solid var(--glass-border);
        }

        .msg-bubble-container {
          display: flex;
          flex-direction: column;
          max-width: 60%;
          align-items: flex-start;
        }

        .msg-bubble-container.self {
          align-self: flex-end;
          align-items: flex-end;
        }

        .msg-sender-name {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 0.375rem;
          margin-left: 0.5rem;
          text-transform: uppercase;
        }

        .self .msg-sender-name {
          margin-right: 0.5rem;
          margin-left: 0;
        }

        .msg-bubble {
          display: inline-block;
          width: fit-content;
          max-width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 1rem;
          font-size: 0.875rem;
          line-height: 1.4;
          position: relative;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .msg-bubble.other {
          background: #1e293b;
          border-top-left-radius: 0.25rem;
          color: var(--text-main);
        }

        .msg-bubble.self {
          background: linear-gradient(135deg, var(--primary), var(--accent-purple));
          border-top-right-radius: 0.25rem;
          color: white;
        }

        .msg-footer {
          display: flex;
          justify-content: flex-end;
          margin-top: 0.25rem;
        }

        .msg-time {
          font-size: 0.6875rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .other .msg-time {
          color: var(--text-muted);
        }

        /* --- Footer Input --- */
        .input-area {
          padding: 1rem 1.5rem;
          background-color: var(--bg-sidebar);
          border-top: 1px solid var(--glass-border);
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .message-input-wrapper {
          flex: 1;
          background: #020617 !important;
          border: 1px solid var(--glass-border) !important;
          border-radius: 0.75rem;
          padding: 0.4rem 1rem;
          display: flex;
          align-items: center;
        }

        .message-input-wrapper input {
          width: 100%;
          background: transparent !important;
          border: none !important;
          color: white !important;
          padding: 0.6rem 0;
          outline: none;
          font-size: 0.9375rem;
        }

        .send-btn-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }

        .send-btn-circle:not(:disabled):hover {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
          transform: scale(1.05);
        }

        /* --- Modal --- */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .modal-content {
          width: 440px !important;
          max-width: calc(100vw - 2rem) !important;
          margin: 0 1rem;
          background: #0f172a;
          border-radius: 1.25rem;
          border: 1px solid var(--glass-border);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative !important; /* Critical for absolute close btn */
        }

        /* Custom Dropdown Styling */
        #team-modal-root .custom-dropdown-container {
          position: relative;
          width: 100%;
        }

        #team-modal-root .custom-dropdown-header {
          width: 100% !important;
          background: #020617 !important;
          border: 1.5px solid var(--glass-border) !important;
          border-radius: 0.85rem !important;
          padding: 0.85rem 1.25rem !important;
          color: #ffffff !important;
          font-size: 0.875rem !important;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer !important;
          min-height: 48px;
        }

        #team-modal-root .dropdown-chevron {
          margin-left: 1rem;
          color: var(--text-muted);
          transition: transform 0.2s;
        }

        #team-modal-root .custom-dropdown-list {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: #020617 !important;
          border: 1px solid var(--glass-border);
          border-radius: 1rem !important;
          padding: 0.5rem;
          z-index: 200 !important;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.4);
          max-height: 200px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        #team-modal-root .custom-dropdown-item {
          padding: 0.5rem 0.85rem !important;
          border-radius: 0.5rem;
          color: #ffffff !important;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.2s;
          margin-bottom: 2px;
        }

        #team-modal-root .custom-dropdown-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        #team-modal-root .custom-dropdown-item.selected {
          background: var(--primary);
          color: white;
        }

        .modal-header {
          padding: 1.25rem 1.25rem 0.75rem 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.5rem;
          font-weight: 800;
          color: white;
        }

        .close-icon-btn-style {
          position: absolute !important;
          top: 25px !important;
          right: 15px !important;
          z-index: 9999 !important;
          background: rgba(255, 255, 255, 0.1) !important;
          border-radius: 50% !important;
          width: 34px !important;
          height: 34px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          border: none !important;
        }

        .close-icon-btn-style:hover {
          background: rgba(255, 255, 255, 0.2) !important;
        }

        .modal-body {
          padding: 1.25rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .modal-field-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .modal-label {
          font-size: 0.6875rem;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .custom-select {
          width: 100%;
          background: #020617 !important;
          border: 1px solid var(--glass-border) !important;
          border-radius: 0.75rem;
          padding: 0.75rem 1rem !important;
          color: white !important;
          font-size: 0.875rem;
          outline: none;
          appearance: auto;
          cursor: pointer;
        }

        .custom-select option {
          background: #020617 !important;
          color: white !important;
        }

        #team-modal-root .modal-search-input {
          background-color: #020617 !important;
          background: #020617 !important;
          color: #ffffff !important;
          border: 1px solid var(--glass-border) !important;
          width: 100% !important;
          padding-left: 3.5rem !important;
        }

        .member-list-scroll {
          max-height: 220px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding-right: 0.5rem;
        }

        .member-list-scroll::-webkit-scrollbar {
          width: 5px;
        }

        .member-list-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }

        .member-list-scroll::-webkit-scrollbar-thumb {
          background: var(--primary);
          border-radius: 10px;
        }

        .member-list-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--accent-blue);
        }

        .member-item-wrapper {
          display: flex;
          flex-direction: column;
          margin-bottom: 0.25rem;
        }

        .inline-role-row {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.55rem 0.75rem 0.55rem 1rem;
          /*background: rgba(79, 70, 229, 0.08);
          border: 1px solid rgba(79, 70, 229, 0.35);
          border-top: none;
          border-radius: 0 0 0.75rem 0.75rem;*/
        }

        .inline-role-label {
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          white-space: nowrap;
          min-width: 3.5rem;
        }

        .inline-role-select {
          flex: 1;
          padding: 0.45rem 0.75rem !important;
          border: 1px solid rgba(79, 70, 229, 0.55) !important;
          border-radius: 0.6rem !important;
          background: #020617 !important;
          color: #ffffff !important;
          font-size: 0.85rem !important;
          outline: none !important;
          box-sizing: border-box !important;
          cursor: pointer;
        }

        #team-modal-root .inline-role-custom-input {
          flex: 1;
          padding: 0.35rem 0.75rem !important;
          border: 1px solid var(--glass-border) !important;
          border-radius: 0.6rem !important;
          background-color: #020617 !important;
          background: #020617 !important;
          color: #ffffff !important;
          font-size: 0.85rem !important;
          outline: none !important;
          box-sizing: border-box !important;
        }

        /* Loading Spinner */
        .loader-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          width: 100%;
        }

        .themed-spinner {
          width: 38px;
          height: 38px;
          border: 3px solid rgba(79, 70, 229, 0.1);
          border-top: 3px solid var(--primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .member-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 0.75rem;
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          transition: border-color 0.2s;
        }

        .member-item.selected {
          border-color: var(--primary);
          background: rgba(79, 70, 229, 0.1);
        }

        .member-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.8rem;
        }

        .member-info {
          flex: 1;
        }

        .member-name {
          font-weight: 600;
          font-size: 0.875rem;
          color: white;
        }

        .member-email {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .select-btn {
          width: 1.25rem;
          height: 1.25rem;
          border-radius: 50%;
          border: 2px solid var(--glass-border);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .selected .select-btn {
          background: var(--primary);
          border-color: var(--primary);
        }

        .modal-footer {
          padding: 1.25rem;
          background: rgba(0,0,0,0.2);
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
        }

        .cancel-btn {
          background: transparent;
          color: var(--text-muted);
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
        }

        .cancel-btn:hover {
          color: white;
          background: rgba(255, 255, 255, 0.05);
        }

        .cancel-btn:hover {
          color: white;
        }

        .launch-btn {
          background: linear-gradient(135deg, var(--primary), var(--accent-purple));
          padding: 0.875rem 2.5rem;
          border-radius: 0.875rem;
          font-weight: 800;
          color: white;
          box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);
          transition: transform 0.2s;
        }

        .launch-btn:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .launch-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* --- Mobile Responsive --- */
        @media (max-width: 768px) {
          .app-container {
            padding: 0;
            margin-top: 79px; /* Slightly reduced to ensure complete overlap and no gaps */
            height: calc(100vh - 79px);
          }
          
          .main-wrapper {
            border-radius: 0;
            border: none;
          }

          .sidebar {
            position: fixed;
            top: 80px; /* Margin from top to respect Navbar */
            left: 0;
            bottom: 0;
            width: 85%;
            max-width: 320px;
            height: calc(100vh - 80px);
            transform: translateX(-100%);
            box-shadow: 20px 0 50px rgba(0,0,0,0.5);
            z-index: 1001 !important;
          }

          .sidebar.is-open {
            transform: translateX(0);
          }

          .sidebar-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            z-index: 1000 !important;
            backdrop-filter: blur(4px);
          }

          .sidebar-overlay.active {
            display: block;
          }

          .mobile-sidebar-close {
            display: block;
            margin-bottom: 0.5rem;
          }

          .hamburger-menu {
            display: block;
            z-index: 1100 !important;
            position: relative;
          }

          .chat-main {
            width: 100%;
          }

          .header-name {
            font-size: 1.1rem;
          }
        }

        @keyframes slideDown {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        
        `}
      </style>
      <Navbar />

      <div className="app-container" id="messaging-root-container">
        {customNotification && (
          <div style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            padding: '12px 24px',
            borderRadius: '12px',
            backgroundColor: '#0f172a',
            color: customNotification.type === 'error' ? '#f87171' : '#4ade80',
            border: `1px solid ${customNotification.type === 'error' ? 'rgba(248, 113, 113, 0.2)' : 'rgba(74, 222, 128, 0.2)'}`,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.9rem',
            fontWeight: '600',
            animation: 'slideDown 0.3s ease-out forwards',
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}>
            {customNotification.type === 'error' ? (
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : (
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            {customNotification.message}
          </div>
        )}
        <div className="main-wrapper">
          {/* Mobile Sidebar Overlay */}
          <div
            className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
            onClick={() => setIsSidebarOpen(false)}
          ></div>

          {/* Sidebar */}
          <aside
            className={`sidebar ${isSidebarOpen ? 'is-open' : ''}`}
            onClick={(e) => {
              // Only close if clicking the sidebar itself (not items inside)
              if (e.target.closest('.chat-item')) return;
              if (e.target.closest('.tab-switcher')) return;
              if (e.target.closest('.search-container')) return;
              if (e.target.closest('.team-building-card')) return;

              if (window.innerWidth <= 768) {
                setIsSidebarOpen(false);
              }
            }}
          >
            <div className="sidebar-header">
              <button className="mobile-sidebar-close" onClick={() => setIsSidebarOpen(false)}>
                <svg width="24" height="24" fill="none" style={{ visibility: 'hidden' }} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="search-container">
                <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search..."
                  className="sidebar-search bg-[#020617] text-white pl-12 !bg-[#020617] !text-white"
                  style={{ background: '#020617', color: '#ffffff', paddingLeft: '3rem' }}
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                />
              </div>

              <div className="tab-switcher">
                <button
                  className={`tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
                  onClick={() => setActiveTab('chats')}
                >
                  Chats
                </button>
                <button
                  className={`tab-btn ${activeTab === 'people' ? 'active' : ''}`}
                  onClick={() => setActiveTab('people')}
                >
                  People
                </button>
                <button
                  className={`tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
                  onClick={() => setActiveTab('teams')}
                >
                  Teams
                </button>
              </div>
            </div>

            <div className="sidebar-content">
              {!loading && activeTab === 'chats' && (
                <>
                  <div className="list-section-title">Recent Conversations</div>
                  {conversations
                    .filter(c => MessageService.getConversationTitle(c, user?.id).toLowerCase().includes(sidebarSearch.toLowerCase()))
                    .map(conv => {
                      const title = MessageService.getConversationTitle(conv, user?.id);
                      const lastMsg = conv.last_message?.content || "No messages yet";
                      const presence = getConversationPresence(conv);
                      return (
                        <div
                          key={conv.id}
                          className={`chat-item ${currentConversation?.id === conv.id ? 'active' : ''}`}
                          onClick={() => selectConversation(conv)}
                        >
                          <div className="avatar">
                            {title.charAt(0).toUpperCase()}
                            {presence && <div className={`status-dot ${presence.is_online ? '' : 'offline'}`}></div>}
                          </div>
                          <div className="chat-info">
                            <div className="chat-name-row">
                              <span className="chat-name">{title}</span>
                              <span className="chat-time">{new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="chat-snippet">
                              {lastMsg}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </>
              )}

              {!loading && activeTab === 'people' && (
                <>
                  <div className="list-section-title">RELEVANT ONLINE USERS ONLY</div>
                  {onlineUsers
                    .filter(u => u.username.toLowerCase().includes(sidebarSearch.toLowerCase()))
                    .map(u => (
                      <div
                        key={u.id}
                        className="chat-item"
                        onClick={() => selectUser(u)}
                      >
                        <div className="avatar">
                          {u.username.charAt(0).toUpperCase()}
                          <div className="status-dot"></div>
                        </div>
                        <div className="chat-info">
                          <div className="chat-name">{u.username}</div>
                          <div className="chat-snippet">{u.email}</div>
                        </div>
                      </div>
                    ))}
                </>
              )}

              {!loading && activeTab === 'teams' && (
                <>
                  {isEntrepreneur && isEntrepreneur() && (
                    <div className="team-building-card">
                      <div className="team-card-title">
                        <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--primary)' }}>
                          <path d="M12.876 1.104l-11.75 3.518a.75.75 0 00-.518.898l2.673 8.91c.048.16.14.3.262.405l7.91 6.843a.75.75 0 001.129 0l7.91-6.843a.75.75 0 00.262-.405l2.673-8.91a.75.75 0 00-.518-.898l-10-3zM12 2.375L20.25 4.85l-2.008 6.691L12 17.5l-6.242-5.959L3.75 4.85 12 2.375z" />
                        </svg>
                        Team Building
                      </div>
                      <p className="team-card-desc">Create a team associated with your startup and collaborate in real-time.</p>
                      <button className="create-btn" onClick={async () => {
                        setIsEditMode(false);
                        setEditingConversation(null);
                        setSelectedStartup(null);
                        setSelectedMembers([]);
                        setMemberAssignments({});
                        setIsTeamModalOpen(true);
                        try {
                          const users = await MessageService.getAllUsers();
                          setAllUsersForSearch(users.filter(u => u.id !== user?.id));
                        } catch (e) {
                          console.error('Failed to load users for team modal:', e);
                        }
                      }}>
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create New Team
                      </button>
                    </div>
                  )}

                  {/* {userStartups.some(s => s.has_approved_applications && (!s.team_exists || !s.team_conversation_exists)) && (
                    <div style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      color: 'var(--accent)',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      marginBottom: '1rem',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      textAlign: 'center'
                    }}>
                     No team created yet. Create a team to start collaboration.
                    </div>
                  )}*/}

                  <div className="list-section-title">STARTUP TEAMS</div>
                  {conversations
                    .filter(c => c.team_id)
                    .map(conv => (
                      <div
                        key={conv.id}
                        className={`chat-item ${currentConversation?.id === conv.id ? 'active' : ''}`}
                        onClick={() => selectConversation(conv)}
                      >
                        <div className="avatar" style={{ background: 'var(--bg-card)' }}>
                          <svg width="20" height="20" fill="var(--primary)" viewBox="0 0 24 24">
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                          </svg>
                        </div>
                        <div className="chat-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', overflow: 'hidden' }}>
                          <div style={{ minWidth: 0 }}>
                            <div className="chat-name">{conv.title}</div>
                            {/*<div className="chat-snippet" style={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                              {conv.title}
                            </div>*/}
                          </div>
                          {isStartupFounderForConversation(conv) && (
                            <button
                              className="edit-team-dots"
                              type="button"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleEditTeamClick(conv);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255,255,255,0.5)',
                                padding: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                borderRadius: '50%',
                                transition: 'background 0.2s'
                              }}
                              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                              onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                            >
                              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </>
              )}
            </div>
          </aside>

          {/* Chat Main Area */}
          <main className="chat-main">
            {loading || isEditTeamLoading ? (
              <div className="loader-container" style={{ position: 'relative' }}>
                <button
                  className="hamburger-menu"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  style={{ position: 'absolute', top: '20px', left: '20px', display: 'block' }}
                >
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="themed-spinner"></div>
              </div>
            ) : currentConversation ? (
              <>
                {(() => {
                  const activePresence = getConversationPresence(currentConversation);
                  const activeStatus = activePresence
                    ? MessageService.formatPresenceLabel(activePresence)
                    : '';
                  return (
                    <header className="chat-header" style={{ position: 'relative', zIndex: 1100 }}>
                      <button className="hamburger-menu" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </button>
                      <div className="avatar header-avatar">
                        {MessageService.getConversationTitle(currentConversation, user?.id).charAt(0).toUpperCase()}
                      </div>
                      <div className="header-info">
                        <span className="header-name">{MessageService.getConversationTitle(currentConversation, user?.id)}</span>
                        {activeStatus && <span className={`header-status ${activeStatus === 'Online' ? '' : 'offline'}`}>{activeStatus}</span>}
                      </div>
                    </header>
                  );
                })()}

                <div className="message-viewport" ref={chatAreaRef}>
                  {messages.map((msg, idx) => {
                    const msgDateLabel = getDateLabel(msg.created_at);
                    const prevMsgDateLabel = idx > 0 ? getDateLabel(messages[idx - 1].created_at) : null;
                    const showDateSeparator = msgDateLabel !== prevMsgDateLabel;

                    const dateSeparator = showDateSeparator && (
                      <div className="system-message-container" style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginTop: '0.5rem',
                        marginBottom: '0.5rem',
                        width: '100%'
                      }}>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          letterSpacing: '0.15em',
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                          textAlign: 'center',
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          padding: '6px 16px',
                          borderRadius: '20px',
                          border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                          {msgDateLabel}
                        </span>
                      </div>
                    );

                    if (msg.is_system) {
                      const previousIsSystem = messages[idx - 1]?.is_system;
                      const nextIsSystem = messages[idx + 1]?.is_system;
                      return (
                        <React.Fragment key={msg.id || idx}>
                          {dateSeparator}
                          <div className="system-message-container" style={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginTop: '0.5rem',
                            marginBottom: '0.5rem',
                            width: '100%'
                          }}>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              letterSpacing: '0.15em',
                              color: 'var(--text-muted)',
                              textTransform: 'uppercase',
                              textAlign: 'center',
                              backgroundColor: 'rgba(255,255,255,0.05)',
                              padding: '6px 16px',
                              borderRadius: '20px',
                              border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                              {msg.content}
                            </span>
                          </div>
                        </React.Fragment>
                      );
                    }

                    const senderId = msg.sender?.id || msg.sender;
                    const isSelf = senderId === user?.id;
                    const role = currentConversation?.team_roles?.[senderId];
                    const senderName = msg.sender?.username || (isSelf ? user?.username : null) || 'User';
                    const displayName = role ? `${senderName} (${role})` : senderName;

                    return (
                      <React.Fragment key={msg.id || idx}>
                        {dateSeparator}
                        <div className={`msg-bubble-container ${isSelf ? 'self' : 'other'}`}>
                          {!isSelf && <span className="msg-sender-name">{displayName}</span>}
                          {isSelf && <span className="msg-sender-name" style={{ textAlign: 'right' }}>You</span>}
                          <div className={`msg-bubble ${isSelf ? 'self' : 'other'}`}>
                            {msg.content}
                            <div className="msg-footer">
                              <span className="msg-time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>

                <div className="input-area">
                  <div className="message-input-wrapper bg-[#020617] !bg-[#020617]" style={{ background: '#020617' }}>
                    <input
                      type="text"
                      placeholder={currentConversation?.can_send === false ? 'You were removed from this team' : 'Type a message...'}
                      className="bg-transparent text-white !text-white"
                      style={{
                        background: 'transparent',
                        color: '#ffffff',
                        opacity: currentConversation?.can_send === false ? 0.55 : 1,
                        cursor: currentConversation?.can_send === false ? 'not-allowed' : 'text'
                      }}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && currentConversation?.can_send !== false && handleSendMessage()}
                      disabled={currentConversation?.can_send === false}
                    />
                  </div>
                  <button
                    className="send-btn-circle"
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || currentConversation?.can_send === false}
                    title={currentConversation?.can_send === false ? 'You were removed from this team' : 'Send message'}
                  >
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.917H12.75a.75.75 0 010 1.5H4.984l-2.432 7.918a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'grid', placeContent: 'center', textAlign: 'center', height: '100%', position: 'relative' }}>
                <button
                  className="hamburger-menu"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  style={{ position: 'absolute', top: '20px', left: '20px', display: 'block' }}
                >
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div>
                  <h3 style={{ color: '#ffffff', fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.75rem' }}>
                    No conversation started here
                  </h3>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {isTeamModalOpen && (
        <div className="modal-overlay" onClick={closeTeamModal}>
          <div
            className="modal-content"
            id="team-modal-root"
            onClick={(e) => {
              e.stopPropagation();
              if (isStartupDropdownOpen) setIsStartupDropdownOpen(false);
              setOpenRoleDropdownId(null);
            }}
            style={{ position: 'relative' }}
          >
            {/* CLOSE BUTTON - FORCED VISIBILITY */}
            <button
              onClick={closeTeamModal}
              className="unique-team-modal-close-btn"
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                zIndex: 999999,
                backgroundColor: '#4f46e5', /* Theme Background Color */
                background: '#4f46e5',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none',
                padding: '0',
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                appearance: 'none',
                WebkitAppearance: 'none'
              }}
            >
              <div style={{ position: 'relative', width: '14px', height: '14px' }}>
                <div style={{
                  position: 'absolute',
                  top: '6px',
                  left: '0',
                  width: '14px',
                  height: '2px',
                  background: '#FFFFFF',
                  transform: 'rotate(45deg)',
                  borderRadius: '1px'
                }}></div>
                <div style={{
                  position: 'absolute',
                  top: '6px',
                  left: '0',
                  width: '14px',
                  height: '2px',
                  background: '#FFFFFF',
                  transform: 'rotate(-45deg)',
                  borderRadius: '1px'
                }}></div>
              </div>
            </button>

            <div className="modal-header">
              <div className="modal-title">
                <div style={{ background: 'var(--primary)', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                  <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
                    <path d="M12.876 1.104l-11.75 3.518a.75.75 0 00-.518.898l2.673 8.91c.048.16.14.3.262.405l7.91 6.843a.75.75 0 001.129 0l7.91-6.843a.75.75 0 00.262-.405l2.673-8.91a.75.75 0 00-.518-.898l-10-3z" />
                  </svg>
                </div>
                {isEditMode ? 'Edit Team' : 'Build Your Team'}
              </div>
            </div>

            <div className="modal-body">
              <div className="modal-field-group">
                <label className="modal-label">SELECT STARTUP</label>
                <div className="custom-dropdown-container">
                  <div
                    className={`custom-dropdown-header ${isEditMode ? 'disabled' : ''}`}
                    onClick={(e) => {
                      if (isEditMode) return;
                      e.stopPropagation();
                      setIsStartupDropdownOpen(!isStartupDropdownOpen);
                    }}
                    style={isEditMode ? { opacity: 0.7, cursor: 'not-allowed', background: 'rgba(255,255,255,0.05)' } : {}}
                  >
                    <span>{selectedStartup ? selectedStartup.title : 'Choose a startup...'}</span>
                    <svg className="dropdown-chevron" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: isStartupDropdownOpen ? 'rotate(180deg)' : 'none' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {isStartupDropdownOpen && (
                    <div className="custom-dropdown-list">
                      {(isEditMode ? userStartups : createTeamStartupOptions).length === 0 ? (
                        <div className="custom-dropdown-item" style={{ opacity: 0.6, cursor: 'default' }}>
                          {isEditMode ? 'No startups created...' : 'All eligible startups already have teams...'}
                        </div>
                      ) : (
                        (isEditMode ? userStartups : createTeamStartupOptions).map(s => (
                          <div
                            key={s.id}
                            className={`custom-dropdown-item ${selectedStartup?.id === s.id ? 'selected' : ''}`}
                            onClick={() => { setSelectedStartup(s); setIsStartupDropdownOpen(false); }}
                          >
                            {s.title}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-field-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="modal-label">ADD MEMBERS</label>
                  <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: '700' }}>
                    {selectedMembers.length} Selected
                  </span>
                </div>
                <div className="search-container" style={{ marginBottom: '1rem' }}>
                  <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search people by name or username..."
                    className="sidebar-search modal-search-input"
                    style={{ background: '#020617', color: '#ffffff', paddingLeft: '3rem' }}
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                </div>

                <div className="member-list-scroll">
                  {filteredMembers.map(member => (
                    <TeamMemberRow
                      key={member.id}
                      member={member}
                      isSelected={selectedMemberIds.has(member.id)}
                      assignment={memberAssignments[member.id] || { role: '', customRole: '' }}
                      isDropdownOpen={openRoleDropdownId === member.id}
                      positionOptions={positionOptions}
                      onToggleMember={handleToggleMember}
                      onToggleRoleDropdown={handleToggleRoleDropdown}
                      onSelectRole={handleSelectRole}
                      onCustomRoleChange={handleCustomRoleChange}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {isEditMode && (
                <button
                  className="cancel-btn"
                  onClick={() => setIsRemoveTeamConfirmOpen(true)}
                  style={{
                    marginRight: 'auto',
                    borderColor: 'rgba(248, 113, 113, 0.45)',
                    color: '#f87171',
                    background: 'rgba(248, 113, 113, 0.08)',
                    whiteSpace: 'nowrap',
                    fontSize: '0.82rem',
                    padding: '0.75rem 1.4rem',
                    minWidth: '150px',
                    height: '44px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  Remove Team Chat
                </button>
              )}
              {!isEditMode && <button className="cancel-btn" onClick={closeTeamModal}>Cancel</button>}
              <button
                className="launch-btn"
                onClick={handleLaunchTeamChat}
                disabled={!selectedStartup || selectedMembers.length === 0}
                style={isEditMode ? {
                  whiteSpace: 'nowrap',
                  fontSize: '0.82rem',
                  padding: '0.75rem 1.4rem',
                  minWidth: '150px',
                  height: '44px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                } : {}}
              >
                {isEditMode ? 'Save Changes' : 'Launch Team Chat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isRemoveTeamConfirmOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsRemoveTeamConfirmOpen(false)}
          style={{ zIndex: 1000000 }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(420px, calc(100vw - 32px))',
              padding: '1.5rem',
              border: '1px solid rgba(248, 113, 113, 0.25)'
            }}
          >
            <div className="modal-title" style={{ marginBottom: '0.75rem' }}>
              Remove Team Chat
            </div>
            <p style={{
              margin: 0,
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              fontSize: '0.95rem'
            }}>
              Are you sure to remove this startup?
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              paddingTop: '1.25rem',
              background: 'transparent'
            }}>
              <button
                className="launch-btn"
                onClick={handleRemoveTeamChat}
                style={{
                  background: '#dc2626',
                  boxShadow: '0 10px 20px rgba(220, 38, 38, 0.25)',
                  minWidth: '110px',
                  height: '42px',
                  padding: '0 1.2rem'
                }}
              >
                Remove
              </button>
              <button
                className="cancel-btn"
                onClick={() => setIsRemoveTeamConfirmOpen(false)}
                style={{
                  minWidth: '110px',
                  height: '42px',
                  padding: '0 1.2rem',
                  border: '1px solid rgba(255,255,255,0.12)'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MessageDark;
