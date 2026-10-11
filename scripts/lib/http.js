// fetch wrapper for batch runs: per-host queues for services that rate-limit, retries with
// exponential backoff on 429 / 503 / timeouts / network errors, and a log line for every
// request that ultimately fails. The shared check modules (src/lib/*.ts) accept it through
// their `fetch` option.
//
// Timing contract with the checks (see FetchLike in src/lib/*.ts): because this wrapper sets
// `handlesTimeouts = true`, the checks send `timeoutMs` (how long the request itself may take)
// and `deadline` (when the whole check must stop) instead of an AbortSignal. A request may wait
// in a host queue without spending its `timeoutMs`, but never past `deadline`.

const RETRY_STATUS = new Set([429, 503]);
const MAX_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 15000;

// Hosts that answer 503 "slow down" or stall when several domains query them at once.
const HOST_LIMITS = {
  'index.commoncrawl.org': 2,
  'web.archive.org': 6,
  'archive.org': 4,
  'query.wikidata.org': 2,
};

// Errors that won't change on retry: unknown domain, bad certificate, malformed URL.
const PERMANENT = new Set(['ENOTFOUND', 'ERR_INVALID_URL', 'CERT_HAS_EXPIRED', 'ERR_TLS_CERT_ALTNAME_INVALID', 'DEPTH_ZERO_SELF_SIGNED_CERT']);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const timeoutError = (msg) => Object.assign(new Error(msg), { name: 'TimeoutError' });

/** Counting semaphore whose waiters give up at their own deadline. */
function makeLimiter(limit) {
  let active = 0;
  const waiting = [];
  const makeRelease = () => {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      active--;
      while (waiting.length && active < limit) {
        const w = waiting.shift();
        if (w.done) continue;
        w.done = true;
        clearTimeout(w.timer);
        active++;
        w.resolve(makeRelease());
      }
    };
  };
  return function acquire(deadline) {
    if (active < limit) { active++; return Promise.resolve(makeRelease()); }
    return new Promise((resolve, reject) => {
      const w = { resolve, done: false, timer: null };
      const wait = deadline - Date.now();
      if (Number.isFinite(wait)) {
        w.timer = setTimeout(() => {
          if (w.done) return;
          w.done = true;
          reject(timeoutError('check deadline reached while waiting for a free slot'));
        }, Math.max(0, wait));
      }
      waiting.push(w);
    });
  };
}

const limiters = new Map();
function acquireSlot(host, deadline) {
  const limit = HOST_LIMITS[host];
  if (!limit) return Promise.resolve(() => {});
  if (!limiters.has(host)) limiters.set(host, makeLimiter(limit));
  return limiters.get(host)(deadline);
}

function retryAfterMs(res) {
  const v = res.headers.get('retry-after');
  if (!v) return null;
  const s = Number(v);
  if (Number.isFinite(s)) return s * 1000;
  const t = Date.parse(v);
  return Number.isFinite(t) ? Math.max(0, t - Date.now()) : null;
}

function describe(err) {
  if (!err) return 'unknown error';
  const cause = err.cause ? ` (${err.cause.code || err.cause.message || err.cause})` : '';
  return `${err.name || 'Error'}: ${err.message}${cause}`;
}

/**
 * Build a fetch for one domain's checks.
 * @param {{ onError: (entry: object) => void, domain: string, tool: string }} ctx
 */
export function makeBatchFetch({ onError, domain, tool }) {
  async function batchFetch(url, init = {}) {
    const { timeoutMs = DEFAULT_TIMEOUT_MS, deadline = Infinity, signal: callerSignal, ...rest } = init;
    let host = '';
    try { host = new URL(url).hostname; } catch { /* invalid URL: let fetch throw */ }

    for (let attempt = 1; ; attempt++) {
      const queuedAt = Date.now();
      let release;
      try {
        release = await acquireSlot(host, deadline);
      } catch (err) {
        onError({ domain, tool, kind: 'request-timeout', url, error: describe(err), attempt, queuedMs: Date.now() - queuedAt });
        throw err;
      }

      // The request's own time starts now, after any queueing, and never runs past the deadline.
      const started = Date.now();
      const budget = Math.min(timeoutMs, deadline - started);
      if (budget < 1000) {
        release();
        const err = timeoutError('no time left before the check deadline');
        onError({ domain, tool, kind: 'request-timeout', url, error: describe(err), attempt });
        throw err;
      }
      const ownTimeout = AbortSignal.timeout(budget);
      const signal = callerSignal ? AbortSignal.any([callerSignal, ownTimeout]) : ownTimeout;

      let res;
      try {
        res = await fetch(url, { ...rest, signal });
      } catch (err) {
        release();
        const timedOut = signal.aborted || err?.name === 'TimeoutError' || err?.name === 'AbortError';
        const permanent = PERMANENT.has(err?.cause?.code);
        const wait = 1000 * 2 ** (attempt - 1) + Math.random() * 300;
        if (!permanent && attempt < MAX_ATTEMPTS && Date.now() + wait + 1000 < deadline && !callerSignal?.aborted) {
          onError({ domain, tool, kind: 'retry', url, error: describe(err), attempt, waitMs: Math.round(wait) });
          await sleep(wait);
          continue;
        }
        onError({ domain, tool, kind: timedOut ? 'request-timeout' : 'request-failed', url, error: describe(err), attempt, ms: Date.now() - started });
        throw err;
      }
      // Headers are in: free the slot (the body is read under the same time limit).
      release();

      if (RETRY_STATUS.has(res.status) && attempt < MAX_ATTEMPTS && !callerSignal?.aborted) {
        const wait = Math.min(retryAfterMs(res) ?? 1000 * 2 ** (attempt - 1), 10000) + Math.random() * 300;
        if (Date.now() + wait + 1000 < deadline) {
          await res.body?.cancel().catch(() => {});
          onError({ domain, tool, kind: 'retry', url, status: res.status, attempt, waitMs: Math.round(wait) });
          await sleep(wait);
          continue;
        }
      }
      if (res.status === 429 || res.status >= 500) {
        onError({ domain, tool, kind: 'request-failed', url, status: res.status, attempt, ms: Date.now() - started });
      }
      return res;
    }
  }
  batchFetch.handlesTimeouts = true;
  return batchFetch;
}
