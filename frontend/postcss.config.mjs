import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const configDir = dirname(fileURLToPath(import.meta.url));

const config = {
  plugins: {
    tailwindcss: {
      config: join(configDir, "tailwind.config.js"),
    },
    autoprefixer: {},
  },
};

export default config;
