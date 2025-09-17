// frontend/src/api/articles.js
import api from './axios';

export async function listArticles(params = {}) {
  const { data } = await api.get('/articles', { params });
  return data?.items || [];
}

export async function listPublishedArticles(params = {}) {
  const { data } = await api.get('/articles/public', { params });
  return data?.items || [];
}

export async function getPublishedArticle(id) {
  const { data } = await api.get(`/articles/public/${id}`);
  return data;
}

export async function createArticle(payload) {
  const { data } = await api.post('/articles', payload);
  return data;
}

export async function getArticle(id) {
  const { data } = await api.get(`/articles/${id}`);
  return data;
}

export async function updateArticle(id, patch) {
  const { data } = await api.patch(`/articles/${id}`, patch);
  return data;
}

export async function deleteArticle(id) {
  await api.delete(`/articles/${id}`);
}


