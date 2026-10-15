export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export function getAuthToken(): string | null {
  return localStorage.getItem('accessToken');
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const response = await fetch(`${API_BASE_URL}${cleanEndpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorJson.error || JSON.stringify(errorJson);
    } catch {
      // Non-JSON error
    }
    throw new Error(errorDetail);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// --- Customer Vehicle API ---
export async function fetchVehicles() {
  return apiFetch('/customer/vehicles/');
}

export async function fetchVehicle(id: string) {
  return apiFetch(`/customer/vehicles/${id}/`);
}

export async function createVehicle(data: {
  make: string;
  model: string;
  year: number;
  registration_number: string;
  vin?: string;
  color?: string;
  mileage?: number;
  fuel_type?: string;
  transmission?: string;
}) {
  return apiFetch('/customer/vehicles/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateVehicle(id: string, data: any) {
  return apiFetch(`/customer/vehicles/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function fetchVehicleQR(vehicleId: string) {
  return apiFetch(`/vehicles/${vehicleId}/qr/`);
}

export async function regenerateVehicleQR(vehicleId: string) {
  return apiFetch(`/vehicles/${vehicleId}/qr/regenerate/`, { method: 'POST' });
}

export async function fetchServiceHistory(id: string, search?: string, type?: string) {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (type && type !== 'All') params.append('type', type);
  const q = params.toString() ? `?${params.toString()}` : '';
  return apiFetch(`/customer/vehicles/${id}/service_history/${q}`);
}

// --- Customer Estimates & Approvals API ---
export async function fetchCustomerEstimates() {
  return apiFetch('/customer/estimates/');
}

export async function approveEstimate(id: string) {
  return apiFetch(`/customer/estimates/${id}/approve/`, { method: 'POST' });
}

export async function rejectEstimate(id: string, reason: string = 'Declined by customer') {
  return apiFetch(`/customer/estimates/${id}/reject/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// --- Customer Invoices & Razorpay Payments API ---
export async function fetchCustomerInvoices() {
  return apiFetch('/customer/invoices/');
}

export async function createPaymentOrder(invoiceId: string) {
  return apiFetch('/payments/create-order/', {
    method: 'POST',
    body: JSON.stringify({ invoice_id: invoiceId }),
  });
}

export async function verifyPayment(payload: {
  invoice_id: string;
  order_id: string;
  payment_id: string;
  signature?: string;
}) {
  return apiFetch('/payments/verify/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// --- Customer Notifications API ---
export async function fetchCustomerNotifications() {
  return apiFetch('/customer/notifications/');
}

export async function markAllNotificationsRead() {
  return apiFetch('/customer/notifications/mark_all_read/', { method: 'POST' });
}

// --- Customer Appointments & Branches API ---
export async function fetchCustomerAppointments() {
  return apiFetch('/customer/appointments/');
}

export async function createAppointment(data: {
  branch?: string;
  vehicle: string;
  service_type: string;
  date_time: string;
}) {
  return apiFetch('/customer/appointments/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchBranches() {
  return apiFetch('/organizations/branches/');
}

// --- Admin Portal API ---
export async function fetchAdminDashboardKPIs() {
  return apiFetch('/admin/dashboard/kpis/');
}

export async function fetchAdminAnalytics() {
  return apiFetch('/admin/analytics/');
}

export async function fetchAdminBookings() {
  return apiFetch('/admin/bookings/');
}

export async function fetchAdminVehicles() {
  return apiFetch('/admin/vehicles/');
}

export async function fetchAdminCustomers() {
  return apiFetch('/admin/customers/');
}

export async function fetchAdminStaff(role?: string) {
  const q = role ? `?role=${role}` : '';
  return apiFetch(`/admin/staff/${q}`);
}

export async function fetchAdminInspections() {
  return apiFetch('/admin/inspections/');
}

export async function fetchAdminEvidence() {
  return apiFetch('/admin/evidence/');
}

export async function fetchAdminAuditLogs() {
  return apiFetch('/admin/audit-logs/');
}

export async function fetchAdminInvoices() {
  return apiFetch('/admin/invoices/');
}
