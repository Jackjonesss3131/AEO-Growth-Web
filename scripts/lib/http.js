// fetch wrapper for batch runs: polite per-host concurrency, retries with exponential backoff
// on 429 / 503 / network errors, and a log line for every request that ultimately fails.
// The shared check modules (src/lib/*.ts) accept it through their `fetch` option.

const RETRY_STATUS = new Set([429, 503]);
const MAX_ATTEMPTS = 3;

// Services that rate-limit hard. Requests to them are queued per host so a batch with
// several domains in flight doesn't hammer them all at once.
const HOST_LIMITS = {
  'web.archive.org': 4,
  'archive.org': 3,
  'index.commoncrawl.org': 2, // answers 503 "slow down" quickly when pushed
  'query.wikidata.org': 2,
};
const DEFAULT_REQUEST_MS = 20000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeLimiter(limit) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= limit || !queue.length) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => { active--; next(); });
  };
  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); next(); });
}

const limiters = new Map();
function limiterFor(host) {
  const limit = HOST_LIMITS[host];
  if (!limit) return (fn) => fn();
  if (!limiters.has(host)) limiters.set(host, makeLimiter(limit));
  return limiters.get(host);
}

function retryAfterMs(res) {
  const v = res.headers.get('retry-after');
  if (!v) return null;
  const s = Number(v);
  if (Number.isFinite(s)) return s * 1000;
  const t = Date.parse(v);
  return Number.isFinite(t) ? Math.max(0, t - Date.now()) : null;
}

/**
 * Build a fetch for one domain's checks.
 * @param {{ onError: (entry: object) => void, domain: string, tool: string }} ctx
 */
export function makeBatchFetch({ onError, domain, tool }) {
  return async function batchFetch(url, init = {}) {
    let host = '';
    try { host = new URL(url).hostname; } catch { /* invalid URL: let fetch throw */ }
    const limited = limiterFor(host);
    const queued = host in HOST_LIMITS;
    // For queued hosts the caller's timeout would keep running while the request waits for
    // its turn, so it is replaced by our own timeout that starts when the request is sent
    // (init.timeoutMs, passed by the check modules). Other hosts keep the caller's signal.
    const signalFor = () => (queued ? AbortSignal.timeout(init.timeoutMs ?? DEFAULT_REQUEST_MS) : init.signal);
    let signal = init.signal;

    for (let attempt = 1; ; attempt++) {
      const started = Date.now();
      try {
        const res = await limited(() => { signal = signalFor(); return fetch(url, { ...init, signal }); });
        if (RETRY_STATUS.has(res.status) && attempt < MAX_ATTEMPTS && !signal?.aborted) {
          const wait = Math.min(retryAfterMs(res) ?? 1000 * 2 ** (attempt - 1), 10000) + Math.random() * 300;
          onError({ domain, tool, kind: 'retry', url, status: res.status, attempt, waitMs: Math.round(wait) });
          await res.body?.cancel().catch(() => {});
          await sleep(wait);
          continue;
        }
        if (res.status === 429 || res.status >= 500) {
          onError({ domain, tool, kind: 'request-failed', url, status: res.status, attempt, ms: Date.now() - started });
        }
        return res;
      } catch (err) {
        const timedOut = signal?.aborted || err?.name === 'TimeoutError' || err?.name === 'AbortError';
        const permanent = ['ENOTFOUND', 'ERR_INVALID_URL', 'CERT_HAS_EXPIRED', 'ERR_TLS_CERT_ALTNAME_INVALID'].includes(err?.cause?.code);
        // Don't retry: a timeout imposed by the check itself (its time budget is spent; the
        // domain-level retry in batch-audit.js handles that) or a permanent error such as an
        // unknown domain or a bad certificate.
        if (!timedOut && !permanent && attempt < MAX_ATTEMPTS) {
          const wait = 1000 * 2 ** (attempt - 1) + Math.random() * 300;
          onError({ domain, tool, kind: 'retry', url, error: describe(err), attempt, waitMs: Math.round(wait) });
          await sleep(wait);
          continue;
        }
        onError({ domain, tool, kind: timedOut ? 'request-timeout' : 'request-failed', url, error: describe(err), attempt, ms: Date.now() - started });
        throw err;
      }
    }
  };
}

function describe(err) {
  if (!err) return 'unknown error';
  const cause = err.cause ? ` (${err.cause.code || err.cause.message || err.cause})` : '';
  return `${err.name || 'Error'}: ${err.message}${cause}`;
}
