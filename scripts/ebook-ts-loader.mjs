/**
 * Resolution hook so Node's --experimental-strip-types can import the
 * repository's lib/*.ts modules, which use extensionless relative imports
 * (the Next.js "bundler" resolution style, e.g. `import ... from "./posts"`).
 *
 * Usage: node --experimental-strip-types --import ./scripts/ebook-ts-loader.mjs <entry>
 */
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.startsWith("./") || specifier.startsWith("../")) {
        try {
          return nextResolve(`${specifier}.ts`, context);
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
});
