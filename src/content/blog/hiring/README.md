# Hiring help

Agencia, especialista o equipo propio: precios reales, preguntas que hacer y señales de alarma.

Todo archivo `.md` que guardes en esta carpeta aparece en la sección **Hiring help** de [aeogrowth.co/blog](https://www.aeogrowth.co/blog/#hiring).

## Publicar un post aquí (desde GitHub)

1. Dentro de esta carpeta, pulsa **Add file → Create new file**.
2. Ponle nombre al archivo, por ejemplo `mi-nuevo-post.md`.
3. Pega esta plantilla y escribe el post:

```markdown
---
title: "El título del post"
description: "Una o dos frases, menos de 160 caracteres. Sale en Google y en /blog."
pubDate: 'Oct 20 2026'
---

Escribe aquí el post en Markdown.
```

4. Pulsa **Commit changes** (en la rama `main`). Vercel lo publica solo en uno o dos minutos.

**Reglas rápidas**

- **El nombre del archivo es la URL.** `mi-nuevo-post.md` se publica en `aeogrowth.co/blog/mi-nuevo-post/`. Solo minúsculas, números y guiones, y termina en `.md`. No lo cambies después de publicar: la URL vieja daría 404.
- **No hace falta poner la categoría.** La carpeta donde guardas el archivo es la categoría.
- **Tus precios:** escribe `{AUDIT_PRICE}` y `{MONTHLY_PRICE}` en vez de las cifras. Se sustituyen solos por los valores de `src/consts.ts`.
- **Lo que haces gratis antes de una llamada es la *Shortlist Check*** (3–4 preguntas en un motor). No lo llames "la auditoría": esa es la de pago.
- **Imagen para compartir:** opcional. Si no pones `ogImage`, se usa la imagen general del sitio.
- **Cambiar un post de categoría:** muévelo de carpeta. La URL no cambia.
