import type {
  DurationTier,
  LicenseKey,
  Order,
  Product,
  ProductPrices,
  ProductStatus,
  PublicUser,
  Subscription,
  UserRole,
} from '../types';

const TOKEN_STORAGE_KEY = 'dmcheats_auth_token';
const SESSION_STORAGE_KEY = 'dmcheats_session_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(SESSION_STORAGE_KEY);
}

export function setStoredToken(token: string, rememberMe: boolean): void {
  clearStoredToken();
  if (rememberMe) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    sessionStorage.setItem(SESSION_STORAGE_KEY, token);
  }
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export interface AuthResponse {
  token?: string;
  requires2fa?: boolean;
  challengeToken?: string;
  email?: string;
  user?: PublicUser;
  subscriptions?: Subscription[];
  orders?: Order[];
}

export interface MeResponse {
  user: PublicUser;
  subscriptions: Subscription[];
  orders: Order[];
}

export const api = {
  register(payload: { email: string; username: string; password: string; rememberMe: boolean }) {
    return request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  login(payload: { email: string; password: string; rememberMe: boolean }) {
    return request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  verify2fa(payload: { challengeToken: string; code: string }) {
    return request<AuthResponse>('/api/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  logout() {
    return request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
  },
  me() {
    return request<MeResponse>('/api/me');
  },
  getProducts() {
    return request<{ products: Product[] }>('/api/products');
  },
  redeemKey(code: string) {
    return request<{
      message: string;
      order: Order;
      user: PublicUser;
      subscriptions: Subscription[];
      orders: Order[];
    }>('/api/keys/redeem', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },
  updateProfile(payload: { email: string; username: string }) {
    return request<{ message: string; user: PublicUser }>('/api/settings/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  updatePassword(payload: { currentPassword: string; newPassword: string }) {
    return request<{ message: string }>('/api/settings/password', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  setup2fa() {
    return request<{ secret: string; otpauthUri: string; currentCode: string }>(
      '/api/settings/2fa/setup',
      { method: 'POST' }
    );
  },
  enable2fa(code: string) {
    return request<{ message: string; user: PublicUser }>('/api/settings/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },
  disable2fa(password: string) {
    return request<{ message: string; user: PublicUser }>('/api/settings/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },
  updateDiscord(payload: { action: 'link' | 'unlink'; handle?: string }) {
    return request<{ message: string; user: PublicUser }>('/api/settings/discord', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  adminOverview() {
    return request<{ products: Product[]; keys: LicenseKey[]; users: PublicUser[] }>(
      '/api/admin/overview'
    );
  },
  adminCreateProduct(payload: {
    name: string;
    category: string;
    description: string;
    status: ProductStatus;
    coverKey: Product['coverKey'];
    guideSteps: string[];
    prices: ProductPrices;
  }) {
    return request<{ product: Product; products: Product[] }>('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  adminUpdateProduct(
    id: string,
    payload: {
      name: string;
      category: string;
      description: string;
      status: ProductStatus;
      coverKey: Product['coverKey'];
      guideSteps: string[];
      prices: ProductPrices;
    }
  ) {
    return request<{ product: Product; products: Product[] }>(`/api/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  adminDeleteProduct(id: string) {
    return request<{ ok: boolean; products: Product[] }>(`/api/admin/products/${id}`, {
      method: 'DELETE',
    });
  },
  adminGenerateKeys(payload: {
    productId: string;
    durationTier: DurationTier;
    quantity: number;
  }) {
    return request<{ generated: LicenseKey[]; keys: LicenseKey[] }>(
      '/api/admin/keys/generate',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },
  adminRevokeKey(id: string) {
    return request<{ key: LicenseKey; keys: LicenseKey[] }>(`/api/admin/keys/${id}/revoke`, {
      method: 'PATCH',
    });
  },
  adminDeleteKey(id: string) {
    return request<{ ok: boolean; keys: LicenseKey[] }>(`/api/admin/keys/${id}`, {
      method: 'DELETE',
    });
  },
  checkoutCart(items: Array<{ productId: string; durationTier: DurationTier; quantity: number }>) {
    return request<{ message: string; user: PublicUser; subscriptions: Subscription[] }>(
      '/api/store/checkout',
      {
        method: 'POST',
        body: JSON.stringify({ items }),
      }
    );
  },
  adminUpdateUserRole(id: string, role: UserRole) {
    return request<{ users: PublicUser[] }>(`/api/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },
  adminUpdateUserBalance(id: string, payload: { amountCents: number; mode: 'add' | 'set' }) {
    return request<{ message: string; updatedUser: PublicUser; users: PublicUser[] }>(
      `/api/admin/users/${id}/balance`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },
};

export function formatEur(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}
