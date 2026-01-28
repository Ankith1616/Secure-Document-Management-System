import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    // OTP-enabled flows
    requestRegistrationOTP: (data) => api.post('/auth/register/request-otp', data),
    verifyRegistrationOTP: (data) => api.post('/auth/register/verify-otp', data),
    requestLoginOTP: (data) => api.post('/auth/login/request-otp', data),
    verifyLoginOTP: (data) => api.post('/auth/login/verify-otp', data),

    // Legacy flows
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    requestPasswordResetOTP: (data) => api.post('/auth/forgot-password/request', data),
    verifyPasswordResetOTP: (data) => api.post('/auth/forgot-password/verify', data),
    resetPassword: (data) => api.post('/auth/forgot-password/reset', data),
    getCurrentUser: () => api.get('/auth/me')
};

// Documents API
export const documentsAPI = {
    upload: (formData) => {
        return api.post('/documents/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },

    getAll: (params) => api.get('/documents', { params }),

    updateStatus: (encodedId, status) => {
        return api.patch(`/documents/${encodedId}/status`, { status });
    },

    download: (encodedId) => {
        return api.get(`/documents/${encodedId}/download`, {
            responseType: 'blob'
        });
    },

    delete: (encodedId) => api.delete(`/documents/${encodedId}`),
    getDeletedHistory: () => api.get('/documents/deleted-history')
};

// Audit API
export const auditAPI = {
    getLogs: (params) => api.get('/audit-logs', { params }),
    clearLogs: () => api.delete('/audit-logs')
};

export default api;
