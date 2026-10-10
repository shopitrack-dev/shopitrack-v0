import { SpeedInsights } from "@vercel/speed-insights/react";

// Vercel Speed Insights. Unlike Analytics it takes no `mode` prop and detects
// development through process.env, which Vite does not define in the browser:
// in `npm run dev` it would request /_vercel/speed-insights/script.js and 404.
// Dev timings are not meaningful anyway, so it only renders in production builds.
export function VercelSpeedInsights() {
  return import.meta.env.PROD ? <SpeedInsights /> : null;
}
