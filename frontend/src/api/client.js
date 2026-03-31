import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 300000, // 5 minutes (Increased for heavy ML OCR processing)
})

// Upload a PDF to a session
export const uploadPDF = (file, sessionId = 'default', onProgress) => {
  const form = new FormData()
  form.append('file', file)
  return api.post(`/upload?session_id=${sessionId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  })
}

// Query the RAG engine
export const queryDocuments = (question, sessionId = 'default') =>
  api.post('/query', { question, session_id: sessionId })

// Extract structured table
export const extractTableParameters = (sessionId = 'default', parameters = []) =>
  api.post(`/table/${sessionId}`, { parameters })

export const autoSuggestParameters = (sessionId = 'default') =>
  api.get(`/table/${sessionId}/auto-suggest`)

// Session management
export const createSession = (name, description = '') =>
  api.post('/session', { name, description })

export const listSessions = () => api.get('/sessions')

export const getSession = (sessionId) => api.get(`/session/${sessionId}`)

export const deleteSession = (sessionId) => api.delete(`/session/${sessionId}`)

export const clearSessionDocuments = (sessionId) => api.delete(`/session/${sessionId}/documents`)

// Chat history (MongoDB-backed persistence)
export const getChatHistory = (sessionId, limit = 50) =>
  api.get(`/chat-history/${sessionId}?limit=${limit}`)

export const clearChatHistory = (sessionId) =>
  api.delete(`/chat-history/${sessionId}`)

// Health check (includes DB + ML model status)
export const getHealthStatus = () => api.get('/health')
