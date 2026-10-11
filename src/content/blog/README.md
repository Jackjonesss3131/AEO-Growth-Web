# Blog

Cada carpeta es una categoría del blog. Para publicar, entra en la carpeta de la categoría y crea ahí el archivo; dentro de cada una hay instrucciones y una plantilla.

| Carpeta | Sección en /blog | Qué va ahí |
|---|---|---|
| [`basics/`](basics/) | AEO basics | Qué es AEO, en qué se diferencia de SEO y GEO, y cómo deciden los motores de IA a qué empresas nombrar. |
| [`getting-recommended/`](getting-recommended/) | Getting cited and recommended | El trabajo en sí: qué arreglar primero, qué publicar y qué fuentes mueven la respuesta. |
| [`measurement/`](measurement/) | Measuring it | Auditorías, herramientas de visibilidad, tráfico de IA en GA4 y cuánto tarda todo en notarse. |
| [`hiring/`](hiring/) | Hiring help | Agencia, especialista o equipo propio: precios reales, preguntas que hacer y señales de alarma. |
| [`by-category/`](by-category/) | By software category | Por qué la IA recomienda al competidor en mercados SaaS concretos, y qué arreglar primero. |

## Publicar un post

1. Entra en la carpeta de la categoría.
2. **Add file → Create new file**, nombre `mi-nuevo-post.md`.
3. Pega la plantilla y escribe:

```markdown
---
title: "El título del post"
description: "Una o dos frases, menos de 160 caracteres. Sale en Google y en /blog."
pubDate: 'Oct 20 2026'
---

Escribe aquí el post en Markdown.
```

4. **Commit changes** en `main`. Vercel lo publica en uno o dos minutos.

**Reglas rápidas**

- **El nombre del archivo es la URL.** `mi-nuevo-post.md` se publica en `aeogrowth.co/blog/mi-nuevo-post/`. Solo minúsculas, números y guiones, y termina en `.md`. No lo cambies después de publicar: la URL vieja daría 404.
- **No hace falta poner la categoría.** La carpeta donde guardas el archivo es la categoría.
- **Tus precios:** escribe `{AUDIT_PRICE}` y `{MONTHLY_PRICE}` en vez de las cifras. Se sustituyen solos por los valores de `src/consts.ts`.
- **Lo que haces gratis antes de una llamada es la *Shortlist Check*** (3–4 preguntas en un motor). No lo llames "la auditoría": esa es la de pago.
- **Imagen para compartir:** opcional. Si no pones `ogImage`, se usa la imagen general del sitio.
- **Cambiar un post de categoría:** muévelo de carpeta. La URL no cambia.

## Si algo falla

Si un post tiene un error (le falta `title`, `description` o `pubDate`, o está fuera de una carpeta de categoría), **el sitio no se publica** y la versión anterior sigue en línea. En Vercel verás el despliegue en rojo con el motivo. Corrige el archivo y vuelve a hacer commit.

## Crear una categoría nueva

1. Añádela a `BLOG_CATEGORIES` en `src/consts.ts` (slug, nombre y descripción).
2. Crea una carpeta con el mismo slug aquí dentro y pon los posts en ella.
