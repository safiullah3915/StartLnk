import apiClient from './axiosConfig';

const BASE = '/api/portal';

export const portalAPI = {
  getStats: () => apiClient.get(`${BASE}/stats`),
  getStartups: (params = {}) => apiClient.get(`${BASE}/startups`, { params }),
  verifyStartup: (id, verification_status) =>
    apiClient.patch(`${BASE}/startups/${id}/verify`, { verification_status }),
  getUsers: (params = {}) => apiClient.get(`${BASE}/users`, { params }),
};
