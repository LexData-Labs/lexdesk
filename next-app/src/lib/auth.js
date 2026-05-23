import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const USERS = [
  { id: 1, name: 'Super Admin',              email: 'superadmin@example.com', password: '$2a$10$WISgkzGnvzoe9UXF2d0AneqBTUS5Q7QGGIGtXCOqVtfNrncl2SwLq', role: 'superadmin', avatar: 'SA' },
  { id: 2, name: 'Admin & Team Supervisor',  email: 'admin@example.com',      password: '$2a$10$WISgkzGnvzoe9UXF2d0AneqBTUS5Q7QGGIGtXCOqVtfNrncl2SwLq', role: 'admin',      avatar: 'AU' },
  { id: 3, name: 'Employee User',            email: 'employee@example.com',   password: '$2a$10$jA/80t58plx9Xav8zaNpg.yh4ElBX53IblFIkEdlDClzt8.gz3Lgu', role: 'employee',   avatar: 'EU' },
];

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
}

export function findUserByEmail(email) {
  if (!email) return null;
  return USERS.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name, avatar: user.avatar },
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
  return { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar };
}
