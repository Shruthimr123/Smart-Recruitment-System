import axios from "axios";

const axiosProctorInstance = axios.create({
  baseURL: import.meta.env.VITE_PROCTORING_APP_ENDPOINT,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

export default axiosProctorInstance;
