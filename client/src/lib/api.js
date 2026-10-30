import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// High-speed client cache for read-heavy GET requests
const clientCache = new Map();

function getCacheKey(url, params) {
  return `${url}:${params ? JSON.stringify(params) : ''}`;
}

// Request interceptor: return cached response immediately (0ms)
api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();

  // Any mutation (POST, PUT, DELETE, PATCH) immediately flushes the client cache
  if (method !== 'get') {
    clientCache.clear();
    return config;
  }

  // Real-time seat lock state must NEVER be cached
  const isSeatEndpoint = config.url && config.url.includes('/seats');
  if (config.noCache || isSeatEndpoint) {
    return config;
  }

  // Cache safe public GET endpoints (movies, cities, movie details, shows)
  const isCacheable = config.url && config.url.startsWith('/public/');
  if (isCacheable) {
    const key = getCacheKey(config.url, config.params);
    const cachedEntry = clientCache.get(key);
    if (cachedEntry && Date.now() < cachedEntry.expiresAt) {
      config.adapter = () => {
        return Promise.resolve({
          data: cachedEntry.data,
          status: 200,
          statusText: 'OK (Cache)',
          headers: {},
          config,
          request: {},
        });
      };
    }
  }

  return config;
});

// Response interceptor to store in cache & normalize errors
api.interceptors.response.use(
  (response) => {
    const config = response.config;
    const method = (config.method || 'get').toLowerCase();

    if (method === 'get' && config.url && config.url.startsWith('/public/') && !config.url.includes('/seats')) {
      const key = getCacheKey(config.url, config.params);
      // Cache for 20 seconds
      clientCache.set(key, {
        data: response.data,
        expiresAt: Date.now() + 20 * 1000,
      });
    }

    return response;
  },
  (error) => {
    const customError = {
      message: error.response?.data?.error || error.message || 'Something went wrong',
      code: error.response?.data?.code || 'UNKNOWN_ERROR',
      status: error.response?.status || 500,
      details: error.response?.data?.details,
    };
    return Promise.reject(customError);
  }
);

api.clearCache = () => clientCache.clear();

export default api;
