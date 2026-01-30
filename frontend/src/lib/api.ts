const API_URL = import.meta.env.VITE_API_URL || '';
export { API_URL };

// Get token from localStorage
const getToken = () => localStorage.getItem('token');

// API helper
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = getToken();

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));

    // Auto-logout on invalid/expired token (only if we had a token)
    if ((res.status === 401 || res.status === 403) && token) {
      // Don't redirect if already redirecting
      if (!(window as any).__lumina_redirecting) {
        (window as any).__lumina_redirecting = true;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/?session_expired=true';
        return;
      }
    }

    throw new Error(error.error || 'Request failed');
  }

  if (res.status === 204) return null;
  return res.json();
}

// Auth
export const auth = {
  register: (email: string, password: string, full_name?: string) =>
    fetchAPI('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    }),

  login: (email: string, password: string) =>
    fetchAPI('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => fetchAPI('/api/auth/me'),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  setSession: (token: string, user: any) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => !!getToken(),
};

// Sessions
export const sessions = {
  list: (userId: string) => fetchAPI(`/api/sessions?userId=${userId}`),
  get: (id: string) => fetchAPI(`/api/sessions/${id}`),
  create: (data: any) => fetchAPI('/api/sessions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => fetchAPI(`/api/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/api/sessions/${id}`, { method: 'DELETE' }),
};

// Clients
export const clients = {
  list: (userId: string) => fetchAPI(`/api/clients?userId=${userId}`),
  get: (id: string) => fetchAPI(`/api/clients/${id}`),
  create: (data: any) => fetchAPI('/api/clients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => fetchAPI(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/api/clients/${id}`, { method: 'DELETE' }),
};

// Users
export const users = {
  getProfile: (id: string) => fetchAPI(`/api/users/profile/${id}`),
  updateProfile: (id: string, data: any) => fetchAPI(`/api/users/profile/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// Espace Client (Photographer side)
export const espaceClient = {
  // Links
  listLinks: (userId: string) => fetchAPI(`/api/espace-client/links?userId=${userId}`),
  createLink: (data: { client_id: string; user_id: string; expires_in_days?: number; send_email?: boolean; event_type_id?: string; template_id?: string }) =>
    fetchAPI('/api/espace-client/links', { method: 'POST', body: JSON.stringify(data) }),
  revokeLink: (id: string, userId: string) =>
    fetchAPI(`/api/espace-client/links/${id}?userId=${userId}`, { method: 'DELETE' }),

  // Event Types
  listEventTypes: (userId?: string) => fetchAPI(`/api/espace-client/event-types?userId=${userId || ''}`),
  createEventType: (data: { user_id: string; name: string; icon?: string }) =>
    fetchAPI('/api/espace-client/event-types', { method: 'POST', body: JSON.stringify(data) }),
  updateEventType: (id: string, data: { name?: string; icon?: string; sort_order?: number }) =>
    fetchAPI(`/api/espace-client/event-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEventType: (id: string) =>
    fetchAPI(`/api/espace-client/event-types/${id}`, { method: 'DELETE' }),

  // Questions
  getQuestions: (eventTypeId: string) => fetchAPI(`/api/espace-client/questions/${eventTypeId}`),

  // Responses
  getResponse: (linkId: string) => fetchAPI(`/api/espace-client/responses/${linkId}`),

  // Templates
  listTemplates: (userId?: string) => fetchAPI(`/api/espace-client/templates?userId=${userId || ''}`),
  getTemplate: (id: string) => fetchAPI(`/api/espace-client/templates/${id}`),
  createTemplate: (data: { user_id: string; event_type_id?: string; name: string; content: string; is_default?: boolean }) =>
    fetchAPI('/api/espace-client/templates', { method: 'POST', body: JSON.stringify(data) }),
  updateTemplate: (id: string, data: any) =>
    fetchAPI(`/api/espace-client/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTemplate: (id: string) => fetchAPI(`/api/espace-client/templates/${id}`, { method: 'DELETE' }),

  // Custom Variables
  listCustomVariables: (userId: string) => fetchAPI(`/api/espace-client/custom-variables?userId=${userId}`),
  createCustomVariable: (data: { user_id: string; var_key: string; label: string; default_value?: string; category?: string }) =>
    fetchAPI('/api/espace-client/custom-variables', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomVariable: (id: string, data: any) =>
    fetchAPI(`/api/espace-client/custom-variables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomVariable: (id: string) => fetchAPI(`/api/espace-client/custom-variables/${id}`, { method: 'DELETE' }),

  // Contracts
  getContract: (linkId: string) => fetchAPI(`/api/espace-client/contracts/${linkId}`),
  generateContract: (data: { client_link_id: string; template_id?: string; user_id: string }) =>
    fetchAPI('/api/espace-client/contracts/generate', { method: 'POST', body: JSON.stringify(data) }),
  updateContract: (id: string, data: { content: string; user_id: string }) =>
    fetchAPI(`/api/espace-client/contracts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  validateContract: (id: string, data: { user_id: string; send_email?: boolean }) =>
    fetchAPI(`/api/espace-client/contracts/${id}/validate`, { method: 'POST', body: JSON.stringify(data) }),
  downloadPDF: (id: string, version?: string) => {
    const url = `${API_URL}/api/espace-client/contracts/${id}/pdf${version ? `?version=${version}` : ''}`;
    window.open(url, '_blank');
  },

  // Audit
  getAuditLogs: (linkId: string) => fetchAPI(`/api/espace-client/audit/${linkId}`),

  // Workflow
  getWorkflow: (linkId: string) => fetchAPI(`/api/espace-client/workflow/${linkId}`),

  // Gallery
  toggleGalleryVisibility: (linkId: string, data: { is_visible: boolean; user_id: string; send_email?: boolean }) =>
    fetchAPI(`/api/espace-client/gallery/${linkId}/visibility`, { method: 'PUT', body: JSON.stringify(data) }),

  // Gallery CRUD
  listGalleries: (userId: string) => fetchAPI(`/api/espace-client/galleries?userId=${userId}`),
  createGallery: (data: { user_id: string; title: string; client_link_id?: string; session_id?: string }) =>
    fetchAPI('/api/espace-client/galleries', { method: 'POST', body: JSON.stringify(data) }),
  getGallery: (id: string) => fetchAPI(`/api/espace-client/galleries/${id}`),
  updateGallery: (id: string, data: any) =>
    fetchAPI(`/api/espace-client/galleries/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGallery: (id: string) => fetchAPI(`/api/espace-client/galleries/${id}`, { method: 'DELETE' }),
  uploadPhotos: (galleryId: string, photos: Array<{ data: string; name: string; mime_type: string }>) =>
    fetchAPI(`/api/espace-client/galleries/${galleryId}/photos`, { method: 'POST', body: JSON.stringify({ photos }) }),
  getGalleryPhotos: (galleryId: string) => fetchAPI(`/api/espace-client/galleries/${galleryId}/photos`),
  deletePhoto: (galleryId: string, photoId: string) =>
    fetchAPI(`/api/espace-client/galleries/${galleryId}/photos/${photoId}`, { method: 'DELETE' }),
  getPhotoUrl: (galleryId: string, photoId: string) =>
    `${API_URL}/api/espace-client/galleries/${galleryId}/photos/${photoId}/file`,
};

// Client Portal (Client side - no auth)
export const clientPortal = {
  getInfo: (token: string) => fetchAPI(`/api/client-portal/${token}`),
  getEventTypes: (token: string) => fetchAPI(`/api/client-portal/${token}/event-types`),
  getQuestionnaire: (token: string, eventTypeId: string) =>
    fetchAPI(`/api/client-portal/${token}/questionnaire/${eventTypeId}`),
  saveQuestionnaire: (token: string, eventTypeId: string, responses: Record<string, any>) =>
    fetchAPI(`/api/client-portal/${token}/questionnaire/${eventTypeId}/save`, {
      method: 'POST',
      body: JSON.stringify({ responses }),
    }),
  validateQuestionnaire: (token: string, eventTypeId: string, responses: Record<string, any>) =>
    fetchAPI(`/api/client-portal/${token}/questionnaire/${eventTypeId}/validate`, {
      method: 'POST',
      body: JSON.stringify({ responses }),
    }),
  getContract: (token: string) => fetchAPI(`/api/client-portal/${token}/contract`),
  downloadPDF: (token: string) => {
    window.open(`${API_URL}/api/client-portal/${token}/contract/pdf`, '_blank');
  },
  signContract: (token: string, signatureData: string) =>
    fetchAPI(`/api/client-portal/${token}/contract/sign`, {
      method: 'POST',
      body: JSON.stringify({ signature_data: signatureData }),
    }),
  getGallery: (token: string) => fetchAPI(`/api/client-portal/${token}/gallery`),
  exportData: (token: string) => fetchAPI(`/api/client-portal/${token}/export`),
};

// Finance
export const finance = {
  // Stats
  getStats: () => fetchAPI('/api/finance/stats'),

  // Documents (invoices & quotes)
  listDocuments: (type?: 'invoice' | 'quote', status?: string) => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (status) params.append('status', status);
    return fetchAPI(`/api/finance/documents?${params}`);
  },
  getDocument: (id: string) => fetchAPI(`/api/finance/documents/${id}`),
  createDocument: (data: any) => fetchAPI('/api/finance/documents', { method: 'POST', body: JSON.stringify(data) }),
  updateDocument: (id: string, data: any) => fetchAPI(`/api/finance/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDocument: (id: string) => fetchAPI(`/api/finance/documents/${id}`, { method: 'DELETE' }),
  convertQuoteToInvoice: (id: string) => fetchAPI(`/api/finance/documents/${id}/convert`, { method: 'POST' }),

  // Payments
  addPayment: (documentId: string, data: any) => fetchAPI(`/api/finance/documents/${documentId}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  deletePayment: (id: string) => fetchAPI(`/api/finance/payments/${id}`, { method: 'DELETE' }),

  // Expenses
  listExpenses: (year?: number, month?: number, category?: string) => {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    if (category) params.append('category', category);
    return fetchAPI(`/api/finance/expenses?${params}`);
  },
  createExpense: (data: any) => fetchAPI('/api/finance/expenses', { method: 'POST', body: JSON.stringify(data) }),
  updateExpense: (id: string, data: any) => fetchAPI(`/api/finance/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExpense: (id: string) => fetchAPI(`/api/finance/expenses/${id}`, { method: 'DELETE' }),
};

// Team
export const team = {
  getMyTeam: () => fetchAPI('/api/team/my-team'),
  updateTeam: (data: { name: string }) => fetchAPI('/api/team/my-team', { method: 'PUT', body: JSON.stringify(data) }),

  // Invitations
  createInvitation: (data: { email: string; role: string; send_email?: boolean }) =>
    fetchAPI('/api/team/invitations', { method: 'POST', body: JSON.stringify(data) }),
  cancelInvitation: (id: string) => fetchAPI(`/api/team/invitations/${id}`, { method: 'DELETE' }),
  getInvitationInfo: (token: string) => fetchAPI(`/api/team/invitations/info/${token}`),
  acceptInvitation: (token: string) => fetchAPI(`/api/team/invitations/accept/${token}`, { method: 'POST' }),

  // Members
  updateMemberRole: (memberId: string, role: string) =>
    fetchAPI(`/api/team/members/${memberId}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  removeMember: (memberId: string) => fetchAPI(`/api/team/members/${memberId}`, { method: 'DELETE' }),
  leaveTeam: () => fetchAPI('/api/team/leave', { method: 'POST' }),
};

// Calendar
export const calendar = {
  getEvents: (start?: string, end?: string, userId?: string) => {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    if (userId) params.append('user_id', userId);
    return fetchAPI(`/api/calendar/events?${params}`);
  },
  getEvent: (id: string) => fetchAPI(`/api/calendar/events/${id}`),
  createEvent: (data: any) => fetchAPI('/api/calendar/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id: string, data: any) => fetchAPI(`/api/calendar/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvent: (id: string) => fetchAPI(`/api/calendar/events/${id}`, { method: 'DELETE' }),

  // Availability
  getAvailability: (userId?: string) => {
    const params = userId ? `?user_id=${userId}` : '';
    return fetchAPI(`/api/calendar/availability${params}`);
  },
  createAvailabilitySlot: (data: any) => fetchAPI('/api/calendar/availability', { method: 'POST', body: JSON.stringify(data) }),
  deleteAvailabilitySlot: (id: string) => fetchAPI(`/api/calendar/availability/${id}`, { method: 'DELETE' }),

  // Public calendar
  getPublicCalendar: (teamId: string, start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    return fetchAPI(`/api/calendar/public/${teamId}?${params}`);
  },
};

// Tasks
export const tasks = {
  list: (filters?: { status?: string; assigned_to?: string; session_id?: string; priority?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to);
    if (filters?.session_id) params.append('session_id', filters.session_id);
    if (filters?.priority) params.append('priority', filters.priority);
    return fetchAPI(`/api/tasks?${params}`);
  },
  getMyTasks: (status?: string) => {
    const params = status ? `?status=${status}` : '';
    return fetchAPI(`/api/tasks/my-tasks${params}`);
  },
  get: (id: string) => fetchAPI(`/api/tasks/${id}`),
  create: (data: any) => fetchAPI('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => fetchAPI(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/api/tasks/${id}`, { method: 'DELETE' }),
  addComment: (taskId: string, content: string) =>
    fetchAPI(`/api/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),

  // Task Templates
  getTemplates: () => fetchAPI('/api/tasks/templates'),
  createTemplate: (data: any) => fetchAPI('/api/tasks/templates', { method: 'POST', body: JSON.stringify(data) }),

  // Workflow Templates
  getWorkflowTemplates: () => fetchAPI('/api/tasks/workflows/templates'),
  getWorkflowTemplate: (id: string) => fetchAPI(`/api/tasks/workflows/templates/${id}`),
  createWorkflowTemplate: (data: any) => fetchAPI('/api/tasks/workflows/templates', { method: 'POST', body: JSON.stringify(data) }),
  executeWorkflow: (templateId: string, data: { session_id?: string; base_date?: string }) =>
    fetchAPI(`/api/tasks/workflows/execute/${templateId}`, { method: 'POST', body: JSON.stringify(data) }),
};

// Notifications
export const notifications = {
  list: (unreadOnly?: boolean, limit?: number) => {
    const params = new URLSearchParams();
    if (unreadOnly) params.append('unread_only', 'true');
    if (limit) params.append('limit', limit.toString());
    return fetchAPI(`/api/notifications?${params}`);
  },
  getUnreadCount: () => fetchAPI('/api/notifications/unread-count'),
  markAsRead: (id: string) => fetchAPI(`/api/notifications/${id}/read`, { method: 'PUT' }),
  markAllAsRead: () => fetchAPI('/api/notifications/read-all', { method: 'PUT' }),
  delete: (id: string) => fetchAPI(`/api/notifications/${id}`, { method: 'DELETE' }),
  clearRead: () => fetchAPI('/api/notifications/clear-read', { method: 'DELETE' }),
};
