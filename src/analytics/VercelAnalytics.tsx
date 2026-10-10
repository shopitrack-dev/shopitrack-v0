import { Analytics } from "@vercel/analytics/react";

// Vercel Web Analytics. Its script follows React Router navigations through the
// History API, so it is not wired to usePageViews (that would double count).
// Vite has no process.env in the browser, so the mode is passed explicitly:
// `npm run dev` loads Vercel's debug script, which only logs to the console.
export function VercelAnalytics() {
  return <Analytics mode={import.meta.env.DEV ? "development" : "production"} />;
}
