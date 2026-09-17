import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "node_modules/**", "public/sw.js", "android/**", "ios/**"],
  },
  {
    rules: {
      // Pages fetch their data on mount via `useEffect(() => { load() }, [load])`, where
      // `load` only calls setState after an awaited network response. This rule can't see
      // through the async boundary and reports it as a synchronous setState. Kept as a
      // warning so genuine synchronous cases still surface in lint output.
      "react-hooks/set-state-in-effect": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];

export default config;
