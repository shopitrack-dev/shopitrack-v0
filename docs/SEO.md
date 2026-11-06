# SEO

El proyecto está preparado para SEO con:

- **Title** y **meta description** en español, con overrides por ruta (ver "SEO por página" abajo)
- **Canonical URL** dinámica por ruta (`https://shopitrack.com/<ruta>`)
- **Meta robots** (`index, follow` por defecto; `noindex, follow` en la 404)
- **Open Graph** completo: `og:type`, `og:locale`, `og:site_name`, `og:url`, `og:title`, `og:description`, `og:image`, `og:image:alt`
- **Twitter Cards** completo: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- **Datos estructurados JSON-LD** (Schema.org `Organization`)
- **Favicon SVG** personalizado
- **`robots.txt`** y **`sitemap.xml`** (con `lastmod`) en `public/`
- **`<noscript>`** con contenido alternativo para buscadores sin JavaScript
- **`preconnect`** a `images.pexels.com` y a Google Fonts
- **HTML semántico**: `<header>`, `<main>`, `<section>`, `<footer>`, jerarquía H1-H3
- **Alt text** en todas las imágenes
- **`loading="lazy"`** en imágenes secundarias para mejorar LCP

## SEO por página

La aplicación es una SPA con prerenderizado estático durante `npm run build`. `scripts/prerender.mjs` renderiza las rutas de `seoConfig` con React y genera HTML con sus encabezados y metadatos reales, accesibles también sin JavaScript. Vercel entrega esos archivos mediante los rewrites de `vercel.json`; las rutas desconocidas usan `spa.html`, un fallback `noindex` que permite que React muestre la página 404.

Al navegar dentro de la SPA, cada página actualiza los metadatos mediante `<Seo />` (`src/components/Seo.tsx`), que sobrescribe `title`, `meta[description]`, `meta[robots]`, `link[canonical]`, `og:*` y `twitter:*`. El HTML prerenderizado se sustituye por el render del cliente al iniciar React.

El contenido de cada página (title/description) vive centralizado en `src/data/seo.ts` (`seoConfig`). Antes de crear una página nueva, agrega su entrada ahí, renderiza `<Seo {...seoConfig.miPagina} />`, incluye la ruta en el rewrite de `vercel.json`, en `public/sitemap.xml` y en `tests/seo.test.mjs`. Cada página debe tener un H1 y encabezados H2 relevantes. Los títulos deben tener entre 30 y 60 caracteres y las descripciones como máximo 160; el build valida estos límites.

Ejecuta `npm run build && npm run test:seo` para comprobar los metadatos, la jerarquía de encabezados, el sitemap y las rutas configuradas para Vercel.

La página `NotFound` pasa `noIndex` para que el catch-all (`path="*"`) no se indexe.

## Estrategia de keywords

Basada en el documento SEO del cliente:

- **Prioridad 1** (ya reflejadas en title/description por página y en el copy existente del Home): entregas fallidas, última milla, experiencia de entrega, cliente ausente, comunicación durante la entrega, ventanas de entrega, ETA, seguimiento de entregas para empresas, software para entregas, entregas e-commerce.
- **Prioridad 2** (uso más genérico, para cuando existan las páginas finales de Empresas/Clientes/Industrias con contenido propio): logística, e-commerce, software logístico, tracking, entregas a domicilio.

Al construir el contenido definitivo de las páginas pendientes (una vez lleguen los mockups de Figma), reutilizar estas keywords en H1/H2 y en los `title`/`description` de `seoConfig` en vez de solo en el placeholder.

## Rutas indexadas

Las rutas indexables de `src/App.tsx` deben reflejarse en `public/sitemap.xml`: `/`, `/empresas`, `/clientes`, `/sectores`, `/contacto`, `/aviso-de-privacidad`, `/cookies` y `/terminos-y-condiciones`. La 404 no se incluye.

## Qué no modificar sin justificación

Los meta tags SEO en `index.html` (title, description, canonical, Open Graph, Twitter Cards, JSON-LD) y las entradas de `src/data/seo.ts` no deben modificarse sin autorización.
