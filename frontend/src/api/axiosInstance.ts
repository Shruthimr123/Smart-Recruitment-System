import axios, { AxiosHeaders } from "axios";
import { addInactiveUserInterceptor } from "./interceptors";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_MAIN_APP_ENDPOINT,
  headers: new AxiosHeaders({ "Content-Type": "application/json" }),
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    console.log("token from localStorage:", token);

    if (token) {
      if (!(config.headers instanceof AxiosHeaders)) {
        config.headers = new AxiosHeaders(config.headers);
      }
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

addInactiveUserInterceptor(axiosInstance);

export default axiosInstance;
