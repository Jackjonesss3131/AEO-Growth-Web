// Envía URLs a IndexNow (Bing, Yandex, etc.) para que las rastreen de inmediato.
//
// Uso (después de que el deploy esté en producción):
//   npm run indexnow                       → envía todas las URLs del sitemap en producción
//   npm run indexnow -- /audit/ /services/ → envía solo esas rutas
//
// La clave vive en public/<KEY>.txt y se sirve en https://www.aeogrowth.co/<KEY>.txt

const HOST = 'www.aeogrowth.co';
const SITE = `https://${HOST}`;
const KEY = '806fe86e90fe4a7a97b9455fb59dfc31';
const KEY_LOCATION = `${SITE}/${KEY}.txt`;

async function sitemapUrls() {
	const index = await (await fetch(`${SITE}/sitemap-index.xml`)).text();
	const sitemaps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
	const urls = [];
	for (const sm of sitemaps) {
		const xml = await (await fetch(sm)).text();
		urls.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
	}
	return urls;
}

const args = process.argv.slice(2);
const urlList = args.length
	? args.map((p) => new URL(p, SITE).href)
	: await sitemapUrls();

if (!urlList.length) {
	console.error('No hay URLs para enviar.');
	process.exit(1);
}

// Comprobar que la clave está publicada antes de enviar (si no, IndexNow responde 403).
const keyRes = await fetch(KEY_LOCATION);
if (!keyRes.ok || (await keyRes.text()).trim() !== KEY) {
	console.error(`La clave no está publicada en ${KEY_LOCATION}. Espera a que termine el deploy.`);
	process.exit(1);
}

const res = await fetch('https://api.indexnow.org/IndexNow', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json; charset=utf-8' },
	body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
});

console.log(`IndexNow: HTTP ${res.status} — ${urlList.length} URLs enviadas`);
if (res.status !== 200 && res.status !== 202) {
	console.error(await res.text());
	process.exit(1);
}
