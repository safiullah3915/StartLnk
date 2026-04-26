import apiClient from './axiosConfig';
import { normalizeId } from './idUtils';

const withStartupId = (id) => normalizeId(id);

// Authentication endpoints
export const authAPI = {
  signup: (userData) => apiClient.post('/signup', userData),
  login: (credentials) => apiClient.post('/auth/login', credentials),
  logout: () => apiClient.post('/auth/logout'),
  verifyEmail: (token) => apiClient.post('/auth/verify', { token }),
  forgotPassword: (email) => apiClient.post('/auth/forget-password', { email }),
  refresh: () => apiClient.post('/auth/refresh'),
  sendVerificationCode: (email) => apiClient.post('/auth/send-verification-code', { email }),
  testAuth: () => apiClient.get('/auth/test'),
  testCookie: () => apiClient.get('/auth/cookie-test'),
  getAccountByToken: (token) => apiClient.get(`/account/${token}`),
};

// User management endpoints
export const userAPI = {
  getProfile: () => apiClient.get('/api/users/profile'),
  getProfileDetail: () => apiClient.get('/api/users/profile-detail'),
  updateProfile: (data) => apiClient.put('/api/users/profile', data),
  patchProfile: (data) => apiClient.patch('/api/users/profile', data),
  getProfileData: () => apiClient.get('/api/users/profile-data'),
  updateProfileData: (data) => apiClient.patch('/api/users/profile-data', data),
  getUserStartups: () => apiClient.get('/api/users/startups'),
  getUserStartupsWithApplications: () => apiClient.get('/api/users/startups/with-applications'),
  getUserApplications: () => apiClient.get('/api/users/applications'),
  getUserFavorites: () => apiClient.get('/api/users/favorites'),
  getUserInterests: () => apiClient.get('/api/users/interests'),
  getPeople: (q = '') => apiClient.get('/api/people', { params: q ? { q } : {} }),
  getUserByEmail: (email) => apiClient.get(`/api/search?q=${encodeURIComponent(email)}&type=user`),
  recordProfileView: (userId) => apiClient.post(`/api/people/${userId}/view`),
};

// Startup management endpoints
export const startupAPI = {
  createStartup: (startupData) => apiClient.post('/api/startups', startupData),
  getStartup: (id) => apiClient.get(`/api/startups/${withStartupId(id)}`),
  updateStartup: (id, data) => apiClient.put(`/api/startups/${withStartupId(id)}`, data),
  patchStartup: (id, data) => apiClient.patch(`/api/startups/${withStartupId(id)}`, data),
  deleteStartup: (id) => apiClient.delete(`/api/startups/${withStartupId(id)}`),
  getStartupApplications: (id) => apiClient.get(`/api/startups/${withStartupId(id)}/applications`),
  getStartupPositions: (id) => apiClient.get(`/api/startups/${withStartupId(id)}/positions`),
  createStartupPosition: (id, positionData) => apiClient.post(`/api/startups/${withStartupId(id)}/positions`, positionData),
  getStartupInterests: (id) => apiClient.get(`/api/startups/${withStartupId(id)}/interests`),
  expressInterest: (id, data = {}) => {
    const normalizedId = withStartupId(id);
    return apiClient.post(`/api/startups/${normalizedId}/interest`, data);
  },
  toggleFavorite: (id) => {
    const normalizedId = withStartupId(id);
    return apiClient.post(`/api/startups/${normalizedId}/favorite`, {});
  },
  deleteFavorite: (id) => {
    const normalizedId = withStartupId(id);
    return apiClient.delete(`/api/startups/${normalizedId}/favorite`);
  },
  convertToMarketplace: (id, data) => apiClient.post(`/api/startups/${withStartupId(id)}/convert-to-marketplace`, data),
};

// Position management endpoints
export const positionAPI = {
  getAllPositions: (params) => apiClient.get('/api/positions', { params }), // Get all available positions for job search
  getPosition: (id) => apiClient.get(`/api/positions/${id}`),
  updatePosition: (id, data) => apiClient.put(`/api/positions/${id}`, data),
  patchPosition: (id, data) => apiClient.patch(`/api/positions/${id}`, data),
  deletePosition: (id) => apiClient.delete(`/api/positions/${id}`),
  closePosition: (id) => apiClient.post(`/api/positions/${id}/close`),
  openPosition: (id) => apiClient.post(`/api/positions/${id}/open`),
  getStartupPositions: (startupId) => apiClient.get(`/api/startups/${withStartupId(startupId)}/positions`),
  createPosition: (startupId, positionData) => apiClient.post(`/api/startups/${withStartupId(startupId)}/positions`, positionData),
  getPositionApplications: (positionId) => apiClient.get(`/api/positions/${positionId}/applications`),
};

// Application management endpoints
export const applicationAPI = {
  applyForCollaboration: (id, applicationData) => apiClient.post(`/api/collaborations/${id}/apply`, applicationData),
  approveApplication: (id) => apiClient.post(`/api/applications/${id}/approve`),
  declineApplication: (id) => apiClient.post(`/api/applications/${id}/decline`),
};

// Marketplace & Discovery endpoints
export const marketplaceAPI = {
  getMarketplace: (params) => apiClient.get('/api/marketplace', { params }),
  getCollaborations: (params) => apiClient.get('/api/collaborations', { params }),
  search: (query) => apiClient.get('/api/search', { params: { q: query } }),
  getStats: () => apiClient.get('/api/stats'),
};

// Search endpoints
export const searchAPI = {
  searchStartups: (queryString) => apiClient.get(`/api/search?${queryString}`),
  searchMarketplace: (params) => apiClient.get('/api/marketplace', { params }),
  searchCollaborations: (params) => apiClient.get('/api/collaborations', { params }),
};

// Notification endpoints
export const notificationAPI = {
  getNotifications: () => apiClient.get('/api/notifications'),
  markAsRead: (id) => apiClient.post(`/api/notifications/${id}/read`),
  markAllAsRead: () => apiClient.post('/api/notifications/read-all'),
};

// Messaging endpoints
export const messageAPI = {
  getConversations: () => apiClient.get('/api/messages'),
  createConversation: (data) => apiClient.post('/api/messages', data),
  getConversation: (id) => apiClient.get(`/api/messages/${id}`),
  getMessages: (conversationId) => apiClient.get(`/api/messages/${conversationId}/messages`),
  sendMessage: (conversationId, messageData) => apiClient.post(`/api/messages/${conversationId}/messages`, messageData),
  getOnlineUsers: () => apiClient.get('/api/messages/users/online'),
};

// File upload endpoints
export const uploadAPI = {
  uploadFile: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
      onUploadProgress
    });
  },
  uploadResume: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/api/upload/resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
      onUploadProgress
    });
  },
  uploadStartupImage: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/api/upload/startup-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
      onUploadProgress
    });
  },
  uploadProfilePicture: (file, originalFile = null, cropData = null, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    if (originalFile) {
      formData.append('original_file', originalFile);
    }
    if (cropData) {
      formData.append('crop_data', JSON.stringify(cropData));
    }
    return apiClient.post('/api/upload/profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
      onUploadProgress
    });
  },
  getUserUploads: () => apiClient.get('/api/uploads'),
};

// Recommendation system endpoints
export const recommendationAPI = {
  // Onboarding preferences
  getOnboardingPreferences: () => apiClient.get('/api/onboarding/preferences'),
  saveOnboardingPreferences: (preferences) => apiClient.post('/api/onboarding/preferences', preferences),
  updateOnboardingPreferences: (preferences) => apiClient.patch('/api/onboarding/preferences', preferences),
  
  // Explicit feedback (preserved for future model training)
  likeStartup: (startupId) => {
    const normalizedId = withStartupId(startupId);
    return apiClient.post(`/api/startups/${normalizedId}/like`, {});
  },
  
  unlikeStartup: (startupId) => {
    const normalizedId = withStartupId(startupId);
    return apiClient.delete(`/api/startups/${normalizedId}/unlike`);
  },
  
  dislikeStartup: (startupId) => {
    const normalizedId = withStartupId(startupId);
    return apiClient.post(`/api/startups/${normalizedId}/dislike`, {});
  },
  
  undislikeStartup: (startupId) => {
    const normalizedId = withStartupId(startupId);
    return apiClient.delete(`/api/startups/${normalizedId}/undislike`);
  },
  
  getStartupInteractionStatus: (startupId) => apiClient.get(`/api/startups/${withStartupId(startupId)}/interaction-status`),
};

// Export the configured axios client for custom requests
export { apiClient };

// Helper function to check if user is authenticated
export const isAuthenticated = () => {
  return !!document.cookie.split(';').find(row => row.trim().startsWith('token='));
};