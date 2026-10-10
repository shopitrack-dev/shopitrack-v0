# Analytics y pixels

Toda la integración vive en `src/analytics/`. Ninguna página ni componente importa un proveedor directamente.

| Archivo | Rol |
| --- | --- |
| `config.ts` | Qué servicios están activos y con qué ID (lee las variables `VITE_*`) |
| `index.ts` | API interna: `initAnalytics()`, `trackPageView(path)`, `trackEvent(name, props)` y la lista de proveedores |
| `linkedin.ts`, `gtm.ts`, `ga4.ts` | Un proveedor por servicio |
| `loadScript.ts` | Inserta cada script externo una sola vez, con `async` |
| `usePageViews.ts` | Hook usado en `MainLayout`: un page view por cambio de ruta |
| `VercelAnalytics.tsx` | Vercel Web Analytics (`@vercel/analytics/react`), montado una vez en `src/main.tsx` |
| `VercelSpeedInsights.tsx` | Vercel Speed Insights (`@vercel/speed-insights/react`), montado una vez en `src/main.tsx`; solo en builds de producción |

`initAnalytics()` se llama una vez en `src/main.tsx`, fuera de React (StrictMode no lo duplica). Los page views se filtran por ruta, así que re-renders o el doble montaje de StrictMode no los repiten.

## Activar o desactivar

Un servicio se activa solo si su variable tiene valor. Sin valor no carga ningún script ni produce errores.

| Variable | Servicio | Estado |
| --- | --- | --- |
| `VITE_LINKEDIN_PARTNER_ID` | LinkedIn Insight Tag | Activo en producción con `10081756` |
| `VITE_GTM_ID` | Google Tag Manager (`GTM-XXXXXXX`) | Preparado, inactivo |
| `VITE_GA4_MEASUREMENT_ID` | Google Analytics 4 (`G-XXXXXXXXXX`) | Preparado, inactivo |

Se configuran en Vercel → Settings → Environment Variables (solo **Production** para no medir previews) y requieren un nuevo deploy, porque Vite las incrusta en el build. Para probar en local, crear `.env.local` (ignorado por git) a partir de `.env.example`.

Son IDs públicos: terminan en el bundle del navegador. **Nunca pongas secretos (API keys, tokens) en variables `VITE_*`.**

## LinkedIn

El Insight Tag solo registra la primera carga. Para la SPA se activa `window._wait_for_lintrk` y cada ruta, incluida la inicial, se envía con `lintrk("track")`. No se incluye el pixel `<noscript>`: sin JavaScript la SPA no muestra contenido y el pixel no podría respetar la variable de entorno.

## GTM y GA4

- **GTM:** al definir `VITE_GTM_ID` se carga el contenedor y cada ruta se envía al `dataLayer` como `{ event: "page_view", page_path }`. En GTM, usar un trigger *Custom Event* `page_view`.
- **GA4:** al definir `VITE_GA4_MEASUREMENT_ID` se carga `gtag.js` con `send_page_view: false` y la SPA envía `page_view` en cada ruta.
- Si GA4 se configura **dentro** de GTM, no definas también `VITE_GA4_MEASUREMENT_ID`: se contaría doble.

## Vercel Web Analytics

- `<VercelAnalytics />` se monta una sola vez en `src/main.tsx`, junto a `<App />`. No usa variable de entorno: se activa desde el dashboard de Vercel.
- Su script sigue las navegaciones de React Router mediante la History API y registra cada ruta, incluida la 404. Por eso **no** se conecta a `usePageViews`: se contaría doble.
- Solo registra la URL de cada página. No se envían eventos personalizados ni datos del formulario.
- En `npm run dev` carga el script de depuración de Vercel, que escribe `[Vercel Web Analytics] [view] …` en la consola y no envía datos. En producción carga `/_vercel/insights/script.js`.
- **Activar:** Vercel → proyecto → Analytics → Enable y después redesplegar. Si se despliega antes de activarlo, `script.js` responde 404 hasta el siguiente deploy.

## Vercel Speed Insights

- `<VercelSpeedInsights />` se monta una sola vez en `src/main.tsx`, junto a Web Analytics e independiente de él. Mide Core Web Vitals de visitas reales (LCP, CLS, INP, FCP, TTFB) y no envía datos del formulario.
- A diferencia de Analytics, el componente no acepta `mode` y detecta el entorno con `process.env`, que Vite no define en el navegador. Por eso solo se renderiza en builds de producción (`import.meta.env.PROD`): en `npm run dev` no carga nada. En producción carga `/_vercel/speed-insights/script.js`.
- **Activar:** Vercel → proyecto → Speed Insights → Enable y después redesplegar. Los datos aparecen a medida que llegan visitas reales.

## Agregar otro servicio (Meta Pixel, TikTok…)

1. Crear `src/analytics/<servicio>.ts` que devuelva un `AnalyticsProvider` (`init`, `pageView` y opcionalmente `track`), usando `loadScript` para el script externo.
2. Agregar su variable en `config.ts`, `src/vite-env.d.ts` y `.env.example`.
3. Agregarlo a la lista `providers` en `index.ts` con la misma condición (solo si hay ID).

Las páginas no cambian.

## Eventos

`trackEvent("nombre", { ... })` reparte el evento a los servicios activos que implementan `track`. Todavía no se envía ningún evento personalizado.

## Consentimiento

El sitio no tiene un gestor de consentimiento (CMP) y los servicios activos cargan al abrir la página. Si se requiere consentimiento previo, basta con mover la llamada a `initAnalytics()` al momento en que el usuario acepte; el resto de la arquitectura no cambia. El Aviso de privacidad (`/aviso-de-privacidad`) y la Política de cookies (`/cookies`), en `src/data/legal.ts`, describen LinkedIn Insight Tag como activo y GTM, GA4 y Meta Pixel como posibles. Al activar o agregar un servicio, actualizar ambos textos.
