---
import BaseHead from '../components/BaseHead.astro';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import { SITE_TITLE } from '../consts';

export const prerender = true;

const title = `Qué ve una IA en tu web — ${SITE_TITLE}`;
const description = 'Comprueba si ChatGPT, Claude, Perplexity y Google pueden leer tu web, y qué encuentran cuando entran.';
---

<!doctype html>
<html lang="es">
  <head>
    <BaseHead title={title} description={description} />
  </head>
  <body>
    <Header />
    <main id="aeo">
      <h1>Qué ve una IA cuando entra a tu web</h1>
      <p>
        Pega una URL. Revisamos tus reglas, hacemos la visita como lo haría cada bot y te decimos qué
        encuentran y qué les impide citarte.
      </p>

      <form id="aeo-form">
        <input id="aeo-url" type="text" inputmode="url" autocomplete="url"
          placeholder="tudominio.com o una página concreta" required />
        <button id="aeo-btn" type="submit">Analizar</button>
      </form>
      <p id="aeo-status" class="aeo-status" aria-live="polite"></p>

      <div id="aeo-out"></div>
    </main>
    <Footer />

    <script>
      const form = document.getElementById('aeo-form');
      const input = document.getElementById('aeo-url');
      const btn = document.getElementById('aeo-btn');
      const status = document.getElementById('aeo-status');
      const out = document.getElementById('aeo-out');

      const LEVEL = { alto: 'Importante', medio: 'Revisar', bajo: 'Menor', info: 'Dato' };
      const TYPE = { entrenamiento: 'Entrenamiento', busqueda: 'Búsqueda', usuario: 'Visita de usuario' };

      const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
      const fmtDate = (iso) => new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
      const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;

      function summary(c) {
        const parts = [];
        if (c.alto) parts.push(plural(c.alto, 'cosa importante', 'cosas importantes'));
        if (c.medio) parts.push(plural(c.medio, 'a revisar', 'a revisar'));
        if (c.bajo) parts.push(plural(c.bajo, 'menor', 'menores'));
        if (!parts.length) return 'No hay nada que arreglar. Solo datos de contexto abajo.';
        return parts.join(', ') + '.';
      }

      function render(d) {
        let h = `<p class="aeo-meta">${esc(d.finalUrl)} · leído como ${esc(d.viewAs)} · ${(d.ms / 1000).toFixed(1)} s</p>`;
        h += `<p class="aeo-sum">${summary(d.counts)}</p>`;

        h += `<h2>Hallazgos</h2>`;
        if (!d.findings.length) h += `<p>Nada que comentar.</p>`;
        h += `<ol class="aeo-findings">` + d.findings.map((f) => `
          <li class="lvl-${f.level}">
            <span class="aeo-lvl">${LEVEL[f.level]} · ${esc(f.area)}</span>
            <strong>${esc(f.title)}</strong>
            <p>${esc(f.detail)}</p>
            ${f.fix ? `<p class="aeo-fix">Qué hacer: ${esc(f.fix)}</p>` : ''}
          </li>`).join('') + `</ol>`;

        if (d.good.length) {
          h += `<h2>Lo que está bien</h2><ul class="aeo-good">${d.good.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>`;
        }

        if (d.page) {
          const p = d.page;
          h += `<h2>Lo que lee una IA al entrar</h2>
            <p class="aeo-note">El contenido principal tal como llega en el HTML, sin ejecutar JavaScript.</p>
            <blockquote>${esc(p.preview || '(vacío)')}${p.preview && p.preview.length >= 420 ? '…' : ''}</blockquote>
            <dl class="aeo-dl">
              <dt>Título</dt><dd>${esc(p.title || '—')}</dd>
              <dt>Descripción</dt><dd>${esc(p.description || '—')}</dd>
              <dt>Texto</dt><dd>${p.mainWords} palabras en el contenido principal (${p.words} en total)</dd>
              <dt>Idioma</dt><dd>${esc(p.lang || '—')}</dd>
              <dt>Canonical</dt><dd>${esc(p.canonical || '—')}</dd>
              <dt>Peso</dt><dd>${p.htmlKB} KB · ${(p.ms / 1000).toFixed(1)} s</dd>
            </dl>`;
          if (p.headings.length) {
            h += `<details><summary>Encabezados (${p.headings.length})</summary><ul class="aeo-outline">` +
              p.headings.slice(0, 40).map((x) =>
                `<li style="margin-left:${(x.level - 1) * 1.2}em"><span>H${x.level}</span> ${esc(x.text)}</li>`).join('') +
              `</ul></details>`;
          }
        }

        h += `<h2>Quién puede entrar</h2>
          <p class="aeo-note">"robots.txt" es lo que dicen tus reglas. "Prueba real" es lo que pasó al pedir la página haciéndonos pasar por cada bot.</p>
          <div class="aeo-scroll"><table><thead><tr><th>Bot</th><th>Para qué</th><th>robots.txt</th><th>Prueba real</th></tr></thead><tbody>`;
        for (const b of d.bots) {
          const rb = b.robots.allowed ? `<span class="ok">Permitido</span>` : `<span class="no">Bloqueado</span>`;
          const rbNote = `<small>${esc(b.robots.rule || b.robots.src)}</small>`;
          let lv;
          if (b.token) lv = `<small>No visita; es solo una regla</small>`;
          else if (b.live) lv = b.live.blocked
            ? `<span class="no">Bloqueado</span><small>${esc(b.live.note)}</small>`
            : `<span class="ok">Entra</span><small>${esc(b.live.note)}</small>`;
          else lv = `<small>No probado</small>`;
          h += `<tr>
            <td>${esc(b.name)}<small>${esc(b.company)}</small></td>
            <td>${TYPE[b.type]}<small>${esc(b.product || b.note)}</small></td>
            <td>${rb}${rbNote}</td>
            <td>${lv}</td></tr>`;
        }
        h += `</tbody></table></div>`;

        if (d.page) {
          const s = d.page.schema;
          h += `<h2>Datos estructurados</h2>`;
          if (!s.blocks && !s.microdata) h += `<p>Ninguno.</p>`;
          else {
            h += `<p>${plural(s.blocks, 'bloque', 'bloques')} JSON-LD${s.microdata ? ' y microdatos' : ''}. Tipos: ${esc(s.types.join(', ') || '—')}.</p>`;
            if (s.entities.length) {
              h += `<ul>` + s.entities.map((e) => `<li><strong>${esc(e.type)}</strong>${e.name ? ` "${esc(e.name)}"` : ''}` +
                `${e.sameAs ? ` · sameAs: ${e.sameAs.length}` : ''}` +
                `${e.questions != null ? ` · ${e.questions} preguntas` : ''}` +
                `${e.missing.length ? ` · falta: ${esc(e.missing.join(', '))}` : ' · completo'}</li>`).join('') + `</ul>`;
            }
          }
        }

        const sm = d.sitemap;
        h += `<h2>Sitemap y fechas</h2>`;
        h += sm.found
          ? `<p>${esc(sm.url)}${sm.children ? ` (índice con ${sm.children} sitemaps)` : ''}: ${sm.count} URLs, ${sm.withLastmod} con fecha${sm.newest ? `, la más reciente del ${fmtDate(sm.newest)}` : ''}.</p>`
          : `<p>No encontrado.</p>`;
        h += `<p>${d.freshness
          ? `Fecha más reciente encontrada: ${fmtDate(d.freshness.date)}, en ${esc(d.freshness.source)}.`
          : 'No hay ninguna fecha legible por máquinas.'}</p>`;

        if (d.samples.length) {
          h += `<h2>Páginas internas</h2>
            <p class="aeo-note">Tres URLs de tu sitemap, pedidas igual que la principal. Pulsa una para analizarla entera.</p>
            <div class="aeo-scroll"><table><thead><tr><th>Página</th><th>Estado</th><th>Palabras</th><th>Notas</th></tr></thead><tbody>`;
          for (const s of d.samples) {
            const notes = [];
            if (s.redirected) notes.push('redirige');
            if (s.noindex) notes.push('noindex');
            if (s.blockedFor.length) notes.push('bloqueada para ' + s.blockedFor.join(', '));
            if (s.types.length) notes.push(s.types.join(', '));
            h += `<tr>
              <td><a href="?url=${encodeURIComponent(s.url)}">${esc(s.path)}</a>${s.title ? `<small>${esc(s.title)}</small>` : ''}</td>
              <td>${s.status === 200 ? '<span class="ok">200</span>' : `<span class="no">${esc(s.status || s.note)}</span>`}</td>
              <td>${s.words}</td>
              <td><small>${esc(notes.join(' · ') || '—')}</small></td></tr>`;
          }
          h += `</tbody></table></div>`;
        }

        h += `<h2>llms.txt</h2><p>${d.llms.found
          ? `Sí${d.llms.title ? `: "${esc(d.llms.title)}"` : ''}, ${plural(d.llms.sections, 'sección', 'secciones')}, ${plural(d.llms.links, 'enlace', 'enlaces')}.${d.llms.full ? ' También hay llms-full.txt.' : ''}`
          : d.llms.html ? 'La ruta devuelve una página HTML, no un llms.txt.' : 'No existe.'}</p>`;

        h += `<p class="aeo-note aeo-how">Cómo se hizo: pedimos la página desde un servidor, una vez como navegador y otra como cada bot, y comparamos las respuestas. Los bots reales salen de sus propias IPs, así que un firewall que verifique IPs puede tratarlos distinto. Los resultados se guardan 15 minutos.</p>`;
        return h;
      }

      async function run(url) {
        btn.disabled = true;
        out.innerHTML = '';
        status.textContent = 'Analizando… suele tardar entre 5 y 20 segundos.';
        try {
          const r = await fetch('/api/check-crawlers?url=' + encodeURIComponent(url));
          const d = await r.json();
          if (!r.ok) { status.textContent = d.error || 'Algo falló.'; return; }
          status.textContent = '';
          out.innerHTML = render(d);
        } catch {
          status.textContent = 'No pudimos terminar el análisis. Puede que el sitio tarde demasiado; prueba otra vez.';
        } finally {
          btn.disabled = false;
        }
      }

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = input.value.trim();
        if (!url) return;
        history.replaceState(null, '', '?url=' + encodeURIComponent(url));
        run(url);
      });

      const q = new URLSearchParams(location.search).get('url');
      if (q) { input.value = q; run(q); }
    </script>

    <style is:global>
      #aeo form { display: flex; gap: 0.5em; margin: 1.5em 0 0.5em; }
      #aeo input {
        flex: 1; min-width: 0; font: inherit; color: inherit;
        padding: 0.55em 0.75em; border-radius: 6px; background: #fff;
        border: 1px solid rgb(var(--gray-light, 229, 233, 240));
      }
      #aeo input:focus { outline: 2px solid var(--accent, #2337ff); outline-offset: 1px; }
      #aeo button {
        font: inherit; padding: 0.55em 1.1em; border: 0; border-radius: 6px; cursor: pointer;
        background: rgb(var(--black, 15, 18, 25)); color: #fff;
      }
      #aeo button:disabled { opacity: 0.5; cursor: wait; }
      #aeo .aeo-status { min-height: 1.5em; color: rgb(var(--gray, 96, 115, 159)); }
      #aeo h2 { margin-top: 2.2em; margin-bottom: 0.5em; font-size: 1.4em; }
      #aeo .aeo-meta, #aeo .aeo-note { font-size: 0.85em; color: rgb(var(--gray, 96, 115, 159)); }
      #aeo .aeo-sum { font-size: 1.15em; margin-top: 0.2em; }
      #aeo small { display: block; font-size: 0.82em; color: rgb(var(--gray, 96, 115, 159)); }

      #aeo .aeo-findings { list-style: none; padding: 0; margin: 0; }
      #aeo .aeo-findings li {
        margin: 0 0 1.5em; padding: 0.1em 0 0.1em 1em;
        border-left: 3px solid rgb(var(--gray-light, 229, 233, 240));
      }
      #aeo .aeo-findings li.lvl-alto { border-left-color: #c4321c; }
      #aeo .aeo-findings li.lvl-medio { border-left-color: #c27a00; }
      #aeo .aeo-findings li.lvl-info { border-left-color: var(--accent, #2337ff); }
      #aeo .aeo-lvl {
        display: block; font-size: 0.72em; letter-spacing: 0.06em; text-transform: uppercase;
        color: rgb(var(--gray, 96, 115, 159));
      }
      #aeo .aeo-findings p { margin: 0.35em 0 0; }
      #aeo .aeo-fix { color: rgb(var(--gray-dark, 34, 41, 57)); font-style: italic; }
      #aeo .aeo-good li { margin-bottom: 0.4em; }

      #aeo blockquote {
        margin: 1em 0; padding: 0.8em 1em; font-size: 0.95em;
        border-left: 3px solid rgb(var(--gray-light, 229, 233, 240));
        background: rgba(var(--gray-light, 229, 233, 240), 0.35);
      }
      #aeo .aeo-dl { display: grid; grid-template-columns: 7.5em 1fr; gap: 0.35em 1em; font-size: 0.92em; }
      #aeo .aeo-dl dt { font-weight: 700; }
      #aeo .aeo-dl dd { margin: 0; overflow-wrap: anywhere; }
      #aeo details { margin-top: 1em; }
      #aeo summary { cursor: pointer; }
      #aeo .aeo-outline { list-style: none; padding: 0; font-size: 0.9em; }
      #aeo .aeo-outline span { color: rgb(var(--gray, 96, 115, 159)); font-size: 0.8em; }

      #aeo .aeo-scroll { overflow-x: auto; }
      #aeo table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
      #aeo th, #aeo td {
        text-align: left; vertical-align: top; padding: 0.55em 0.8em 0.55em 0;
        border-bottom: 1px solid rgb(var(--gray-light, 229, 233, 240));
      }
      #aeo th { font-size: 0.8em; color: rgb(var(--gray, 96, 115, 159)); font-weight: 400; }
      #aeo .ok { color: #1a7f37; }
      #aeo .no { color: #c4321c; font-weight: 700; }
      #aeo .aeo-how { margin-top: 3em; }

      @media (max-width: 560px) {
        #aeo form { flex-direction: column; }
        #aeo .aeo-dl { grid-template-columns: 1fr; }
      }
    </style>
  </body>
</html>
