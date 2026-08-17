import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

const api = axios.create({ baseURL: `${API_URL}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cc_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
export { API_URL };

export function cropStyle(listing) {
  const x = listing.cropX ?? 50;
  const y = listing.cropY ?? 50;
  const z = listing.zoom ?? 1;
  return {
    objectFit: "cover",
    objectPosition: `${x}% ${y}%`,
    width: "100%",
    height: "100%",
    transform: `scale(${z})`,
  };
}
