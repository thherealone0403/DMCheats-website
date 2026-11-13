export type DurationTier = 'd1' | 'd3' | 'd7' | 'd30' | 'lifetime';

export type ProductStatus = 'Undetected' | 'Updating' | 'Offline';

export type UserRole = 'admin' | 'user';

export interface ProductPrices {
  d1: number | null;
  d3: number | null;
  d7: number | null;
  d30: number | null;
  lifetime: number | null;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  status: ProductStatus;
  coverKey: 'executor' | 'vanity' | 'custom';
  guideSteps: string[];
  prices: ProductPrices;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  productStatus: ProductStatus;
  expiresAt: string | null; // null = Lifetime
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  durationTier: DurationTier;
  keyCode: string;
  source: 'Key Redemption';
  createdAt: string;
}

export interface LicenseKey {
  id: string;
  code: string;
  productId: string;
  productName: string;
  durationTier: DurationTier;
  durationDays: number | null;
  status: 'unused' | 'redeemed' | 'revoked';
  createdBy: string;
  createdByEmail: string;
  createdAt: string;
  redeemedBy: string | null;
  redeemedByEmail: string | null;
  redeemedByUsername: string | null;
  redeemedAt: string | null;
}

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  balanceCents: number;
  twoFactorEnabled: boolean;
  discordHandle: string | null;
  discordRole: string | null;
  createdAt: string;
  activeSubscriptionsCount?: number;
}

export interface CartItem {
  productId: string;
  productName: string;
  durationTier: DurationTier;
  priceCents: number;
  quantity: number;
}

export const DURATION_META: Record<DurationTier, { label: string; shortLabel: string; days: number | null }> = {
  d1: { label: '1 Day', shortLabel: '1D', days: 1 },
  d3: { label: '3 Days', shortLabel: '3D', days: 3 },
  d7: { label: '7 Days', shortLabel: '7D', days: 7 },
  d30: { label: '30 Days', shortLabel: '30D', days: 30 },
  lifetime: { label: 'Lifetime', shortLabel: 'Lifetime', days: null },
};

export const DURATION_ORDER: DurationTier[] = ['d1', 'd3', 'd7', 'd30', 'lifetime'];
