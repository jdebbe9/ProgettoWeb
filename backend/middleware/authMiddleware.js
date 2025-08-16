/**
 * Middleware di autenticazione e autorizzazione + utilità per gestione errori.
 *
 * MODELLO SCELTO (importante all'orale):
 * - Access Token (JWT) breve nel *header* Authorization: "Bearer <token>".
 * - Refresh Token lungo in *cookie httpOnly* gestito nei controller auth (NON qui).
 *
 * Questo file fornisce:
 *  - requireAuth: verifica il JWT d'accesso e popola req.user = { id, role }
 *  - requireRole / requireAnyRole: autorizzazione in base al ruolo
 *  - wrapAsync: wrapper per evitare try/catch ripetuti nelle route/controller
 *  - notFound / errorHandler: gestione centralizzata di 404 e errori runtime
 */

const jwt = require('jsonwebtoken');

// Fail-fast se manca il segreto per firmare i JWT di accesso
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET;
if (!ACCESS_SECRET) {
  console.error('FATAL: manca ACCESS_TOKEN_SECRET nel .env');
  process.exit(1);
}

/** Estrae e valida l'header Authorization ("Bearer <token>") */
function getBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

/**
 * AUTENTICAZIONE
 * Verifica il JWT d'accesso e popola req.user con { id, role }.
 * Se il token è assente/invalidato/scaduto → 401.
 */
function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ message: 'Token mancante' });

  try {
    // Il payload è definito nel controller di auth quando firmiamo l'access token
    // payload atteso: { userId, role, iat, exp }
    const payload = jwt.verify(token, ACCESS_SECRET);
    req.user = { id: payload.userId, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ message: 'Token non valido o scaduto' });
  }
}

/**
 * AUTORIZZAZIONE (singolo ruolo)
 * Esempio: router.get('/admin', requireAuth, requireRole('therapist'), handler)
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Non autenticato' });
    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Accesso negato: ruolo non autorizzato' });
    }
    next();
  };
}

/**
 * AUTORIZZAZIONE (più ruoli)
 * Esempio: router.get('/area', requireAuth, requireAnyRole(['therapist','patient']), handler)
 */
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

/**
 * UTILE: wrapper per funzioni async di route/controller
 * Evita di scrivere try/catch ovunque: eventuali errori finiscono nell'errorHandler.
 *
 * Esempio:
 *   router.get('/', requireAuth, wrapAsync(async (req, res) => {
 *     const dati = await Model.find();
 *     res.json(dati);
 *   }));
 */
function wrapAsync(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * 404 handler (da montare in coda alle route)
 */
function notFound(_req, res, _next) {
  res.status(404).json({ message: 'Route non trovata' });
}

/**
 * Error handler centralizzato (da montare per ultimo)
 * Restituisce JSON coerente; in dev include lo stack trace.
 */
function errorHandler(err, req, res, _next) {
  // Se qualche middleware/route ha già impostato uno status (!= 200), lo rispettiamo
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

