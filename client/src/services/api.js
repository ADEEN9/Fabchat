import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const userInfo = localStorage.getItem("fabchat_user");
  if (userInfo) {
    const { token } = JSON.parse(userInfo);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses (expired/invalid token)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Check if the error is about account deactivation
      if (error.response?.data?.message?.includes("deactivat")) {
        localStorage.removeItem("fabchat_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default API;
