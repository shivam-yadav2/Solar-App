import { http, qs } from '../api';

// Endpoints added on the web on 2026-11-02/03: fixing mistakes, follow-ups, help assistant.

export interface MaintenanceVisit {
  id: string; projectId: string; customerId: string; dueDate: string; visitType: string; status: 'Scheduled' | 'Done' | 'Skipped';
  doneDate?: string; assignedStaff?: string; notes?: string; projectName?: string; customId?: string; customerName?: string; customerMobile?: string;
}

export const care = {
  // payments
  movePayment: (id: string, projectId: string) => http.post<{ message: string }>(`/payments/${id}/move`, { projectId }),
  deletePayment: (id: string, reason: string) => http.del<{ message: string }>(`/payments/${id}`, { reason }),
  sendPaymentReminder: (projectId: string, again = false) => http.post<{ message: string; via: string[] }>(`/projects/${projectId}/payment-reminder`, { again }),
  lastPaymentReminder: (projectId: string) => http.get<{ last: { sentAt: string; via: string } | null }>(`/projects/${projectId}/payment-reminder`),

  // projects
  mergePreview: (id: string) => http.get<{ counts: Record<string, number>; targets: { id: string; customId: string; projectName: string; capacityKw: number; status: string }[] }>(`/projects/${id}/merge-preview`),
  mergeProject: (id: string, targetProjectId: string) => http.post<{ message: string }>(`/projects/${id}/merge-into`, { targetProjectId }),
  changeProjectCustomer: (id: string, customerId: string) => http.put<{ message: string }>(`/projects/${id}/customer`, { customerId }),
  saveDiscomStage: (projectId: string, stageName: string, data: Record<string, unknown>) => http.put<{ netMeteringStatus: string }>(`/projects/${projectId}/discom/${encodeURIComponent(stageName)}`, data),

  // expenses, invoices, warranties, tickets, documents, inventory
  updateExpense: (id: string, data: Record<string, unknown>) => http.put<{ expense: any }>(`/expenses/${id}`, data),
  creditNote: (invoiceId: string, amount: number | undefined, reason: string) => http.post<{ invoice: any }>(`/invoices/${invoiceId}/credit-note`, { amount, reason }),
  updateWarranty: (id: string, data: Record<string, unknown>) => http.put<{ warranty: any }>(`/warranties/${id}`, data),
  deleteWarranty: (id: string) => http.del<{ message: string }>(`/warranties/${id}`, {}),
  deleteTicket: (id: string) => http.del<{ message: string }>(`/complaints/${id}`, {}),
  updateDocument: (id: string, data: { visibleToCustomer?: boolean; name?: string }) => http.patch<{ document: any }>(`/documents/${id}`, data),
  deleteDocument: (id: string) => http.del<{ message: string }>(`/documents/${id}`, {}),
  updateInventoryItem: (id: string, data: Record<string, unknown>) => http.put<{ item: any }>(`/inventory/items/${id}`, data),
  deleteInventoryItem: (id: string) => http.del<{ success: boolean }>(`/inventory/items/${id}`),

  // maintenance visits
  visits: (params: Record<string, string> = {}) => http.get<{ visits: MaintenanceVisit[] }>(`/maintenance-visits${qs(params)}`),
  planVisits: (projectId: string, body: { everyMonths: number; count: number; start?: string; visitType?: string }) => http.post<{ dates: string[] }>(`/projects/${projectId}/maintenance-plan`, body),
  updateVisit: (id: string, body: Record<string, unknown>) => http.patch<{ visit: MaintenanceVisit }>(`/maintenance-visits/${id}`, body),
  deleteVisit: (id: string) => http.del<{ success: boolean }>(`/maintenance-visits/${id}`),

  // help guide + AI assistant
  guide: () => http.get<{ sections: { id: string; title: string; body: string }[] }>('/assistant/guide'),
  assistantStatus: () => http.get<{ ai: boolean }>('/assistant/status'),
  ask: (question: string, history: { role: 'user' | 'assistant'; content: string }[], page: string) => http.post<{ id: string; answer: string }>('/assistant/ask', { question, history, page }),
  feedback: (id: string, helpful: boolean) => http.post<{ success: boolean }>('/assistant/feedback', { id, helpful }),

  // payroll
  advancesOutstanding: () => http.get<{ outstanding?: Record<string, { employeeName: string; amount: number; count: number }> }>('/payroll/advances?limit=1'),
};
