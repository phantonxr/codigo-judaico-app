import { apiFetch } from './apiClient.js'

export function getMyBooks() {
  return apiFetch('/api/books')
}

export function getBookCatalog() {
  return apiFetch('/api/books/catalog')
}

export function createBookCheckoutSession(bookIds) {
  return apiFetch('/api/books/checkout-sessions', {
    method: 'POST',
    body: JSON.stringify({ bookIds }),
  })
}

export function getBookDownloadUrl(bookId) {
  return `/api/books/${encodeURIComponent(bookId)}/download`
}
