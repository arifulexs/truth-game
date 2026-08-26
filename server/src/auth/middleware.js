import jwt from 'jsonwebtoken';

// Read process.env.JWT_SECRET live on every call rather than caching it at
// module-load time. ES module imports all resolve before index.js runs its
// own top-level code, so a module-level constant here would capture
// `undefined` whenever this file loads before index.js's fallback-secret
// check has had a chance to run — which is exactly what happens on a fresh
// checkout with no .env file. Reading it lazily sidesteps that ordering
// entirely: by the time a request actually arrives, index.js has long since
// finished setting it.
function getSecret() {
  return process.env.JWT_SECRET;
}

export function signToken(user) {
  return jwt.sign({ sub: user.id }, getSecret(), { expiresIn: '30d' });
}

export function verifyToken(token) {
  return jwt.verify(token, getSecret());
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Please log in.' });
  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'UNAUTHENTICATED', message: 'Your session expired. Please log in again.' });
  }
}
