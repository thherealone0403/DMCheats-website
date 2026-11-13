import express, { type Request, type Response, type NextFunction } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import {
  DURATION_META,
  type DurationTier,
  type LicenseKey,
  type Order,
  type Product,
  type ProductPrices,
  type ProductStatus,
  type PublicUser,
  type Subscription,
  type UserRole,
} from './src/types.ts';

dotenv.config();

interface StoredUser {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  balanceCents: number;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  discordHandle: string | null;
  discordRole: string | null;
  createdAt: string;
}

interface StoredSession {
  token: string;
  userId: string;
  expiresAt: string;
}

interface PendingTwoFactor {
  challengeToken: string;
  userId: string;
  rememberMe: boolean;
  expiresAt: number;
}

interface StoreDatabase {
  users: StoredUser[];
  sessions: StoredSession[];
  products: Product[];
  keys: LicenseKey[];
  subscriptions: Array<{
    id: string;
    userId: string;
    productId: string;
    expiresAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  orders: Order[];
}

interface AuthedRequest extends Request {
  user?: StoredUser;
  authToken?: string;
}

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'store.json');

const pending2faMap = new Map<string, PendingTwoFactor>();

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash: derived, salt: actualSalt };
}

function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(storedHash, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function generateBase32Secret(length = 16): string {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += BASE32_ALPHABET[bytes[i] % 32];
  }
  return out;
}

function base32ToBuffer(base32: string): Buffer {
  const cleaned = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function computeTotpCode(secret: string, stepOffset = 0): string {
  const key = base32ToBuffer(secret);
  const counter = Math.floor(Date.now() / 30000) + stepOffset;
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, '0');
}

function verifyTotpCode(secret: string, inputCode: string): boolean {
  const normalized = inputCode.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;
  for (const offset of [-1, 0, 1]) {
    if (computeTotpCode(secret, offset) === normalized) return true;
  }
  return false;
}

function generateLicenseCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment = () => {
    let part = '';
    const bytes = crypto.randomBytes(4);
    for (let i = 0; i < 4; i++) {
      part += chars[bytes[i] % chars.length];
    }
    return part;
  };
  return `${segment()}-${segment()}-${segment()}-${segment()}`;
}

function createInitialStore(): StoreDatabase {
  const now = new Date().toISOString();
  const zykemCreds = hashPassword('dmcheats2');
  const dreamCreds = hashPassword('dmcheats');

  return {
    users: [
      {
        id: 'usr_admin_zykem7',
        email: 'zykem7@dmcheats.com',
        username: 'zykem7',
        passwordHash: zykemCreds.hash,
        salt: zykemCreds.salt,
        role: 'admin',
        balanceCents: 0,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        discordHandle: null,
        discordRole: 'Admin Support',
        createdAt: now,
      },
      {
        id: 'usr_admin_dream',
        email: 'dream@dmcheats.com',
        username: 'dream',
        passwordHash: dreamCreds.hash,
        salt: dreamCreds.salt,
        role: 'admin',
        balanceCents: 0,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        discordHandle: null,
        discordRole: 'Admin Support',
        createdAt: now,
      },
    ],
    sessions: [],
    products: [
      {
        id: 'prod_dm_core',
        name: 'DM Core Executor',
        category: 'Execution Runtime',
        description:
          'Isolated Lua execution runtime with modular script hooks, encrypted loader transport, and live profile switching.',
        status: 'Undetected',
        coverKey: 'executor',
        guideSteps: [
          'Download the latest DMCheats Loader from the Download tab and extract it to a clean directory.',
          'Add an exclusion for the loader folder in your security settings.',
          'Run the loader as Administrator, sign in, and select DM Core Executor before starting your client.',
          'Press INSERT in-game to open the runtime workspace.',
        ],
        prices: {
          d1: 499,
          d3: 999,
          d7: 1699,
          d30: 3499,
          lifetime: 8999,
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prod_dm_tactical',
        name: 'DM Tactical Suite',
        category: 'Visual & Overlay',
        description:
          'Stream-safe overlay suite featuring customizable ESP profiles, smoothing curves, and encrypted cloud config sync.',
        status: 'Undetected',
        coverKey: 'vanity',
        guideSteps: [
          'Activate a DM Tactical Suite key in Redeem Key or purchase from the catalog with credited balance.',
          'Download the DMCheats Loader package from the Download tab.',
          'Start the loader while your game client is closed, choose DM Tactical Suite, and wait for ready confirmation.',
          'Launch your game and toggle the menu using the HOME key.',
        ],
        prices: {
          d1: 399,
          d3: 799,
          d7: 1499,
          d30: 2999,
          lifetime: 7499,
        },
        createdAt: now,
        updatedAt: now,
      },
    ],
    keys: [],
    subscriptions: [],
    orders: [],
  };
}

function loadStore(): StoreDatabase {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const initial = createInitialStore();
    saveStore(initial);
    return initial;
  }
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(raw) as StoreDatabase;
}

function saveStore(db: StoreDatabase): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpPath, DB_PATH);
}

let db: StoreDatabase = loadStore();

function sanitizeUser(user: StoredUser): PublicUser {
  const nowMs = Date.now();
  const activeCount = db.subscriptions.filter(
    (s) => s.userId === user.id && (s.expiresAt === null || new Date(s.expiresAt).getTime() > nowMs)
  ).length;
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    balanceCents: user.balanceCents,
    twoFactorEnabled: user.twoFactorEnabled,
    discordHandle: user.discordHandle,
    discordRole: user.discordRole,
    createdAt: user.createdAt,
    activeSubscriptionsCount: activeCount,
  };
}

function getUserSubscriptions(userId: string): Subscription[] {
  const nowMs = Date.now();
  return db.subscriptions
    .filter((s) => s.userId === userId && (s.expiresAt === null || new Date(s.expiresAt).getTime() > nowMs))
    .map((s) => {
      const prod = db.products.find((p) => p.id === s.productId);
      return {
        id: s.id,
        userId: s.userId,
        productId: s.productId,
        productName: prod?.name || 'Retired Product',
        productStatus: prod?.status || 'Undetected',
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      };
    });
}

function createSession(userId: string, rememberMe: boolean): string {
  const token = crypto.randomBytes(32).toString('hex');
  const ttlMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  db.sessions = db.sessions.filter((s) => new Date(s.expiresAt).getTime() > Date.now());
  db.sessions.push({ token, userId, expiresAt });
  saveStore(db);
  return token;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const session = db.sessions.find((s) => s.token === token);
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
    if (session) {
      db.sessions = db.sessions.filter((s) => s.token !== token);
      saveStore(db);
    }
    res.status(401).json({ error: 'Session expired. Please log in again.' });
    return;
  }
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) {
    res.status(401).json({ error: 'Account not found' });
    return;
  }
  req.user = user;
  req.authToken = token;
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Administrator access required' });
    return;
  }
  next();
}

function normalizePriceField(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error('Prices must be non-negative numbers');
  }
  return Math.round(num);
}

function parsePrices(input: Record<string, unknown>): ProductPrices {
  const prices: ProductPrices = {
    d1: normalizePriceField(input.d1),
    d3: normalizePriceField(input.d3),
    d7: normalizePriceField(input.d7),
    d30: normalizePriceField(input.d30),
    lifetime: normalizePriceField(input.lifetime),
  };
  const hasAny = Object.values(prices).some((v) => v !== null);
  if (!hasAny) {
    throw new Error('At least one duration tier price must be enabled.');
  }
  return prices;
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json());

  // Auth routes
  app.post('/api/auth/register', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    const rememberMe = Boolean(req.body?.rememberMe);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!username || username.length < 3 || username.length > 24) {
      res.status(400).json({ error: 'Username must be between 3 and 24 characters.' });
      return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }
    if (db.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      res.status(409).json({ error: 'This username is already taken.' });
      return;
    }

    const { hash, salt } = hashPassword(password);
    const newUser: StoredUser = {
      id: `usr_${crypto.randomBytes(6).toString('hex')}`,
      email,
      username,
      passwordHash: hash,
      salt,
      role: 'user',
      balanceCents: 0,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      discordHandle: null,
      discordRole: null,
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    saveStore(db);

    const token = createSession(newUser.id, rememberMe);
    res.status(201).json({
      token,
      user: sanitizeUser(newUser),
      subscriptions: [],
      orders: [],
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const rememberMe = Boolean(req.body?.rememberMe);

    const user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user || !verifyPassword(password, user.passwordHash, user.salt)) {
      res.status(401).json({ error: 'Invalid email address or password.' });
      return;
    }

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const challengeToken = crypto.randomBytes(24).toString('hex');
      pending2faMap.set(challengeToken, {
        challengeToken,
        userId: user.id,
        rememberMe,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
      res.json({
        requires2fa: true,
        challengeToken,
        email: user.email,
      });
      return;
    }

    const token = createSession(user.id, rememberMe);
    res.json({
      token,
      user: sanitizeUser(user),
      subscriptions: getUserSubscriptions(user.id),
      orders: db.orders.filter((o) => o.userId === user.id),
    });
  });

  app.post('/api/auth/verify-2fa', (req, res) => {
    const challengeToken = String(req.body?.challengeToken || '');
    const code = String(req.body?.code || '');
    const pending = pending2faMap.get(challengeToken);

    if (!pending || pending.expiresAt < Date.now()) {
      pending2faMap.delete(challengeToken);
      res.status(401).json({ error: '2FA challenge expired. Please log in again.' });
      return;
    }

    const user = db.users.find((u) => u.id === pending.userId);
    if (!user || !user.twoFactorSecret) {
      res.status(401).json({ error: 'Account 2FA configuration not found.' });
      return;
    }

    if (!verifyTotpCode(user.twoFactorSecret, code)) {
      res.status(400).json({ error: 'Invalid 6-digit authentication code.' });
      return;
    }

    pending2faMap.delete(challengeToken);
    const token = createSession(user.id, pending.rememberMe);
    res.json({
      token,
      user: sanitizeUser(user),
      subscriptions: getUserSubscriptions(user.id),
      orders: db.orders.filter((o) => o.userId === user.id),
    });
  });

  app.post('/api/auth/logout', requireAuth, (req: AuthedRequest, res) => {
    db.sessions = db.sessions.filter((s) => s.token !== req.authToken);
    saveStore(db);
    res.json({ ok: true });
  });

  // Current user state
  app.get('/api/me', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    res.json({
      user: sanitizeUser(user),
      subscriptions: getUserSubscriptions(user.id),
      orders: db.orders
        .filter((o) => o.userId === user.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    });
  });

  // Catalog
  app.get('/api/products', requireAuth, (_req, res) => {
    res.json({ products: db.products });
  });

  // Redeem Key
  app.post('/api/keys/redeem', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const rawCode = String(req.body?.code || '').trim().toUpperCase();
    if (!rawCode) {
      res.status(400).json({ error: 'Please enter a product key.' });
      return;
    }

    const key = db.keys.find((k) => k.code.toUpperCase() === rawCode);
    if (!key) {
      res.status(404).json({ error: 'Product key not found. Verify the code and try again.' });
      return;
    }
    if (key.status === 'redeemed') {
      res.status(409).json({ error: 'This product key has already been redeemed.' });
      return;
    }
    if (key.status === 'revoked') {
      res.status(403).json({ error: 'This product key has been revoked by an administrator.' });
      return;
    }

    const product = db.products.find((p) => p.id === key.productId);
    const now = new Date();
    const nowIso = now.toISOString();

    key.status = 'redeemed';
    key.redeemedBy = user.id;
    key.redeemedByEmail = user.email;
    key.redeemedByUsername = user.username;
    key.redeemedAt = nowIso;

    const existingSub = db.subscriptions.find(
      (s) => s.userId === user.id && s.productId === key.productId
    );

    const addMs = key.durationDays !== null ? key.durationDays * 24 * 60 * 60 * 1000 : null;

    if (existingSub) {
      if (existingSub.expiresAt === null || addMs === null) {
        existingSub.expiresAt = null;
      } else {
        const baseMs = Math.max(now.getTime(), new Date(existingSub.expiresAt).getTime());
        existingSub.expiresAt = new Date(baseMs + addMs).toISOString();
      }
      existingSub.updatedAt = nowIso;
    } else {
      db.subscriptions.push({
        id: `sub_${crypto.randomBytes(6).toString('hex')}`,
        userId: user.id,
        productId: key.productId,
        expiresAt: addMs === null ? null : new Date(now.getTime() + addMs).toISOString(),
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }

    const order: Order = {
      id: `ORD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      userId: user.id,
      productId: key.productId,
      productName: product?.name || key.productName,
      durationTier: key.durationTier,
      keyCode: key.code,
      source: 'Key Redemption',
      createdAt: nowIso,
    };
    db.orders.unshift(order);

    if (user.discordHandle && user.role !== 'admin') {
      user.discordRole = 'Customer · Verified';
    }

    saveStore(db);

    res.json({
      message: `Activated ${order.productName} (${DURATION_META[key.durationTier].label}).`,
      order,
      user: sanitizeUser(user),
      subscriptions: getUserSubscriptions(user.id),
      orders: db.orders.filter((o) => o.userId === user.id),
    });
  });

  // Loader manifest download
  app.get('/api/loader/download/:productId', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const productId = String(req.params.productId || '');
    const subs = getUserSubscriptions(user.id);
    const hasAccess = user.role === 'admin' || subs.some((s) => s.productId === productId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Active subscription required to download this loader.' });
      return;
    }
    const product = db.products.find((p) => p.id === productId);
    const title = product?.name || 'DMCheats Loader';
    const content = [
      'DMCheats Official Loader Package Manifest',
      '========================================',
      `Product: ${title}`,
      `Account: ${user.username} (${user.email})`,
      `Issued At: ${new Date().toISOString()}`,
      '',
      'Setup Instructions:',
      ...(product?.guideSteps || ['Extract loader, run as Administrator, and sign in.']).map(
        (step, idx) => `${idx + 1}. ${step}`
      ),
      '',
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="DMCheats-${title.replace(/[^a-z0-9]+/gi, '-')}-Loader.txt"`
    );
    res.send(content);
  });

  // Settings routes
  app.patch('/api/settings/profile', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const email = String(req.body?.email || '').trim().toLowerCase();
    const username = String(req.body?.username || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }
    if (!username || username.length < 3 || username.length > 24) {
      res.status(400).json({ error: 'Username must be between 3 and 24 characters.' });
      return;
    }

    const emailConflict = db.users.some(
      (u) => u.id !== user.id && u.email.toLowerCase() === email
    );
    if (emailConflict) {
      res.status(409).json({ error: 'That email address is already registered to another account.' });
      return;
    }

    const usernameConflict = db.users.some(
      (u) => u.id !== user.id && u.username.toLowerCase() === username.toLowerCase()
    );
    if (usernameConflict) {
      res.status(409).json({ error: 'That username is already taken.' });
      return;
    }

    user.email = email;
    user.username = username;
    saveStore(db);

    res.json({
      message: 'Account profile updated successfully.',
      user: sanitizeUser(user),
    });
  });

  app.patch('/api/settings/password', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');

    if (!verifyPassword(currentPassword, user.passwordHash, user.salt)) {
      res.status(400).json({ error: 'Current password is incorrect.' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters.' });
      return;
    }

    const { hash, salt } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.salt = salt;
    saveStore(db);

    res.json({ message: 'Password updated successfully.' });
  });

  app.post('/api/settings/2fa/setup', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const secret = user.twoFactorSecret || generateBase32Secret(16);
    user.twoFactorSecret = secret;
    saveStore(db);

    res.json({
      secret,
      otpauthUri: `otpauth://totp/DMCheats:${encodeURIComponent(user.email)}?secret=${secret}&issuer=DMCheats`,
      currentCode: computeTotpCode(secret, 0),
    });
  });

  app.post('/api/settings/2fa/enable', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const code = String(req.body?.code || '');
    if (!user.twoFactorSecret) {
      res.status(400).json({ error: 'Initialize 2FA setup first.' });
      return;
    }
    if (!verifyTotpCode(user.twoFactorSecret, code)) {
      res.status(400).json({ error: 'Verification code did not match. Please try the current 6-digit code.' });
      return;
    }
    user.twoFactorEnabled = true;
    saveStore(db);
    res.json({
      message: 'Two-Factor Authentication enabled.',
      user: sanitizeUser(user),
    });
  });

  app.post('/api/settings/2fa/disable', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const password = String(req.body?.password || '');
    if (!verifyPassword(password, user.passwordHash, user.salt)) {
      res.status(400).json({ error: 'Confirm your current password to disable 2FA.' });
      return;
    }
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    saveStore(db);
    res.json({
      message: 'Two-Factor Authentication disabled.',
      user: sanitizeUser(user),
    });
  });

  app.post('/api/settings/discord', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const action = String(req.body?.action || 'link');
    if (action === 'unlink') {
      user.discordHandle = null;
      user.discordRole = user.role === 'admin' ? 'Admin Support' : null;
      saveStore(db);
      res.json({ message: 'Discord account unlinked.', user: sanitizeUser(user) });
      return;
    }

    const handle = String(req.body?.handle || '').trim();
    if (!handle || handle.length < 2 || handle.length > 40) {
      res.status(400).json({ error: 'Enter a valid Discord username (2-40 characters).' });
      return;
    }

    const subs = getUserSubscriptions(user.id);
    user.discordHandle = handle;
    user.discordRole =
      user.role === 'admin'
        ? 'Admin · Support Lead'
        : subs.length > 0
          ? 'Customer · Verified'
          : 'Verified Member';
    saveStore(db);

    res.json({
      message: `Linked Discord account ${handle}.`,
      user: sanitizeUser(user),
    });
  });

  // Admin routes
  app.get('/api/admin/overview', requireAuth, requireAdmin, (_req, res) => {
    res.json({
      products: db.products,
      keys: [...db.keys].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      users: db.users.map(sanitizeUser),
    });
  });

  app.post('/api/admin/products', requireAuth, requireAdmin, (req, res) => {
    try {
      const name = String(req.body?.name || '').trim();
      const category = String(req.body?.category || 'Software Suite').trim() || 'Software Suite';
      const description = String(req.body?.description || '').trim();
      const statusRaw = String(req.body?.status || 'Undetected') as ProductStatus;
      const coverRaw = String(req.body?.coverKey || 'custom');
      const guideSteps = Array.isArray(req.body?.guideSteps)
        ? req.body.guideSteps.map((s: unknown) => String(s).trim()).filter(Boolean)
        : ['Download the DMCheats Loader from the Download tab.', 'Select this product and launch.'];

      if (!name || name.length < 2) {
        res.status(400).json({ error: 'Product name must be at least 2 characters.' });
        return;
      }
      if (!description) {
        res.status(400).json({ error: 'Product description is required.' });
        return;
      }

      const validStatuses: ProductStatus[] = ['Undetected', 'Updating', 'Offline'];
      const status: ProductStatus = validStatuses.includes(statusRaw) ? statusRaw : 'Undetected';
      const coverKey: Product['coverKey'] =
        coverRaw === 'executor' || coverRaw === 'vanity' ? coverRaw : 'custom';

      const prices = parsePrices((req.body?.prices || {}) as Record<string, unknown>);
      const now = new Date().toISOString();

      const product: Product = {
        id: `prod_${crypto.randomBytes(5).toString('hex')}`,
        name,
        category,
        description,
        status,
        coverKey,
        guideSteps: guideSteps.length > 0 ? guideSteps : ['Launch via DMCheats Loader.'],
        prices,
        createdAt: now,
        updatedAt: now,
      };

      db.products.push(product);
      saveStore(db);

      res.status(201).json({ product, products: db.products });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid product data' });
    }
  });

  app.put('/api/admin/products/:id', requireAuth, requireAdmin, (req, res) => {
    try {
      const id = String(req.params.id || '');
      const product = db.products.find((p) => p.id === id);
      if (!product) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }

      const name = String(req.body?.name || '').trim();
      const category = String(req.body?.category || product.category).trim();
      const description = String(req.body?.description || '').trim();
      const statusRaw = String(req.body?.status || product.status) as ProductStatus;
      const coverRaw = String(req.body?.coverKey || product.coverKey);
      const guideSteps = Array.isArray(req.body?.guideSteps)
        ? req.body.guideSteps.map((s: unknown) => String(s).trim()).filter(Boolean)
        : product.guideSteps;

      if (!name || name.length < 2) {
        res.status(400).json({ error: 'Product name must be at least 2 characters.' });
        return;
      }
      if (!description) {
        res.status(400).json({ error: 'Product description is required.' });
        return;
      }

      const validStatuses: ProductStatus[] = ['Undetected', 'Updating', 'Offline'];
      const status: ProductStatus = validStatuses.includes(statusRaw) ? statusRaw : product.status;
      const coverKey: Product['coverKey'] =
        coverRaw === 'executor' || coverRaw === 'vanity' || coverRaw === 'custom'
          ? coverRaw
          : product.coverKey;

      const prices = parsePrices((req.body?.prices || {}) as Record<string, unknown>);

      product.name = name;
      product.category = category || 'Software Suite';
      product.description = description;
      product.status = status;
      product.coverKey = coverKey;
      product.guideSteps = guideSteps.length > 0 ? guideSteps : product.guideSteps;
      product.prices = prices;
      product.updatedAt = new Date().toISOString();

      saveStore(db);
      res.json({ product, products: db.products });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid product update' });
    }
  });

  app.delete('/api/admin/products/:id', requireAuth, requireAdmin, (req, res) => {
    const id = String(req.params.id || '');
    const exists = db.products.some((p) => p.id === id);
    if (!exists) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    db.products = db.products.filter((p) => p.id !== id);
    saveStore(db);
    res.json({ ok: true, products: db.products });
  });

  app.post('/api/admin/keys/generate', requireAuth, requireAdmin, (req: AuthedRequest, res) => {
    const adminUser = req.user!;
    const productId = String(req.body?.productId || '');
    const durationTier = String(req.body?.durationTier || '') as DurationTier;
    const quantity = Math.min(50, Math.max(1, Math.floor(Number(req.body?.quantity) || 1)));

    const product = db.products.find((p) => p.id === productId);
    if (!product) {
      res.status(404).json({ error: 'Selected product was not found.' });
      return;
    }
    if (!(durationTier in DURATION_META)) {
      res.status(400).json({ error: 'Invalid duration tier.' });
      return;
    }

    const meta = DURATION_META[durationTier];
    const now = new Date().toISOString();
    const generated: LicenseKey[] = [];

    for (let i = 0; i < quantity; i++) {
      let code = generateLicenseCode();
      while (db.keys.some((k) => k.code === code)) {
        code = generateLicenseCode();
      }
      const entry: LicenseKey = {
        id: `key_${crypto.randomBytes(6).toString('hex')}`,
        code,
        productId: product.id,
        productName: product.name,
        durationTier,
        durationDays: meta.days,
        status: 'unused',
        createdBy: adminUser.id,
        createdByEmail: adminUser.email,
        createdAt: now,
        redeemedBy: null,
        redeemedByEmail: null,
        redeemedByUsername: null,
        redeemedAt: null,
      };
      db.keys.unshift(entry);
      generated.push(entry);
    }

    saveStore(db);
    res.status(201).json({
      generated,
      keys: db.keys,
    });
  });

  app.patch('/api/admin/keys/:id/revoke', requireAuth, requireAdmin, (req, res) => {
    const id = String(req.params.id || '');
    const key = db.keys.find((k) => k.id === id);
    if (!key) {
      res.status(404).json({ error: 'License key not found.' });
      return;
    }
    if (key.status === 'redeemed') {
      res.status(400).json({ error: 'Cannot revoke an already redeemed key.' });
      return;
    }
    key.status = 'revoked';
    saveStore(db);
    res.json({ key, keys: db.keys });
  });

  app.delete('/api/admin/keys/:id', requireAuth, requireAdmin, (req, res) => {
    const id = String(req.params.id || '');
    db.keys = db.keys.filter((k) => k.id !== id);
    saveStore(db);
    res.json({ ok: true, keys: db.keys });
  });

  // Checkout using admin-credited balance
  app.post('/api/store/checkout', requireAuth, (req: AuthedRequest, res) => {
    const user = req.user!;
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    if (rawItems.length === 0) {
      res.status(400).json({ error: 'Your cart is empty.' });
      return;
    }

    const validatedItems: Array<{
      product: Product;
      durationTier: DurationTier;
      priceCents: number;
      quantity: number;
    }> = [];

    let totalCents = 0;
    for (const raw of rawItems) {
      const productId = String(raw?.productId || '');
      const durationTier = String(raw?.durationTier || '') as DurationTier;
      const quantity = Math.max(1, Math.min(20, Math.floor(Number(raw?.quantity) || 1)));
      const product = db.products.find((p) => p.id === productId);
      if (!product) {
        res.status(404).json({ error: 'One of the selected products no longer exists.' });
        return;
      }
      if (product.status === 'Offline') {
        res.status(400).json({ error: `${product.name} is currently offline.` });
        return;
      }
      if (!(durationTier in DURATION_META)) {
        res.status(400).json({ error: 'Invalid license duration selected.' });
        return;
      }
      const tierPrice = product.prices[durationTier];
      if (tierPrice === null) {
        res.status(400).json({
          error: `${DURATION_META[durationTier].label} is not available for ${product.name}.`,
        });
        return;
      }
      totalCents += tierPrice * quantity;
      validatedItems.push({ product, durationTier, priceCents: tierPrice, quantity });
    }

    if (user.balanceCents < totalCents) {
      res.status(400).json({
        error: `Insufficient balance. Required €${(totalCents / 100).toFixed(2)}, available €${(user.balanceCents / 100).toFixed(2)}.`,
      });
      return;
    }

    const now = new Date();
    const nowIso = now.toISOString();
    user.balanceCents -= totalCents;

    for (const item of validatedItems) {
      const meta = DURATION_META[item.durationTier];
      const existingSub = db.subscriptions.find(
        (s) => s.userId === user.id && s.productId === item.product.id
      );

      const addMs = meta.days !== null ? meta.days * item.quantity * 24 * 60 * 60 * 1000 : null;
      if (existingSub) {
        if (existingSub.expiresAt === null || addMs === null) {
          existingSub.expiresAt = null;
        } else {
          const baseMs = Math.max(now.getTime(), new Date(existingSub.expiresAt).getTime());
          existingSub.expiresAt = new Date(baseMs + addMs).toISOString();
        }
        existingSub.updatedAt = nowIso;
      } else {
        db.subscriptions.push({
          id: `sub_${crypto.randomBytes(6).toString('hex')}`,
          userId: user.id,
          productId: item.product.id,
          expiresAt: addMs === null ? null : new Date(now.getTime() + addMs).toISOString(),
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    }

    if (user.discordHandle && user.role !== 'admin') {
      user.discordRole = 'Customer · Verified';
    }

    saveStore(db);
    res.json({
      message: 'Purchase completed using your account balance.',
      user: sanitizeUser(user),
      subscriptions: getUserSubscriptions(user.id),
    });
  });

  app.patch('/api/admin/users/:id/role', requireAuth, requireAdmin, (req: AuthedRequest, res) => {
    const targetId = String(req.params.id || '');
    const nextRole = req.body?.role === 'admin' ? 'admin' : 'user';
    const target = db.users.find((u) => u.id === targetId);
    if (!target) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    if (target.id === req.user!.id && nextRole !== 'admin') {
      res.status(400).json({ error: 'You cannot demote your own active admin session.' });
      return;
    }
    target.role = nextRole;
    if (nextRole === 'admin') {
      target.discordRole = 'Admin · Support Lead';
    }
    saveStore(db);
    res.json({ users: db.users.map(sanitizeUser) });
  });

  app.post('/api/admin/users/:id/balance', requireAuth, requireAdmin, (req, res) => {
    const targetId = String(req.params.id || '');
    const mode = req.body?.mode === 'set' ? 'set' : 'add';
    const amountCents = Math.round(Number(req.body?.amountCents));

    if (!Number.isFinite(amountCents) || (mode === 'add' && amountCents === 0) || amountCents < 0) {
      res.status(400).json({ error: 'Enter a valid positive EUR amount.' });
      return;
    }

    const target = db.users.find((u) => u.id === targetId);
    if (!target) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (mode === 'set') {
      target.balanceCents = amountCents;
    } else {
      target.balanceCents += amountCents;
    }

    saveStore(db);
    res.json({
      message: `Updated ${target.username}'s balance to €${(target.balanceCents / 100).toFixed(2)}.`,
      updatedUser: sanitizeUser(target),
      users: db.users.map(sanitizeUser),
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DMCheats server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start DMCheats server:', err);
  process.exit(1);
});
