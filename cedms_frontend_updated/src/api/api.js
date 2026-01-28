import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const registerUser = (username, password, role) => api.post('/auth/register', { username, password, role });
export const loginUser = (username, password) => api.post('/auth/login', { username, password });
export const verifyOtp = (userId, otp) => api.post('/auth/verify-otp', { userId, otp });

export const getDocuments = () => api.get('/documents');
export const uploadDocument = (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const verifyDocument = (id) => api.get(`/documents/${id}/verify`);
export const downloadDocument = (id) => api.get(`/documents/${id}/download`, { responseType: 'blob' });

export default api;
