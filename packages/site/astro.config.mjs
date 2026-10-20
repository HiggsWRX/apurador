import preact from "@astrojs/preact";
import { defineConfig } from "astro/config";
import { aoVivoLocal } from "./src/integracoes/ao-vivo-local.mjs";

export default defineConfig({
  integrations: [preact(), aoVivoLocal()],
});
