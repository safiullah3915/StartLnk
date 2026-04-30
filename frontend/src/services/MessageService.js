import { messageAPI, presenceAPI } from '../utils/apiServices';

class MessageService {
  constructor() {
    this.conversations = [];
    this.currentConversation = null;
    this.messages = {};
    this.onlineUsers = [];
    this.presenceCache = {};
    this.presenceFetchedAt = {};
    this.presenceCacheTtl = 30000;
  }

  async getOnlineUsers() {
    try {
      const response = await presenceAPI.getOnlineUsers();
      this.onlineUsers = response.data;
      return this.onlineUsers;
    } catch (error) {
      console.error('Failed to get online users:', error);
      throw error;
    }
  }


  async getAllUsers() {
    try {
      const response = await presenceAPI.getAllUsers();
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Failed to get all users:', error);
      return [];
    }
  }
  async getUserPresence(userId, options = {}) {
    if (!userId) return { is_online: false, last_seen: null };

    const id = String(userId);
    const now = Date.now();
    const cached = this.presenceCache[id];
    const fetchedAt = this.presenceFetchedAt[id] || 0;

    if (!options.force && cached && now - fetchedAt < this.presenceCacheTtl) {
      return cached;
    }

    const response = await presenceAPI.getUserPresence(id);
    const previous = this.presenceCache[id];
    const presence = response.data || { is_online: false, last_seen: null };
    if (!presence.last_seen && previous?.last_seen) {
      presence.last_seen = previous.last_seen;
    }
    this.presenceCache[id] = presence;
    this.presenceFetchedAt[id] = now;
    return presence;
  }

  async refreshPresenceForUsers(userIds, options = {}) {
    const uniqueIds = Array.from(new Set((userIds || []).filter(Boolean).map(String)));
    const results = await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          return [id, await this.getUserPresence(id, options)];
        } catch (error) {
          console.error('Failed to get user presence:', error);
          return [id, this.presenceCache[id] || { is_online: false, last_seen: null }];
        }
      })
    );
    return Object.fromEntries(results);
  }

  formatPresenceLabel(presence) {
    if (!presence) return '';
    if (presence.is_online) return 'Online';
    if (!presence.last_seen) return 'Offline';

    const lastSeenEpoch = Number(presence.last_seen);
    const nowEpoch = Math.floor(Date.now() / 1000);
    const diffSeconds = Math.max(0, nowEpoch - lastSeenEpoch);
    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffMinutes < 15) {
      if (diffMinutes < 1) {
        return 'Last seen recently just now';
      }
      return `Last seen recently ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    }
    
    return 'Offline';
  }

  async getConversations() {
    try {
      const response = await messageAPI.getConversations();
      // Normalize to a plain array (supports paginated and non-paginated)
      const data = response?.data;
      const list = Array.isArray(data)
        ? data
        : (data && Array.isArray(data.results) ? data.results : []);
      this.conversations = list;
      return list;
    } catch (error) {
      console.error('Failed to get conversations:', error);
      throw error;
    }
  }

  async getConversation(conversationId) {
    try {
      const response = await messageAPI.getConversation(conversationId);
      return response.data;
    } catch (error) {
      console.error('Failed to get conversation:', error);
      throw error;
    }
  }

  async createConversation(participantIds, title = '', startupId = null, memberRoles = {}) {
    try {
      const response = await messageAPI.createConversation({
        participant_ids: participantIds,
        title,
        startup_id: startupId,
        member_roles: memberRoles
      });
      const newConversation = response.data;
      this.conversations.unshift(newConversation);
      return newConversation;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  }

  async getMessages(conversationId) {
    try {
      const response = await messageAPI.getMessages(conversationId);
      this.messages[conversationId] = response.data;
      return response.data;
    } catch (error) {
      console.error('Failed to get messages:', error);
      throw error;
    }
  }

  async removeTeamConversation(conversationId) {
    try {
      await messageAPI.removeTeamConversation(conversationId);
      this.conversations = this.conversations.filter(c => c.id !== conversationId);
      if (this.currentConversation?.id === conversationId) {
        this.currentConversation = null;
      }
      delete this.messages[conversationId];
      return true;
    } catch (error) {
      console.error('Failed to remove team conversation:', error);
      throw error;
    }
  }

  async sendMessage(conversationId, content) {
    try {
      const response = await messageAPI.sendMessage(conversationId, {
        content,
        message_type: 'text'
      });
      const newMessage = response.data;
      
      // Add message to local cache
      if (!this.messages[conversationId]) {
        this.messages[conversationId] = [];
      }
      this.messages[conversationId].push(newMessage);

      // Update conversation's last message and updated_at
      const conversation = this.conversations.find(c => c.id === conversationId);
      if (conversation) {
        conversation.last_message = newMessage;
        conversation.updated_at = newMessage.created_at;
      }

      return newMessage;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }
  async getOrCreateConversation(userId) {
    try {
      // Normalize userId to string for comparison
      const normalizedUserId = String(userId);
      
      // Refresh conversations list to get latest data
      await this.getConversations();
      
      // Check if conversation with this user already exists
      // Compare both with and without dashes since UUIDs can be in different formats
      const existingConversation = this.conversations.find(conv => {
        if (!conv.participants || conv.participants.length !== 2) return false;
        return conv.participants.some(p => {
          const participantId = String(p.id || p);
          // Compare both normalized formats
          return participantId === normalizedUserId || 
                 participantId.replace(/-/g, '') === normalizedUserId.replace(/-/g, '');
        });
      });

      if (existingConversation) {
        return existingConversation;
      }

      // Create new conversation - ensure userId is in correct format (with dashes for UUID)
      let formattedUserId = normalizedUserId;
      // If it's a 32-character hex string without dashes, convert to UUID format
      if (normalizedUserId.length === 32 && !normalizedUserId.includes('-')) {
        formattedUserId = `${normalizedUserId.slice(0,8)}-${normalizedUserId.slice(8,12)}-${normalizedUserId.slice(12,16)}-${normalizedUserId.slice(16,20)}-${normalizedUserId.slice(20)}`;
      }
      
      const newConversation = await this.createConversation([formattedUserId]);
      return newConversation;
    } catch (error) {
      console.error('Failed to get or create conversation:', error);
      throw error;
    }
  }

  setCurrentConversation(conversation) {
    this.currentConversation = conversation;
  }

  getCurrentConversation() {
    return this.currentConversation;
  }

  getConversationMessages(conversationId) {
    return this.messages[conversationId] || [];
  }

  // Helper method to get other participant in a conversation
  getOtherParticipant(conversation, currentUserId) {
    return conversation.participants.find(p => String(p.id) !== String(currentUserId));
  }

  // Format conversation title for display
  getConversationTitle(conversation, currentUserId) {
    if (conversation.title) {
      return conversation.title;
    }
    
    if (conversation.participants.length === 2) {
      const otherUser = this.getOtherParticipant(conversation, currentUserId);
      return otherUser ? otherUser.username : 'Unknown User';
    }
    
    return `Group (${conversation.participants.length} members)`;
  }
}

// Export singleton instance
export default new MessageService();

