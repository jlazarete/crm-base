import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command }) => ({
  css: { transformer: "lightningcss" },
  resolve: { alias: { "@": `${process.cwd()}/src` } },
  server: { host: "::", port: 8081 },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    ...(command === "build"
      ? [
          nitro({
            preset: "cloudflare-module",
            cloudflare: {
              wrangler: {
                previews: {},
                observability: {
                  logs: {
                    enabled: true,
                    head_sampling_rate: 1,
                    invocation_logs: true,
                    persist: true,
                  },
                  traces: { enabled: false },
                },
              },
            },
          }),
        ]
      : []),
    viteReact(),
  ],
}));
