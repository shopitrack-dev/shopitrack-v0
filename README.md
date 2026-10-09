# Shopitrack

Shopitrack es una plataforma que coordina a empresas de entrega y a sus clientes para que cada entrega a domicilio se realice en el momento acordado, reduciendo entregas fallidas, reprogramaciones y costos operativos en la última milla.

Este repositorio contiene el sitio web corporativo de Shopitrack: una SPA (Single Page Application) desarrollada específicamente para el proyecto.

## Funcionalidades principales

- Sitio corporativo con páginas para empresas, clientes finales, sectores atendidos y contacto.
- Formulario de contacto con validación en navegador y servidor, Cloudflare Turnstile y honeypot. Cada solicitud se guarda en Airtable y se notifica por correo con Resend mediante la función serverless `api/leads.ts` (ver [docs/CONTACT-FORM.md](./docs/CONTACT-FORM.md)).
- Páginas legales: aviso de privacidad, política de cookies y términos y condiciones.
- SEO por página (title, description, canonical, Open Graph) desde `src/data/seo.ts`, más `sitemap.xml` y `robots.txt`.
- Analytics centralizados en `src/analytics/` (LinkedIn Insight Tag, Google Tag Manager y Google Analytics 4); cada servicio se activa solo si su ID está configurado.
- Animaciones Lottie, sliders de imágenes y secciones de preguntas frecuentes.
- Diseño responsive (mobile, tablet, desktop) dentro de un mismo design system.
- Manejo de errores por sección con `ErrorBoundary`.

## Páginas

| Ruta | Página |
| ------ | -------- |
| `/` | Home |
| `/empresas` | Empresas |
| `/clientes` | Clientes |
| `/sectores` | Sectores |
| `/contacto` | Contacto |
| `/aviso-de-privacidad` | Aviso de privacidad |
| `/cookies` | Política de cookies |
| `/terminos-y-condiciones` | Términos y condiciones |
| `*` | 404 (NotFound) |

## Tecnologías utilizadas

- React 18 + TypeScript
- Vite 5
- React Router 7 (`react-router-dom`)
- Tailwind CSS v4 + daisyUI v5 (tema `shopitrack`)
- SCSS (Sass) para el design system y los overrides por página
- lucide-react para iconografía
- lottie-web para animaciones
- ESLint + typescript-eslint para calidad de código
- Vercel para despliegue y hosting

El detalle de cada dependencia, su función y su licencia está en [Tecnologías, dependencias y licencias](#tecnologías-dependencias-y-licencias).

## Arquitectura y estructura

```text
src/
├── analytics/     Pixels y analytics (LinkedIn, GTM, GA4); configuración única en config.ts
├── components/    Componentes reutilizables (incluye components/layout/ con Header, Footer, MainLayout)
├── pages/         Una página por ruta
├── data/          Contenido y copys separados de la UI
├── styles/        Design system en partials SCSS (tokens, base, layout, typography, buttons, hero, cards, sections, responsive, animations) + custom.scss (overrides por página)
├── App.tsx        Rutas (react-router-dom)
├── index.css      Configuración de Tailwind CSS v4 + tema daisyUI
└── main.tsx       Entry point
public/            Favicons, imágenes propias (WebP), animaciones Lottie, sitemap.xml y robots.txt
docs/              Documentación técnica detallada
```

Todas las rutas comparten `MainLayout` (Header y Footer). El alias `@/` apunta a `src/`.

### Estilos personalizados por página

Cada página renderiza un wrapper propio para evitar colisiones de estilos:

- Home: `#page-home.page.page-home`
- Empresas: `#page-empresas.page.page-empresas`
- Clientes: `#page-clientes.page.page-clientes`
- Sectores: `#page-sectores.page.page-sectores`
- Contacto: `#page-contacto.page.page-contacto`
- NotFound: `#page-not-found.page.page-not-found`

Usa `src/styles/custom.scss` para personalizaciones y scopea reglas así:

```scss
.page-home .hero {
  /* solo afecta al hero del Home */
}
```

## Instalación y configuración local

Requisitos: Node.js y npm.

```bash
npm install
cp .env.example .env   # opcional: solo si vas a probar analytics
npm run dev
```

## Comandos disponibles

```bash
npm run dev         # servidor de desarrollo
npm run build       # build de producción (dist/)
npm run preview     # preview del build
npm run typecheck   # verificación de tipos
npm run lint        # eslint
npm test            # pruebas del formulario de contacto (validación y endpoint simulado; Node >= 22.15)
```

## Variables de entorno

Definidas en `.env.example`. Son IDs públicos de analytics, no secretos; si una variable está vacía, ese servicio no se carga.

| Variable | Servicio |
| ---------- | ---------- |
| `VITE_LINKEDIN_PARTNER_ID` | LinkedIn Insight Tag |
| `VITE_GTM_ID` | Google Tag Manager |
| `VITE_GA4_MEASUREMENT_ID` | Google Analytics 4 |

En producción se configuran en Vercel → Settings → Environment Variables. Las variables `VITE_*` terminan en el bundle público: nunca guardes secretos en ellas. Detalle en [docs/ANALYTICS.md](./docs/ANALYTICS.md).

El formulario de contacto usa además variables de Turnstile, Airtable y Resend (públicas y solo de servidor); ver [docs/CONTACT-FORM.md](./docs/CONTACT-FORM.md).

## Build y despliegue

El proyecto está preparado para Vercel (SPA con React Router + fallback a `index.html`). Configuración en `vercel.json`:

- `framework: vite`, `buildCommand: npm run build`, `outputDirectory: dist`
- `rewrites` de rutas sin extensión a `index.html` (soporte para `/empresas`, `/clientes`, etc.)
- Cache inmutable de un año para `/assets/*`

### Opción 1: Conectar repositorio (recomendada)

1. Entra a Vercel y selecciona **Add New Project**.
2. Importa este repositorio.
3. Verifica configuración:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Haz clic en **Deploy**.

Con esto, cada `git push` genera un **Preview Deployment** con URL única para compartir avances con el cliente.

### Opción 2: Deploy por CLI

```bash
npm i -g vercel
vercel
vercel --prod
```

Para revisión continua con el cliente, conviene usar preview URLs por rama y dejar `--prod` solo para hitos aprobados.

## Tecnologías, dependencias y licencias

Shopitrack es un proyecto desarrollado específicamente para su titular. Para construirlo se utilizan frameworks, bibliotecas, herramientas y recursos de terceros, y cada uno conserva sus propios términos de licencia y condiciones de uso.

El uso de React, Vite, TypeScript, Tailwind CSS, daisyUI, React Router, lucide-react y las demás herramientas listadas no implica que Shopitrack ni sus desarrolladores sean propietarios de dichas tecnologías. Sus nombres y marcas pertenecen a sus respectivos titulares.

El código fuente combina:

- **Elementos creados específicamente para Shopitrack**: componentes de `src/components/` y `src/pages/`, el design system de `src/styles/`, el contenido de `src/data/`, la integración de analytics de `src/analytics/` y la configuración del proyecto y del despliegue.
- **Dependencias y herramientas de terceros**: los paquetes listados abajo, instalados vía npm y regidos por sus propias licencias. Algunos componentes del proyecto se apoyan en ellos (por ejemplo, clases de daisyUI o íconos de lucide-react).
- **Plantilla base**: el proyecto se inició a partir de la plantilla React + TypeScript de Vite.

Las licencias indicadas se verificaron en los metadatos (`package.json`) de las versiones instaladas. Antes de redistribuir el proyecto o partes de él, consulta la licencia de cada dependencia.

### Dependencias de ejecución

| Paquete | Versión | Función en el proyecto | Sitio oficial | Licencia |
| --------- | --------- | ------------------------ | --------------- | ---------- |
| React / React DOM | 18.3 | Biblioteca de UI y renderizado | [react.dev](https://react.dev) | [MIT](https://github.com/facebook/react/blob/main/LICENSE) |
| React Router (`react-router-dom`) | 7.18 | Enrutamiento del lado del cliente | [reactrouter.com](https://reactrouter.com) | [MIT](https://github.com/remix-run/react-router/blob/main/LICENSE.md) |
| lucide-react | 0.446 | Iconografía | [lucide.dev](https://lucide.dev) | [ISC](https://github.com/lucide-icons/lucide/blob/main/LICENSE) |
| lottie-web | 5.13 | Reproducción de animaciones Lottie (`LottiePlayer`) | [airbnb.io/lottie](https://airbnb.io/lottie/) | [MIT](https://github.com/airbnb/lottie-web/blob/master/LICENSE.md) |
| @supabase/supabase-js | 2.57 | Instalada; actualmente sin uso en el código | [supabase.com](https://supabase.com/docs/reference/javascript) | [MIT](https://github.com/supabase/supabase-js/blob/master/LICENSE) |

### Herramientas de desarrollo y build

| Paquete | Versión | Función en el proyecto | Sitio oficial | Licencia |
| --------- | --------- | ------------------------ | --------------- | ---------- |
| Vite | 5.4 | Servidor de desarrollo y bundler | [vite.dev](https://vite.dev) | [MIT](https://github.com/vitejs/vite/blob/main/LICENSE) |
| @vitejs/plugin-react | 4.3 | Soporte de React en Vite | [GitHub](https://github.com/vitejs/vite-plugin-react) | [MIT](https://github.com/vitejs/vite-plugin-react/blob/main/LICENSE) |
| TypeScript | 5.6 | Tipado estático | [typescriptlang.org](https://www.typescriptlang.org) | [Apache-2.0](https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt) |
| Tailwind CSS + @tailwindcss/vite | 4.3 | Framework de utilidades CSS | [tailwindcss.com](https://tailwindcss.com) | [MIT](https://github.com/tailwindlabs/tailwindcss/blob/main/LICENSE) |
| daisyUI | 5.7 | Componentes y tema sobre Tailwind CSS | [daisyui.com](https://daisyui.com) | [MIT](https://github.com/saadeghi/daisyui/blob/master/LICENSE) |
| Sass | 1.104 | Compilación de los estilos SCSS | [sass-lang.com](https://sass-lang.com) | [MIT](https://github.com/sass/dart-sass/blob/main/LICENSE) |
| ESLint + typescript-eslint | 9.12 / 8.8 | Linting | [eslint.org](https://eslint.org) / [typescript-eslint.io](https://typescript-eslint.io) | [MIT](https://github.com/eslint/eslint/blob/main/LICENSE) / [MIT](https://github.com/typescript-eslint/typescript-eslint/blob/main/LICENSE) |

La lista completa, con dependencias transitivas, está en `package-lock.json`.

### Recursos y servicios externos

| Recurso | Uso | Licencia / términos |
| --------- | ----- | --------------------- |
| [Inter](https://rsms.me/inter/) (vía Google Fonts) | Tipografía del sitio | [SIL Open Font License 1.1](https://github.com/rsms/inter/blob/master/LICENSE.txt) |
| [Pexels](https://www.pexels.com) | Fotografías referenciadas por URL (detalle en [docs/IMAGES.md](./docs/IMAGES.md)) | [Licencia de Pexels](https://www.pexels.com/license/) |
| [Vercel](https://vercel.com) | Hosting y despliegue | [Términos de servicio](https://vercel.com/legal/terms) |
| LinkedIn Insight Tag, Google Tag Manager, Google Analytics 4 | Analytics, activos solo si su ID está configurado | Términos de cada proveedor |

## Desarrollo y créditos

- **Desarrollador:** Gilberto Alonso Caballero Trujano
- **Rol:** Desarrollador Frontend y responsable de la implementación técnica del sitio web de Shopitrack.
- **GitHub:** [github.com/alonsoct00](https://github.com/alonsoct00/)

Participación en el proyecto:

- Implementación frontend de las páginas y su adaptación responsive.
- Arquitectura de la aplicación: rutas, layout compartido, separación de contenido (`src/data/`) y UI.
- Desarrollo de componentes reutilizables y del design system en SCSS.
- Integración de tecnologías: Tailwind CSS, daisyUI, React Router, Lottie, analytics y SEO.
- Configuración del build y del despliegue en Vercel.

Estos créditos identifican la participación en el desarrollo. Por sí solos no constituyen una reserva de derechos ni modifican los acuerdos de propiedad intelectual aplicables entre el cliente y el desarrollador.

## Contacto

**Correo electrónico:** [contacto@shopitrack.com](mailto:contacto@shopitrack.com)

## Documentación

Este README cubre lo básico. La documentación técnica detallada (design system, componentes, responsive, imágenes, SEO, analytics, arquitectura) está en [docs/](./docs/README.md).

Antes de modificar el proyecto, cualquier agente de IA debe leer [AGENTS.md](./AGENTS.md).
