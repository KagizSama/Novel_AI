import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Inject JWT token into every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        refresh_token: refreshToken,
                    });
                    localStorage.setItem('access_token', res.data.access_token);
                    localStorage.setItem('refresh_token', res.data.refresh_token);
                    originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
                    return api(originalRequest);
                } catch {
                    localStorage.clear();
                    window.location.href = '/login';
                }
            } else {
                localStorage.clear();
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    googleAuth: (idToken) => api.post('/auth/google', { id_token: idToken }),
    getProfile: () => api.get('/auth/me'),
    refresh: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
};

// Agent API
export const agentAPI = {
    chat: (query, sessionId) => api.post('/agent/chat', { query, session_id: sessionId }),
};

// Chat History API
export const chatHistoryAPI = {
    getSessions: () => api.get('/chat/sessions'),
    createSession: (title) => api.post('/chat/sessions', { title: title || 'New Chat' }),
    getMessages: (sessionId) => api.get(`/chat/sessions/${sessionId}/messages`),
    deleteSession: (sessionId) => api.delete(`/chat/sessions/${sessionId}`),
    renameSession: (sessionId, title) => api.patch(`/chat/sessions/${sessionId}`, { title }),
};

// Crawler API (admin)
export const crawlerAPI = {
    crawl: (url) => api.post('/crawl', { url }),
    batchCrawl: (listUrl, limit) => api.post('/batch', { list_url: listUrl, limit }),
    getJobStatus: (jobId) => api.get(`/crawler/${jobId}/status`),
};

// Search API
export const searchAPI = {
    search: (query) => api.get('/search', { params: { q: query } }),
};

// Library API (direct DB)
export const libraryAPI = {
    getGenres: () => api.get('/library/genres'),
    getStories: (params) => api.get('/library/stories', { params }),
    getStoryDetail: (id) => api.get(`/library/stories/${id}`),
};

export default api;
