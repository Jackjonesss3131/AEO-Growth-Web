# Auditoría en lote (`batch-audit.js`)

Corre las dos herramientas del sitio —**Crawler Check** y **Positioning Check**— sobre una lista de dominios y guarda los resultados en CSV (para leer y filtrar) y JSON (completo, para escribir outreach).

**La lógica no está duplicada.** El script importa las comprobaciones de `src/lib/crawler-check.ts` y `src/lib/positioning-check.ts`, los mismos módulos que usan las rutas `/api/check-crawlers` y `/api/positioning` del sitio. Si cambias la lógica ahí, cambia en los dos sitios a la vez.

## Instalación

- **Node 22.18 o superior** (o 23.6+). Node ejecuta directamente los módulos `.ts` del sitio, sin compilar nada.
  - Con Node 22.12–22.17: `node --experimental-strip-types scripts/batch-audit.js ...`
- No hace falta `npm install`: el script solo usa módulos que vienen con Node.

```bash
git clone https://github.com/Jackjonesss3131/AEO-Growth-Web.git
cd AEO-Growth-Web
node -v   # v22.18+ 
```

## Uso

```bash
node scripts/batch-audit.js --input domains.csv --output results
node scripts/batch-audit.js --input domains.csv --output results --resume
```

`npm run audit -- --input domains.csv --output results` hace lo mismo.

### Entrada

CSV con una columna `domain` y, opcional, `company_name`:

```csv
domain,company_name
stripe.com,Stripe
https://www.notion.so/,Notion
www.hubspot.com,HubSpot
```

Se aceptan dominios con o sin `https://`, con o sin `www`, y con rutas (`https://x.com/pricing`): todo se normaliza a `x.com`. Las filas repetidas tras normalizar se procesan una sola vez, y las que no parecen un dominio se saltan y se avisan al empezar.

### Opciones

| Opción | Qué hace |
|---|---|
| `--input FILE` | CSV de entrada (obligatorio) |
| `--output PREFIX` | Prefijo de los archivos de salida. Por defecto `results` |
| `--resume` | Continúa una corrida anterior y salta los dominios ya hechos |
| `--retry-failed` | Con `--resume`, vuelve a correr también los que terminaron en `error` o `partial` |
| `--force` | Empieza de cero. La salida anterior **no se borra**: se mueve a `PREFIX.backup-<fecha>.*` |
| `--concurrency N` | Dominios a la vez. Por defecto 3 |
| `--timeout SEG` | Límite por dominio y por intento. Por defecto 60 |
| `--include-answers` | Capa 4 (qué responde la IA). **Aún no implementada**: el script se detiene con un aviso |

Si ya existe una salida y no pasas `--resume` ni `--force`, el script se niega a continuar, para que nunca sobrescribas una corrida por accidente.

## Salida

| Archivo | Para qué |
|---|---|
| `results.csv` | Una fila por dominio, para leer y filtrar |
| `results.json` | Lo mismo, completo: los dos informes íntegros de cada dominio |
| `results.jsonl` | Registro interno: una línea por dominio terminado. Es lo que usa `--resume`. No lo edites |
| `results.errors.log` | Una línea JSON por cada petición que falló o se reintentó, con la URL, el estado y el error |

`results.csv` y `results.json` se reescriben **después de cada dominio**: si la corrida se corta, lo hecho está guardado.

### Columnas de `results.csv`

| Columna | Valores |
|---|---|
| `domain`, `company_name` | Dominio normalizado y nombre de la entrada |
| `crawler_status` | `ok` · `blocked` (robots.txt o el servidor bloquean a un bot que cita fuentes) · `js_dependent` (el contenido lo pinta JavaScript) · `empty` (menos de 50 palabras en el HTML) · `error` |
| `crawler_detail` | Qué bot falla y cómo. Incluye bots de entrenamiento bloqueados y si la página es `noindex` |
| `current_description` | Cómo se describe la home hoy (meta description, o el título) |
| `historical_descriptions` | Versiones encontradas en Internet Archive, `fecha: título — descripción`, separadas por ` \| `. `(same as today)` marca desde cuándo está la versión actual |
| `latest_crawl_date` | Fecha del rastreo más reciente de Common Crawl encontrado |
| `crawl_matches_current` | `yes` · `no` · `cant_tell` — si ese rastreo capturó la versión actual de la home |
| `mismatch_severity` | `none` · `minor` · `major` · `cant_tell` |
| `error` | Vacío si todo fue bien. `incomplete: ...` si una fuente no respondió |

En `results.json`, cada dominio tiene además `status` (`ok` / `partial` / `error`), `attempts`, `duration_ms` y los informes completos en `crawler` y `positioning`, con el texto íntegro de cada versión archivada (título, meta description, og:description, H1 y descripción del schema).

### Cómo se deciden las columnas (decisiones conservadoras)

- **`crawl_matches_current`** usa la misma regla que la herramienta del sitio. Un rastreo solo cuenta como versión actual o antigua si las capturas del archivo **antes y después** de él muestran esa versión; si no, es `cant_tell`. Sin datos de Common Crawl también es `cant_tell`, nunca `no`.
- **`mismatch_severity`**:
  - `none` si el último rastreo capturó la versión actual.
  - `major` si capturó una versión con **otro título** o un texto casi totalmente reescrito.
  - `minor` si capturó una versión con el mismo título y cambios parciales.
  - `cant_tell` si no se puede saber.
- **"El servidor bloquea a un bot"** significa que la web rechaza las peticiones que **usan el user agent** de ese bot. Las webs que verifican los bots por IP (Notion, por ejemplo) pueden dejar pasar al bot real. Está indicado en `crawler_detail`; tenlo en cuenta antes de citarlo en un email.

## Robustez

- **Reanudable:** cada dominio se guarda en cuanto termina. Si se cae en el 60, `--resume` sigue en el 61.
- **Un dominio que falla no detiene la corrida:** el error queda en su fila y se sigue con el siguiente.
- **Reintentos con espera exponencial** (1 s, 2 s, … respetando `Retry-After`) en 429, 503, timeouts y errores de red, con un máximo de 3 intentos por petición. No se reintentan los errores permanentes (dominio que no existe, certificado inválido).
- **Si un dominio entero se pasa de tiempo** o una comprobación falla de forma inesperada, se reintenta el dominio completo, hasta 3 veces.
- **Límite por servidor:** Common Crawl (2 a la vez), Wayback (6) y Wikidata (2). El tiempo de espera en la cola no cuenta como tiempo de la petición, pero nunca pasa del límite de la comprobación.
- **Ctrl+C** guarda lo hecho y dice cómo continuar.

## Common Crawl: limitación conocida

El índice de Common Crawl (`index.commoncrawl.org`) se satura con frecuencia: responde 503 "slow down", tarda más de 20 s o ni acepta la conexión. En las pruebas respondió para entre 1 y 3 de 5 dominios según la corrida.

Cuando no responde, la fila queda como `partial` con `incomplete: Common Crawl did not respond` y `crawl_matches_current = cant_tell`: falta el dato, pero no hay ningún dato falso. Para completarlas más tarde, cuando el servicio esté más tranquilo:

```bash
node scripts/batch-audit.js --input domains.csv --output results --resume --retry-failed
```

Más margen por dominio (`--timeout 90`) también ayuda, a cambio de una corrida más larga.

## Tiempos

En la prueba real (5 SaaS conocidos, concurrencia 3, timeout 60 s) cada dominio tardó unos **45 s** y la corrida, **1 min 30 s**. Para 100 dominios, **unos 25 minutos** por pasada. Una segunda pasada con `--retry-failed` solo repite los incompletos.

## Capa 4 (preparada, apagada)

`scripts/lib/answers.js` es el punto de extensión para "qué responde ChatGPT sobre esta empresa". Para activarla:

1. Implementa `run()` (recibe dominio, nombre, los dos informes y un `fetch` con reintentos y registro de errores; las API keys se leen de `process.env`) y `summarize()`.
2. Pon `implemented: true`.

Con `--include-answers` aparecerá la columna `ai_answers` en el CSV y el resultado completo en `answers` del JSON. No hay que tocar `batch-audit.js`.

## Privacidad

El repositorio es **público**. `.gitignore` ya excluye `results*`, `*.errors.log` y `domains*.csv`. No subas tus listas ni tus resultados, y no les cambies el nombre a algo que no esté en esa lista.

## Archivos

```
scripts/
  batch-audit.js      CLI: entrada, cola, reanudación, salida, progreso
  lib/csv.js          lector/escritor CSV sin dependencias
  lib/http.js         fetch con colas por servidor, reintentos y registro de errores
  lib/summarize.js    de los informes completos a las columnas del CSV (no repite ninguna comprobación)
  lib/answers.js      capa 4 (sin implementar)
src/lib/
  crawler-check.ts      lógica del Crawler Check (sitio + script)
  positioning-check.ts  lógica del Positioning Check (sitio + script)
```
