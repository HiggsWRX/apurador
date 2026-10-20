import jsdoc from "eslint-plugin-jsdoc";
import tseslint from "typescript-eslint";

// Só as regras mecânicas que já pegaram um erro de verdade. Os julgamentos ficam no CODING_STANDARDS.md.
export default tseslint.config(
  { ignores: ["**/node_modules/", "**/dist/", "**/dist-chaves-desligadas/", "**/dist-projecao-desligada/","**/.astro/", ".cache/", "prototipos/"] },
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
  {
    // Todo tipo e toda função exportados levam o doc de uma linha (CODING_STANDARDS.md, "Shape of a module"). A revisão
    // do ticket 14 achou uma dúzia sem ele: é uma regra mecânica, e aqui ela não depende de ninguém lembrar.
    files: ["packages/*/src/**/*.ts", "packages/*/src/**/*.tsx"],
    plugins: { jsdoc },
    rules: {
      "jsdoc/require-jsdoc": [
        "error",
        {
          publicOnly: true,
          // O --fix poria um doc vazio, que passa na regra e não diz nada.
          enableFixer: false,
          require: { FunctionDeclaration: true, ArrowFunctionExpression: true, FunctionExpression: true, ClassDeclaration: true },
          contexts: ["ExportNamedDeclaration > TSInterfaceDeclaration", "ExportNamedDeclaration > TSTypeAliasDeclaration"],
        },
      ],
    },
  },
);
