import tseslint from "typescript-eslint";

// Só as regras mecânicas que já pegaram um erro de verdade. Os julgamentos ficam no CODING_STANDARDS.md.
export default tseslint.config(
  { ignores: ["**/node_modules/", "**/dist/", "**/dist-chaves-desligadas/", "**/.astro/", ".cache/", "prototipos/"] },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: { parser: tseslint.parser },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          // `aoRodar?.(await rodada())`: sem `aoRodar`, o encadeamento opcional não avalia o argumento, e a rodada
          // não roda, calada (ticket 12). O argumento com efeito vai para uma variável antes da chamada.
          selector: "CallExpression[optional=true] > :matches(AwaitExpression, CallExpression, NewExpression).arguments",
          message: "Numa chamada opcional (`f?.(...)`), o argumento só é avaliado se `f` existir. Calcule-o antes, numa variável.",
        },
      ],
    },
  },
);
