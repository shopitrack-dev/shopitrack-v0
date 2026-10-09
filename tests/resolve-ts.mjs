// Lets `node --test` run the TypeScript sources directly: api/leads.ts imports
// "../src/lib/contactLead.js" (the NodeNext form Vercel needs), which only
// exists as .ts until Vercel compiles it. Requires Node >= 22.15.
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.startsWith(".") && specifier.endsWith(".js")) {
        return nextResolve(specifier.slice(0, -3) + ".ts", context);
      }
      throw error;
    }
  },
});
