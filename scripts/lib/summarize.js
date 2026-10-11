// Turns the full Crawler Check and Positioning Check reports into the flat columns of
// results.csv. Only reads the reports; it never re-implements any check.

/** crawler_status: ok / blocked / empty / js_dependent / error, plus a human-readable detail. */
export function summarizeCrawler(result) {
  if (!result || result.status !== 200) {
    return { crawler_status: 'error', crawler_detail: result?.data?.error ?? 'crawler check failed' };
  }
  const r = result.data;
  const ids = new Set((r.findings || []).map((f) => f.id));
  const bots = r.bots || [];

  const robotsBlocked = bots.filter((b) => b.cites && b.robots && !b.robots.allowed);
  const serverBlocked = bots.filter((b) => b.live?.blocked);
  const trainingBlocked = bots.filter((b) => !b.cites && b.robots && !b.robots.allowed);
  const words = r.page?.words ?? 0;

  const parts = [];
  if (robotsBlocked.length) {
    parts.push('robots.txt blocks ' + robotsBlocked.map((b) => `${b.name} (${b.robots.matched ?? 'blocked'})`).join(', '));
  }
  if (serverBlocked.length) {
    parts.push(
      'server refuses requests sent with the user agent of ' +
        serverBlocked.map((b) => `${b.name} (${b.live.note})`).join(', ') +
        ' — sites that verify real bots by IP may still let the real crawler in'
    );
  }

  let status = 'ok';
  if (robotsBlocked.length || serverBlocked.length || ids.has('robots-citing') || ids.has('live-block')) {
    status = 'blocked';
  } else if (ids.has('js-content')) {
    status = 'js_dependent';
    parts.push(`content rendered by JavaScript: only ${words} words in the raw HTML`);
  } else if (words < 50) {
    status = 'empty';
    parts.push(`only ${words} words in raw HTML (HTTP ${r.page?.status ?? '?'})`);
  }
  if (ids.has('noindex')) parts.push('page is noindex');
  if (trainingBlocked.length) parts.push('training bots blocked: ' + trainingBlocked.map((b) => b.name).join(', '));

  return { crawler_status: status, crawler_detail: parts.join('; ') };
}

const LEVEL_TO_SEVERITY = { stable: 'minor', shifted: 'minor', rewritten: 'major' };

/** Positioning columns. Conservative: anything the data can't support is "cant_tell". */
export function summarizePositioning(result) {
  const empty = {
    current_description: '',
    historical_descriptions: '',
    latest_crawl_date: '',
    crawl_matches_current: 'cant_tell',
    mismatch_severity: 'cant_tell',
  };
  if (!result || result.status !== 200) return empty;
  const r = result.data;

  const current = r.today?.description || r.today?.fields?.title || '';
  const history = (r.history || []).map(
    (h) => `${h.date}: ${[h.fields?.title, h.description].filter(Boolean).join(' — ')}`
  );
  if (r.today?.liveSince) history.push(`${r.today.liveSince}: (same as today)`);

  const captures = r.commonCrawl?.ok ? r.commonCrawl.captures || [] : [];
  const latest = captures[0]; // sorted newest first by the check
  let matches = 'cant_tell';
  let severity = 'cant_tell';
  if (latest) {
    if (latest.version === 'current') { matches = 'yes'; severity = 'none'; }
    else if (latest.version === 'unknown') { matches = 'cant_tell'; severity = 'cant_tell'; }
    else {
      matches = 'no';
      const version = (r.history || []).find((h) => h.date === latest.version);
      const titleChanged =
        version && (version.fields?.title || '').trim().toLowerCase() !== (r.today?.fields?.title || '').trim().toLowerCase();
      severity = titleChanged ? 'major' : LEVEL_TO_SEVERITY[version?.vsToday?.level] ?? 'cant_tell';
    }
  }

  return {
    current_description: current,
    historical_descriptions: history.join(' | '),
    latest_crawl_date: latest?.date ?? '',
    crawl_matches_current: matches,
    mismatch_severity: severity,
  };
}
