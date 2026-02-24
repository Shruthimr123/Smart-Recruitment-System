import axios, { AxiosHeaders } from "axios";

const axiosTestInstance = axios.create({
  baseURL: import.meta.env.VITE_MAIN_APP_ENDPOINT,
  withCredentials: true,
});

// Request interceptor for test routes
axiosTestInstance.interceptors.request.use(
  (config) => {
    // Get token from URL for test routes
    const pathname = window.location.pathname;
    const testRouteMatch = pathname.match(/\/test\/([^\/]+)/);
    
    if (testRouteMatch && testRouteMatch[1]) {
      const token = testRouteMatch[1];
      if (!(config.headers instanceof AxiosHeaders)) {
        config.headers = new AxiosHeaders(config.headers);
      }
      config.headers.set("Authorization", `Bearer ${token}`);
    }

    // Don't set Content-Type for FormData - browser will set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// No redirect interceptor for test instance
export default axiosTestInstance;