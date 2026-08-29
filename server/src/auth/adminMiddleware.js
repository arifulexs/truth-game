import * as users from '../db/users.js';

export async function requireAdmin(req, res, next) {
  const user = await users.findById(req.userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Admin access required.' });
  }
  next();
}
