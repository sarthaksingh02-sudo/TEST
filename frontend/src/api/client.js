import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
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

// Get filtered graph (POST with filters)
export const getFilteredGraph = (sessionId = 'default', filters = {}) =>
  api.post(`/graph/${sessionId}`, {
    entity_types: filters.entity_types || null,
    specific_nodes: filters.specific_nodes || null,
    min_connection_strength: filters.min_connection_strength || 1,
    preset: filters.preset || 'default',
  })

// Legacy: get graph (unfiltered)
export const getGraph = () => api.get('/graph')

// Search nodes in a session
export const searchNodes = (sessionId = 'default', query = '') =>
  api.get(`/graph/${sessionId}/nodes?q=${encodeURIComponent(query)}`)

export const addAdHocNode = (sessionId = 'default', query = '') =>
  api.post(`/graph/${sessionId}/ad_hoc`, { query })

// Session management
export const createSession = (name, description = '') =>
  api.post('/session', { name, description })

export const listSessions = () => api.get('/sessions')

export const getSession = (sessionId) => api.get(`/session/${sessionId}`)

export const deleteSession = (sessionId) => api.delete(`/session/${sessionId}`)
