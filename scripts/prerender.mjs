import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { createServer } from 'vite';

process.env.NODE_ENV = 'production';

const siteUrl = 'https://shopitrack.com';
const template = await readFile('dist/index.html', 'utf8');
const require = createRequire(import.meta.url);
const routerDomPath = dirname(require.resolve('react-router-dom/package.json'));
const routerPath = dirname(require.resolve('react-router/package.json'));
const server = await createServer({
  mode: 'production',
  server: { middlewareMode: true },
  appType: 'custom',
  resolve: {
    alias: [
      { find: /^react-router-dom$/, replacement: join(routerDomPath, 'dist/index.mjs') },
      { find: /^react-router$/, replacement: join(routerPath, 'dist/development/index.mjs') },
    ],
  },
  ssr: { noExternal: ['react-router-dom', 'react-router'] },
});

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function replaceOnce(html, pattern, replacement) {
  const matches = html.match(new RegExp(pattern.source, 'g'));
  if (matches?.length !== 1) {
    throw new Error(`Expected exactly one match for ${pattern}; found ${matches?.length ?? 0}`);
  }
  return html.replace(pattern, () => replacement);
}

function pageHead(html, { path, title, description }, noIndex = false) {
  const url = escapeHtml(`${siteUrl}${path}`);
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const replacements = [
    [/<title>[^<]*<\/title>/, `<title>${safeTitle}</title>`],
    [/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${safeDescription}" />`],
    [/<meta name="robots" content="[^"]*" \/>/, `<meta name="robots" content="${noIndex ? 'noindex, follow' : 'index, follow'}" />`],
    [/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`],
    [/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`],
    [/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${safeTitle}" />`],
    [/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${safeDescription}" />`],
    [/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${safeTitle}" />`],
    [/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${safeDescription}" />`],
  ];

  return replacements.reduce((result, [pattern, replacement]) => replaceOnce(result, pattern, replacement), html);
}

try {
  const [{ renderPage }, { seoConfig }] = await Promise.all([
    server.ssrLoadModule('/src/entry-prerender.tsx'),
    server.ssrLoadModule('/src/data/seo.ts'),
  ]);
  const entries = Object.entries(seoConfig).filter(([key]) => key !== 'notFound');

  for (const [, entry] of entries) {
    if (entry.title.length < 30 || entry.title.length > 60 || entry.description.length > 160) {
      throw new Error(`SEO metadata length out of range for ${entry.path}`);
    }
    const markup = renderPage(entry.path);
    const html = replaceOnce(pageHead(template, entry), /<div id="root"><\/div>/, `<div id="root">${markup}</div>`);
    const output = entry.path === '/' ? 'dist/index.html' : `dist${entry.path}.html`;
    await writeFile(output, html);
    console.log(`Prerendered ${entry.path} -> ${output}`);
  }

  await writeFile('dist/spa.html', pageHead(template, seoConfig.notFound, true));
} finally {
  await server.close();
}
