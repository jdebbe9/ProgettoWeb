

const jwt = require('jsonwebtoken');


const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
if (!ACCESS_SECRET) {
  console.error('FATAL: manca ACCESS_TOKEN_SECRET nel .env');
  process.exit(1);
}


function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}


function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ message: 'Token mancante' });

  try {
 
    const payload = jwt.verify(token, ACCESS_SECRET);
    req.user = { id: payload.userId, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ message: 'Token non valido o scaduto' });
  }
}



function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Non autenticato' });
    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Accesso negato: ruolo non autorizzato' });
    }
    next();
  };
}


function requireAnyRole(allowed) {
  const set = new Set(Array.isArray(allowed) ? allowed : [allowed]);
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Non autenticato' });
    if (!set.has(req.user.role)) {
      return res.status(403).json({ message: 'Accesso negato: ruolo non autorizzato' });
    }
    next();
  };
}


function wrapAsync(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}


function notFound(_req, res, _next) {
  res.status(404).json({ message: 'Route non trovata' });
}



function errorHandler(err, req, res, _next) {
 
  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  const body = { message: err?.message || 'Errore interno' };

  if (process.env.NODE_ENV !== 'production' && err?.stack) {
    body.stack = err.stack;
  }

  console.error('❌ Error:', err);
  res.status(status).json(body);
}

module.exports = {
  requireAuth,
  requireRole,
  requireAnyRole,
  wrapAsync,
  notFound,
  errorHandler,
};

