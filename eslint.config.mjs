import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // These load all of Motion up front and undo LazyMotion's split; strict never catches m, and catches motion only in development.
  { rules: { 'no-restricted-imports': ['error', { paths: [
    { name: 'motion/react', importNames: ['m', 'motion'], message: "Use import * as m from 'motion/react-m'." },
    { name: 'motion/react-client', message: "Use import * as m from 'motion/react-m'." },
  ] }] } },
  globalIgnores([".next/**", ".worktrees/**", "public/sw.js", "next-env.d.ts"]),
]);
