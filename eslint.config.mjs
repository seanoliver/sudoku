import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // motion/react loads all of Motion up front and undoes LazyMotion's split; strict mode does not catch it.
  { rules: { 'no-restricted-imports': ['error', { paths: [{ name: 'motion/react', importNames: ['m', 'motion'], message: "Import m from 'motion/react-m'." }] }] } },
  globalIgnores([".next/**", ".worktrees/**", "public/sw.js", "next-env.d.ts"]),
]);
