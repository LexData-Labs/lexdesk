import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

// Default seed accounts. On first run these are written to data/users.json,
// after which that file becomes the source of truth (so users added/removed
// through the UI persist across restarts on a local/Node deployment).
const DEFAULT_USERS = [
  { id: 1, name: 'Super Admin',              email: 'superadmin@example.com', password: '$2a$10$WISgkzGnvzoe9UXF2d0AneqBTUS5Q7QGGIGtXCOqVtfNrncl2SwLq', role: 'superadmin', avatar: 'SA', employeeId: null },
  { id: 2, name: 'Admin & Team Supervisor',  email: 'admin@example.com',      password: '$2a$10$WISgkzGnvzoe9UXF2d0AneqBTUS5Q7QGGIGtXCOqVtfNrncl2SwLq', role: 'admin',      avatar: 'AU', employeeId: null },
  { id: 3, name: 'Employee User',            email: 'employee@example.com',   password: '$2a$10$jA/80t58plx9Xav8zaNpg.yh4ElBX53IblFIkEdlDClzt8.gz3Lgu', role: 'employee',   avatar: 'EU', employeeId: '1' },
  // Test employee accounts — linked to Excel row IDs 1, 2, 3
  { id: 4, name: 'Test Employee 1',          email: 'emp1@test.com',          password: '$2a$10$jA/80t58plx9Xav8zaNpg.yh4ElBX53IblFIkEdlDClzt8.gz3Lgu', role: 'employee',   avatar: 'E1', employeeId: '1' },
  { id: 5, name: 'Test Employee 2',          email: 'emp2@test.com',          password: '$2a$10$jA/80t58plx9Xav8zaNpg.yh4ElBX53IblFIkEdlDClzt8.gz3Lgu', role: 'employee',   avatar: 'E2', employeeId: '2' },
  { id: 6, name: 'Test Employee 3',          email: 'emp3@test.com',          password: '$2a$10$jA/80t58plx9Xav8zaNpg.yh4ElBX53IblFIkEdlDClzt8.gz3Lgu', role: 'employee',   avatar: 'E3', employeeId: '3' },
];

// Initial password assigned to every account created through the UI.
export const DEFAULT_NEW_USER_PASSWORD = 'changeme123';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function loadUsers() {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    // file missing or unreadable — fall through to seeding
  }
  saveUsers(DEFAULT_USERS);
  return DEFAULT_USERS.map(u => ({ ...u }));
}

function saveUsers(users) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch {
    // Read-only filesystem (e.g. serverless) — changes won't persist there.
  }
}

function initialsFromName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
}

export function findUserByEmail(email) {
  if (!email) return null;
  return loadUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function findUserById(id) {
  return loadUsers().find(u => String(u.id) === String(id)) || null;
}

export function getAllUsers() {
  return loadUsers().map(publicUser);
}

export async function createUser({ name, email, password, role, employeeId }) {
  const users = loadUsers();
  const cleanEmail = String(email || '').trim();
  if (!name || !cleanEmail || !role) {
    const err = new Error('Name, email and role are required');
    err.status = 400;
    throw err;
  }
  if (users.some(u => u.email.toLowerCase() === cleanEmail.toLowerCase())) {
    const err = new Error('A user with that email already exists');
    err.status = 409;
    throw err;
  }
  const id = users.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0) + 1;
  const hash = await bcrypt.hash(password, 10);
  const user = {
    id,
    name: String(name).trim(),
    email: cleanEmail,
    password: hash,
    role,
    avatar: initialsFromName(name),
    employeeId: employeeId ? String(employeeId) : null,
  };
  users.push(user);
  saveUsers(users);
  return publicUser(user);
}

export function deleteUserById(id) {
  const users = loadUsers();
  const idx = users.findIndex(u => String(u.id) === String(id));
  if (idx === -1) return null;
  const [removed] = users.splice(idx, 1);
  saveUsers(users);
  return publicUser(removed);
}

// --- Authorization rules ----------------------------------------------------
// Super admin manages admins + employees; admin manages employees only;
// employees manage no one. Nobody can create superadmins or delete a
// superadmin, and you cannot delete your own account.

export function canCreateRole(actorRole, targetRole) {
  if (actorRole === 'superadmin') return targetRole === 'admin' || targetRole === 'employee';
  if (actorRole === 'admin') return targetRole === 'employee';
  return false;
}

export function canDeleteUser(actor, target) {
  if (!actor || !target) return false;
  if (String(actor.id) === String(target.id)) return false; // no self-delete
  if (target.role === 'superadmin') return false;           // superadmins are protected
  if (actor.role === 'superadmin') return target.role === 'admin' || target.role === 'employee';
  if (actor.role === 'admin') return target.role === 'employee';
  return false;
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name, avatar: user.avatar, employeeId: user.employeeId ?? null },
    getSecret(),
    { expiresIn: process.env.JWT_EXPIRES || '8h' }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, getSecret());
}

export function getUserFromRequest(request) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  try {
    return verifyToken(auth.slice(7));
  } catch {
    return null;
  }
}

export function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, employeeId: user.employeeId ?? null };
}
