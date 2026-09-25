const API_BASE_URL = 'http://localhost:5000/api/v1';

export const getAuthToken = (): string | null => {
  return localStorage.getItem('inventra_token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('inventra_token', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('inventra_token');
  localStorage.removeItem('inventra_user');
};

export const getStoredUser = (): any | null => {
  const user = localStorage.getItem('inventra_user');
  return user ? JSON.parse(user) : null;
};

export const setStoredUser = (user: any): void => {
  localStorage.setItem('inventra_user', JSON.stringify(user));
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error?.message || 'API Request failed');
  }

  return data;
};
