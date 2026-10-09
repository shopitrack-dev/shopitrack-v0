// Inserta un script externo asíncrono una sola vez: el `id` evita duplicados
// aunque init() se llame de nuevo (HMR, StrictMode, navegación).
export function loadScript(id: string, src: string): HTMLScriptElement {
  const existing = document.getElementById(id);
  if (existing instanceof HTMLScriptElement) return existing;
  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
  return script;
}
