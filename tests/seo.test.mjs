import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const paths = [
  '/',
  '/empresas',
  '/clientes',
  '/sectores',
  '/contacto',
  '/aviso-de-privacidad',
  '/cookies',
  '/terminos-y-condiciones',
];

test('el HTML de cada ruta incluye SEO y encabezados propios sin JavaScript', async () => {
  const titles = new Set();
  const descriptions = new Set();

  for (const path of paths) {
    const html = await readFile(path === '/' ? 'dist/index.html' : `dist${path}.html`, 'utf8');
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]+)" \/>/)?.[1];
    assert.ok(title, `Falta title en ${path}`);
    assert.ok(description, `Falta description en ${path}`);
    assert.ok(title.length >= 30 && title.length <= 60, `Longitud de title en ${path}: ${title.length}`);
    assert.ok(description.length <= 160, `Longitud de description en ${path}: ${description.length}`);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://shopitrack\\.com${path}" />`));
    assert.ok(html.includes(`<meta property="og:url" content="https://shopitrack.com${path}" />`));
    assert.match(html, /<meta name="robots" content="index, follow" \/>/);
    assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1, `Cantidad de H1 en ${path}`);
    assert.ok((html.match(/<h2(?:\s|>)/g) ?? []).length > 0, `Falta H2 en ${path}`);
    assert.ok(html.includes(`<meta property="og:title" content="${title}" />`));
    assert.ok(html.includes(`<meta property="og:description" content="${description}" />`));
    assert.ok(html.includes(`<meta name="twitter:title" content="${title}" />`));
    assert.ok(html.includes(`<meta name="twitter:description" content="${description}" />`));
    titles.add(title);
    descriptions.add(description);
  }

  assert.equal(titles.size, paths.length);
  assert.equal(descriptions.size, paths.length);
});

test('el sitemap y los rewrites cubren las rutas prerenderizadas', async () => {
  const sitemap = await readFile('public/sitemap.xml', 'utf8');
  const sitemapPaths = [...sitemap.matchAll(/<loc>https:\/\/shopitrack\.com([^<]*)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(new Set(sitemapPaths), new Set(paths));

  const { rewrites } = JSON.parse(await readFile('vercel.json', 'utf8'));
  const routeRewrite = rewrites.find((rewrite) => rewrite.destination === '/:page.html');
  assert.ok(routeRewrite);
  const routePattern = /^\/:page\(([^)]+)\)$/.exec(routeRewrite.source);
  assert.ok(routePattern);
  assert.deepEqual(new Set(routePattern[1].split('|').map((path) => `/${path}`)), new Set(paths.slice(1)));
  assert.equal(rewrites.at(-1).destination, '/spa.html');
});

test('las imágenes de Home incluyen texto alternativo y las imágenes de confianza son descriptivas', async () => {
  const html = await readFile('dist/index.html', 'utf8');
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  assert.ok(images.length > 0, 'No se encontraron imágenes en Home');

  for (const image of images) {
    assert.match(image, /(?:^|\s)alt="[^"]*"/, `Imagen sin atributo alt: ${image}`);
  }

  for (const src of ['/images/confianza1.webp', '/images/confianza2.webp']) {
    const image = images.find((element) => element.includes(`src="${src}"`));
    assert.ok(image, `No se encontró la imagen ${src}`);
    assert.match(image, /(?:^|\s)alt="[^"]*\S[^"]*"/, `Falta texto alternativo descriptivo para ${src}`);
  }
});

test('el fallback de rutas desconocidas no se presenta como Home indexable', async () => {
  const html = await readFile('dist/spa.html', 'utf8');
  assert.match(html, /<meta name="robots" content="noindex, follow" \/>/);
  assert.match(html, /<div id="root"><\/div>/);
});
