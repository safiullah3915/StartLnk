import apiClient from './axiosConfig';

const BASE = '/api/portal';

export const portalAPI = {
  getStats: () => apiClient.get(`${BASE}/stats`),
  getStartups: (params = {}) => apiClient.get(`${BASE}/startups`, { params }),
  getStartup: (id) => apiClient.get(`${BASE}/startups/${id}/detail`),
  updateStartup: (id, data) => apiClient.patch(`${BASE}/startups/${id}/detail`, data),
  verifyStartup: (id, verification_status) =>
    apiClient.patch(`${BASE}/startups/${id}/verify`, { verification_status }),
  getUsers: (params = {}) => apiClient.get(`${BASE}/users`, { params }),
};
