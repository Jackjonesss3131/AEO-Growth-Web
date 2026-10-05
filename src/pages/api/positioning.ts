---
import BaseHead from '../components/BaseHead.astro';
import Footer from '../components/Footer.astro';
import Header from '../components/Header.astro';
import { SITE_TITLE } from '../consts';

export const prerender = false;
---

<!doctype html>
<html lang="en">
  <head>
    <BaseHead
      title={`Positioning Check — ${SITE_TITLE}`}
      description="See how your homepage described your company over time, and which version AI training data most likely captured."
    />
  </head>
  <body>
    <Header />

    <main class="pc">
      <header class="pc-head">
        <p class="pc-kicker">Positioning Check</p>
        <h1>Which version of your company did AI learn?</h1>
        <p class="pc-lede">
          Models learn from snapshots of the web, many of them years old. Paste your domain to see how
          your homepage described you over time, and which version most of those snapshots captured.
        </p>
      </header>

      <form id="pc-form" class="pc-form">
        <label for="pc-domain">Your domain</label>
        <div class="pc-row">
          <input id="pc-domain" type="text" inputmode="url" placeholder="yourcompany.com" required autocomplete="off" />
          <button type="submit" id="pc-btn">Check positioning</button>
        </div>
        <p class="pc-hint" id="pc-status">Takes between 10 and 30 seconds.</p>
      </form>

      <section id="pc-result" class="pc-result" hidden aria-live="polite"></section>
    </main>

    <Footer />
  </body>
</html>

<style is:global>
  .pc { max-width: 960px; margin: 0 auto; padding: 64px 20px 96px; }
  .pc-head, .pc-form { max-width: 640px; }
  .pc-kicker { font-size: .875rem; opacity: .65; margin: 0 0 12px; }
  .pc h1 { font-size: clamp(2rem, 5vw, 3rem); line-height: 1.1; margin: 0 0 16px; }
  .pc-lede { font-size: 1.0625rem; line-height: 1.6; opacity: .8; margin: 0; }
  .pc-form { margin-top: 40px; }
  .pc-form label { display: block; font-weight: 600; margin-bottom: 8px; }
  .pc-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .pc-row input {
    flex: 1 1 260px; padding: 12px 14px; font: inherit; color: inherit; background: transparent;
    border: 1px solid color-mix(in srgb, currentColor 25%, transparent); border-radius: 8px;
  }
  .pc-row button, .pc-cta a {
    padding: 12px 20px; font: inherit; font-weight: 600; border: 0; border-radius: 8px; cursor: pointer;
    background: CanvasText; color: Canvas; text-decoration: none;
  }
  .pc-row button:disabled { opacity: .5; cursor: progress; }
  .pc input:focus-visible, .pc button:focus-visible, .pc a:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
  .pc-hint { font-size: .875rem; opacity: .65; margin: 8px 0 0; }
  .pc-result { margin-top: 64px; display: grid; gap: 56px; }
  .pc-result[hidden] { display: none; }
  .pc-result h2 { font-size: clamp(1.5rem, 3.5vw, 2.125rem); line-height: 1.2; margin: 0 0 12px; max-width: 28ch; }
  .pc-result h3 { font-size: 1.125rem; margin: 0 0 6px; }
  .pc-sub { opacity: .7; margin: 0 0 20px; line-height: 1.55; max-width: 64ch; }
  .pc-detail { font-size: 1.0625rem; line-height: 1.6; margin: 0; max-width: 60ch; }
  .pc-timeline { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 28px; }
  .pc-col { border-top: 2px solid color-mix(in srgb, currentColor 18%, transparent); padding-top: 16px; }
  .pc-col.is-today { border-top-color: currentColor; }
  .pc-date { font-weight: 700; margin: 0 0 8px; }
  .pc-title { font-size: .875rem; opacity: .65; margin: 0 0 8px; }
  .pc-desc { line-height: 1.55; margin: 0 0 14px; }
  .pc-small { font-size: .8125rem; opacity: .65; margin: 0 0 6px; }
  .pc-chips { list-style: none; padding: 0; margin: 0 0 14px; display: flex; flex-wrap: wrap; gap: 6px; }
  .pc-chips li { font-size: .8125rem; padding: 3px 9px; border-radius: 999px; background: color-mix(in srgb, currentColor 8%, transparent); }
  .pc-chips.is-dropped li { text-decoration: line-through; }
  .pc-col a { font-size: .875rem; color: inherit; }
  .pc-bars { display: grid; gap: 10px; max-width: 640px; }
  .pc-bar { display: grid; grid-template-columns: 160px 1fr 32px; gap: 12px; align-items: center; font-size: .9375rem; }
  .pc-bar-track { height: 10px; border-radius: 999px; background: color-mix(in srgb, currentColor 8%, transparent); overflow: hidden; }
  .pc-bar-fill { height: 100%; background: currentColor; }
  .pc-bar span:last-child { text-align: right; font-variant-numeric: tabular-nums; }
  .pc-fields { border-top: 1px solid color-mix(in srgb, currentColor 15%, transparent); }
  .pc-field {
    display: grid; grid-template-columns: 190px 1fr 170px; gap: 16px; padding: 14px 0;
    border-bottom: 1px solid color-mix(in srgb, currentColor 15%, transparent); line-height: 1.5;
  }
  .pc-field > :first-child { font-weight: 600; }
  .pc-flag { font-size: .875rem; }
  .pc-flag.is-off { color: #b45309; }
  .pc-flag.is-missing { opacity: .55; }
  .pc-cta { padding: 32px; border-radius: 12px; background: color-mix(in srgb, currentColor 6%, transparent); }
  .pc-cta p { margin: 0 0 20px; line-height: 1.6; max-width: 56ch; }
  .pc-cta a { display: inline-block; }
  .pc-switch { margin-top: 24px; padding: 20px 22px; border-radius: 10px; background: color-mix(in srgb, currentColor 5%, transparent); max-width: 60ch; }
  .pc-switch .pc-small { margin: 0 0 4px; }
  .pc-switch-old { margin: 0 0 16px; font-size: 1.0625rem; opacity: .6; text-decoration: line-through; }
  .pc-switch-new { margin: 0; font-size: 1.0625rem; font-weight: 600; }
  .pc-method { font-size: .8125rem; opacity: .65; line-height: 1.6; max-width: 70ch; margin: 0; }
  @media (max-width: 640px) {
    .pc-field { grid-template-columns: 1fr; gap: 4px; }
    .pc-bar { grid-template-columns: 110px 1fr 28px; }
  }
</style>

<script>
  const CALENDLY = 'https://calendly.com/geraldgerez/growth-plg';
  const form = document.getElementById('pc-form');
  const input = document.getElementById('pc-domain');
  const btn = document.getElementById('pc-btn');
  const statusEl = document.getElementById('pc-status');
  const out = document.getElementById('pc-result');

  function el(tag, attrs, ...children) {
    attrs = attrs || {};
    const n = document.createElement(tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    for (const c of children) if (c) n.append(c);
    return n;
  }

  function monthYear(d) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  const LEVEL = {
    stable: 'stayed consistent',
    shifted: 'shifted',
    rewritten: 'changed almost completely'
  };

  function chips(words, cls) {
    if (!words || !words.length) return null;
    const ul = el('ul', { class: 'pc-chips ' + (cls || '') });
    words.slice(0, 8).forEach(function (w) { ul.append(el('li', {}, w)); });
    return ul;
  }

  function section(title, sub, body) {
    const d = el('div', {});
    d.append(el('h3', {}, title));
    d.append(el('p', { class: 'pc-sub' }, sub));
    if (body) d.append(body);
    return d;
  }

  function render(d) {
    const s = d.summary;
    const cc = d.commonCrawl;
    const parts = [];

    let headline, detail;
    if (!s) {
      headline = 'We found no archived versions of your homepage.';
      detail = 'Models likely know little about you beyond what is live today.';
    } else if (!s.level) {
      headline = 'We found versions of your homepage going back to ' + monthYear(s.since) + '.';
      detail = 'Some of them have no description we could compare. Check them in the timeline below.';
    } else if (s.titleChanged && s.level === 'stable') {
      // El título cambió pero la descripción no: cambio de categoría, no de palabras
      headline = 'You changed how you name your category since ' + monthYear(s.since) + '.';
      detail = 'Your description stayed close to the same, but your title tag did not. The title is the strongest signal a model has for what category you belong to.';
    } else {
      headline = 'Your positioning has ' + LEVEL[s.level] + ' since ' + monthYear(s.since) + '.';
      detail = s.ccTotal
        ? s.ccOlder + ' of the ' + s.ccTotal + ' recent Common Crawl snapshots we found likely captured an older version of your homepage.'
        : 'We found no recent Common Crawl snapshots of your homepage.';
    }
    const intro = el('div', {});
    intro.append(el('h2', {}, headline));
    intro.append(el('p', { class: 'pc-detail' }, detail));

    if (s && s.titleChanged && s.oldTitle && s.newTitle) {
      const sw = el('div', { class: 'pc-switch' });
      sw.append(el('p', { class: 'pc-small' }, 'Your title tag then'));
      sw.append(el('p', { class: 'pc-switch-old' }, s.oldTitle));
      sw.append(el('p', { class: 'pc-small' }, 'Your title tag now'));
      sw.append(el('p', { class: 'pc-switch-new' }, s.newTitle));
      intro.append(sw);
    }
    parts.push(intro);

    const timeline = el('div', { class: 'pc-timeline' });
    d.history.forEach(function (v) {
      const col = el('article', { class: 'pc-col' });
      col.append(el('p', { class: 'pc-date' }, monthYear(v.date)));
      col.append(el('p', { class: 'pc-title' }, v.fields.title || 'No title'));
      col.append(el('p', { class: 'pc-desc' }, v.description || 'No description found'));
      if (v.vsToday && v.vsToday.dropped.length) {
        col.append(el('p', { class: 'pc-small' }, 'Gone from your homepage today'));
        const c = chips(v.vsToday.dropped, 'is-dropped');
        if (c) col.append(c);
      }
      col.append(el('a', { href: v.archiveUrl, target: '_blank', rel: 'noopener' }, 'View archived page'));
      timeline.append(col);
    });
    const todayCol = el('article', { class: 'pc-col is-today' });
    todayCol.append(el('p', { class: 'pc-date' }, 'Today'));
    todayCol.append(el('p', { class: 'pc-title' }, d.today.fields.title || 'No title'));
    todayCol.append(el('p', { class: 'pc-desc' }, d.today.description || 'No description found'));
    if (d.today.addedSinceOldest.length) {
      todayCol.append(el('p', { class: 'pc-small' }, 'New since your oldest version'));
      const c = chips(d.today.addedSinceOldest);
      if (c) todayCol.append(c);
    }
    timeline.append(todayCol);
    parts.push(section(
      'How your homepage described you',
      'The main description on your homepage at each point, taken from the Internet Archive.',
      timeline
    ));

    let ccBody;
    if (!cc) {
      ccBody = el('p', {}, "Common Crawl's index didn't respond. Try again in a few minutes.");
    } else if (!cc.captures.length) {
      ccBody = el('p', {}, cc.errors > cc.crawlsChecked / 2
        ? "Common Crawl's index is busy right now. Try again in a few minutes."
        : 'None of the last ' + cc.crawlsChecked + ' Common Crawl indexes include your homepage.');
    } else {
      const versions = d.history.map(function (h) { return h.date; });
      versions.push(d.today.date);
      let max = 1;
      versions.forEach(function (v) { if ((cc.byVersion[v] || 0) > max) max = cc.byVersion[v]; });

      ccBody = el('div', {});
      const bars = el('div', { class: 'pc-bars' });
      versions.forEach(function (v) {
        const n = cc.byVersion[v] || 0;
        const fill = el('div', { class: 'pc-bar-fill' });
        fill.style.width = ((n / max) * 100) + '%';
        const track = el('div', { class: 'pc-bar-track' });
        track.append(fill);
        const row = el('div', { class: 'pc-bar' });
        row.append(el('span', {}, v === d.today.date ? "Today's version" : 'Version from ' + monthYear(v)));
        row.append(track);
        row.append(el('span', {}, String(n)));
        bars.append(row);
      });
      ccBody.append(bars);
      const dates = cc.captures.map(function (c) { return monthYear(c.date); }).join(', ');
      ccBody.append(el('p', { class: 'pc-small', style: 'margin-top:14px' }, 'Captured in: ' + dates));
    }
    parts.push(section(
      'Which version the training data captured',
      'We checked your homepage in the last ' + (cc ? cc.crawlsChecked : 12) + ' Common Crawl indexes.',
      ccBody
    ));

    const fieldsWrap = el('div', { class: 'pc-fields' });
    d.consistency.forEach(function (c) {
      const row = el('div', { class: 'pc-field' });
      row.append(el('span', {}, c.field));
      row.append(el('span', {}, c.value || 'Missing'));
      let cls = 'pc-flag';
      if (c.matches === false) cls += ' is-off';
      if (c.matches === null) cls += ' is-missing';
      const txt = c.matches === null ? 'Not set' : c.matches ? 'Matches your description' : 'Says something different';
      row.append(el('span', { class: cls }, txt));
      fieldsWrap.append(row);
    });
    parts.push(section(
      'Does your homepage agree with itself?',
      'Models read every one of these fields. When they say different things, the model picks one.',
      fieldsWrap
    ));

    const wd = d.wikidata;
    let wdBody;
    if (!wd.checked) {
      wdBody = el('p', {}, "Wikidata didn't respond. Try again in a few minutes.");
    } else if (!wd.found) {
      wdBody = el('p', {}, 'No Wikidata entry links to your domain.');
    } else {
      wdBody = el('p', {});
      wdBody.append(el('a', { href: wd.url, target: '_blank', rel: 'noopener' }, wd.label || 'Your entry'));
      wdBody.append(': ' + (wd.description || 'no description set'));
    }
    parts.push(section('Wikidata', 'Many models use Wikidata to confirm what a company is.', wdBody));

    const cta = el('div', { class: 'pc-cta' });
    cta.append(el('h3', {}, 'This is the record. It is not the answer.'));
    cta.append(el('p', {}, 'This check shows what models had to learn from. It does not show what ChatGPT, Perplexity or Gemini say about you today. The free audit does.'));
    cta.append(el('a', { href: CALENDLY, target: '_blank', rel: 'noopener' }, 'Book a free audit'));
    parts.push(cta);

    parts.push(el('p', { class: 'pc-method' },
      'Method: archived homepages from the Internet Archive at roughly 12, 24 and 36 months ago. Training data captures from the 12 most recent Common Crawl indexes. Results are cached for 24 hours.'
    ));

    out.innerHTML = '';
    parts.forEach(function (p) { out.append(p); });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const domain = input.value.trim();
    if (!domain) return;

    btn.disabled = true;
    btn.textContent = 'Checking...';
    statusEl.textContent = 'Reading your homepage, the Internet Archive and Common Crawl. Takes between 10 and 30 seconds.';
    out.hidden = true;

    fetch('/api/positioning?domain=' + encodeURIComponent(domain))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.error) throw new Error(data.error);
        render(data);
        out.hidden = false;
        statusEl.textContent = 'Checked ' + data.domain + '.';
      })
      .catch(function (err) {
        statusEl.textContent = err.message || "We couldn't run the check. Try again in a minute.";
      })
      .then(function () {
        btn.disabled = false;
        btn.textContent = 'Check positioning';
      });
  });
</script>
