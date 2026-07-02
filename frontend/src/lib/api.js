import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const http = axios.create({ baseURL: API });

export const projectsApi = {
  list: () => http.get("/projects").then((r) => r.data),
  get: (id) => http.get(`/projects/${id}`).then((r) => r.data),
  create: (data) => http.post("/projects", data).then((r) => r.data),
  update: (id, data) => http.put(`/projects/${id}`, data).then((r) => r.data),
  remove: (id) => http.delete(`/projects/${id}`).then((r) => r.data),
};

export const entriesApi = {
  list: (projectId) =>
    http.get(`/projects/${projectId}/entries`).then((r) => r.data),
  create: (projectId, data) =>
    http.post(`/projects/${projectId}/entries`, data).then((r) => r.data),
  update: (entryId, data) =>
    http.put(`/entries/${entryId}`, data).then((r) => r.data),
  remove: (entryId) => http.delete(`/entries/${entryId}`).then((r) => r.data),
};

export const statsApi = {
  get: () => http.get("/stats").then((r) => r.data),
};

export const shareApi = {
  getToken: () => http.get("/share/token").then((r) => r.data),
  rotate: () => http.post("/share/rotate").then((r) => r.data),
  getShared: (token) => http.get(`/share/${token}`).then((r) => r.data),
};
