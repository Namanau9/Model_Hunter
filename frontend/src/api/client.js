import axios from "axios";

// All API traffic goes to /api (proxied to backend in dev, served in prod).
const client = axios.create({
  baseURL: "/api",
  timeout: 600000, // long-running ML jobs
});

export async function apiGet(path, params) {
  const { data } = await client.get(path, { params });
  return data;
}

export async function apiPost(path, body) {
  const { data } = await client.post(path, body);
  return data;
}

export async function apiUpload(path, file) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await client.post(path, form);
  return data;
}

export default client;
