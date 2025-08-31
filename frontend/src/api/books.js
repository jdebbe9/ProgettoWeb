import api from './axios';

export async function listBooks(params = {}) {
  const { data } = await api.get('/books', { params });
  return data?.items || [];
}
export async function createBook(payload) {
  const { data } = await api.post('/books', payload);
  return data;
}
export async function getBook(id) {
  const { data } = await api.get(`/books/${id}`);
  return data;
}
export async function updateBook(id, patch) {
  const { data } = await api.patch(`/books/${id}`, patch);
  return data;
}
export async function deleteBook(id) {
  await api.delete(`/books/${id}`);
}
