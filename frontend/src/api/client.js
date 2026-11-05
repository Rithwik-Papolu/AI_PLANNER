/**
 * AI Planner API Client.
 * Connects directly to FastAPI backend gateway endpoints.
 */

const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}`;
      try {
        const errJson = await res.json();
        errorMsg = errJson.detail || errorMsg;
      } catch (e) {
        // fallback
      }
      throw new Error(errorMsg);
    }
    return await res.json();
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'}] ${url}:`, err);
    throw err;
  }
}

export const api = {
  // Task management
  getTasks: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.category) query.append('category', params.category);
    if (params.importance) query.append('importance', params.importance);
    if (params.search) query.append('search', params.search);
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.sort_order) query.append('sort_order', params.sort_order);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/tasks${qs}`);
  },
  getTaskById: (id) => request(`/tasks/${id}`),
  createTask: (data) => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id, data) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  completeTask: (id) => request(`/tasks/${id}/complete`, { method: 'POST' }),
  reopenTask: (id) => request(`/tasks/${id}/reopen`, { method: 'POST' }),
  recalculatePriorities: () => request('/tasks/recalculate-priorities', { method: 'POST' }),

  // Natural Language Task Intake (Method 2)
  extractNLPTasks: (query) => request('/tasks/extract-nlp', { method: 'POST', body: JSON.stringify({ query }) }),
  confirmExtractedTasks: (tasks) => request('/tasks/confirm-extracted', { method: 'POST', body: JSON.stringify(tasks) }),

  // Dashboard & Analytics
  getDashboardStats: () => request('/dashboard/stats'),
  getAnalytics: () => request('/analytics'),

  // Timetable
  getTimetable: (date) => request(date ? `/timetable?date=${date}` : '/timetable'),
  generateTimetable: (data) => request('/timetable/generate', { method: 'POST', body: JSON.stringify(data) }),
  updateTimetable: (id, data) => request(`/timetable/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  reschedule: (data) => request('/timetable/reschedule', { method: 'POST', body: JSON.stringify(data) }),

  // AI Chatbot
  sendChatMessage: (message, sessionId = 'default') =>
    request('/chat', { method: 'POST', body: JSON.stringify({ message, session_id: sessionId, channel: 'text' }) }),
  getChatHistory: (sessionId = 'default') => request(`/chat/history?session_id=${sessionId}`),
  clearChatHistory: (sessionId = 'default') => request(`/chat/history?session_id=${sessionId}`, { method: 'DELETE' }),

  // AI Voice Assistant
  sendVoiceInteraction: (transcript, requireWakeWord = false) =>
    request('/voice/interact', {
      method: 'POST',
      body: JSON.stringify({ transcript, session_id: 'voice_session', require_wake_word: requireWakeWord })
    }),
  sendAudioRecording: async (audioBlob, requireWakeWord = false) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('session_id', 'voice_session');
    formData.append('require_wake_word', requireWakeWord ? 'true' : 'false');
    const res = await fetch('/api/voice/transcribe-audio', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`Audio upload failed: ${res.status}`);
    return await res.json();
  },
  getVoiceDiagnostics: () => request('/voice/diagnostics'),

  // Reminders
  getReminders: () => request('/reminders'),
  dismissReminder: (id) => request(`/reminders/${id}/dismiss`, { method: 'POST' }),

  // User Preferences
  getPreferences: () => request('/preferences'),
  updatePreferences: (data) => request('/preferences', { method: 'PUT', body: JSON.stringify(data) }),

  // Task History
  getHistory: (params = {}) => {
    const q = new URLSearchParams();
    if (params.task_id) q.append('task_id', params.task_id);
    if (params.action) q.append('action', params.action);
    if (params.limit) q.append('limit', params.limit);
    if (params.offset) q.append('offset', params.offset);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request(`/history${qs}`);
  }
};
