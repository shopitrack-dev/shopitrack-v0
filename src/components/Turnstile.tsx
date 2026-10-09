import { useEffect, useRef } from "react";
import { loadScript } from "@/analytics/loadScript";

interface TurnstileApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const scriptSrc =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

// Tokens are single-use: remount the component (change its `key`) to get a new one.
// "interaction-only" keeps the widget hidden unless Cloudflare needs a challenge.
export function Turnstile({
  siteKey,
  action,
  onToken,
}: {
  siteKey: string;
  action: string;
  onToken: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!siteKey) return;
    const script = loadScript("cf-turnstile", scriptSrc);
    let widgetId: string | undefined;
    const render = () => {
      if (!containerRef.current || !window.turnstile || widgetId) return;
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action,
        appearance: "interaction-only",
        callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    };
    if (window.turnstile) render();
    else script.addEventListener("load", render);
    return () => {
      script.removeEventListener("load", render);
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [siteKey, action, onToken]);

  return <div ref={containerRef} />;
}
