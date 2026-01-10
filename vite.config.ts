import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5177,
    strictPort: true,
    fs: {
      deny: [
        "**/.hitech-backups/**",
        "**/scripts/hitech-templates/**",
        "**/hitech-templates/**",
      ],
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
  },
})
