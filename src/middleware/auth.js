import { config } from '../config.js';

// Pulls whatever key the caller sent, checking every shape a client might
// use for it. Order matters only in that the first one present wins:
//   - Authorization: Bearer <key>   (what Janitor's OpenAI-compatible /
//     "Custom Proxy" preset sends — this is the normal case)
//   - x-goog-api-key: <key>         (Gemini's own native header)
//   - x-proxy-key: <key>            (kept for backward compatibility)
//   - ?key=<key>                    (Janitor's native "Google AI Studio"
//     preset builds requests the same way Google's own docs show, which
//     means the key can arrive as a query string instead of a header)
function extractProvidedKey(req) {
  const authHeader = req.headers['authorization'] || '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch) return bearerMatch[1].trim();

  if (req.headers['x-goog-api-key']) return String(req.headers['x-goog-api-key']).trim();
  if (req.headers['x-proxy-key']) return String(req.headers['x-proxy-key']).trim();
  if (typeof req.query?.key === 'string' && req.query.key) return req.query.key.trim();

  return '';
}

/**
 * Resolves which Gemini API key to use for THIS request and attaches it as
 * req.geminiApiKey for the route handlers to forward upstream.
 *
 * Bring-your-own-key by default: whatever you paste into Janitor's normal
 * API key field IS the real Gemini key, forwarded through untouched. Set
 * nothing in Railway and it still works — and when you rotate/swap keys
 * you only ever touch Janitor, never redeploy.
 *
 * Three modes, chosen automatically by what's configured server-side:
 *
 * 1. Pure BYOK (GEMINI_API_KEY and PROXY_API_KEY both unset): the caller's
 *    key is used as-is. Anyone with your Railway URL still needs their own
 *    working Gemini key to get anywhere with it — they can't spend yours,
 *    since there isn't a "yours" sitting on the server.
 * 2. Password mode (both GEMINI_API_KEY and PROXY_API_KEY set): put
 *    PROXY_API_KEY into Janitor's field instead of your real key. Your
 *    real Gemini key never leaves Railway or gets typed into a third-party
 *    site's settings.
 * 3. Server fallback (GEMINI_API_KEY set, caller sends no key at all):
 *    used for local curl/testing without a client in the loop.
 *
 * `cfg` is injectable (defaults to the real config) so tests can exercise
 * all three modes without touching process.env or the module cache —
 * same pattern as resolveThinkingConfig in lib/generationDefaults.js.
 */
export function resolveApiKey(req, res, next, cfg = config) {
  const provided = extractProvidedKey(req);

  if (cfg.proxyApiKey && provided === cfg.proxyApiKey) {
    if (!cfg.geminiApiKey) {
      return res.status(500).json({
        error: 'PROXY_API_KEY is set but GEMINI_API_KEY is not, so there is no real key to substitute in.',
      });
    }
    req.geminiApiKey = cfg.geminiApiKey;
    return next();
  }

  if (provided) {
    req.geminiApiKey = provided;
    return next();
  }

  if (cfg.geminiApiKey) {
    req.geminiApiKey = cfg.geminiApiKey;
    return next();
  }

  return res.status(401).json({
    error:
      'No Gemini API key found on the request. Send it as "Authorization: Bearer <key>" ' +
      '(normally just whatever you put in your client\'s API key field), or set GEMINI_API_KEY ' +
      '(and optionally PROXY_API_KEY) on the server.',
  });
}
  
