import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vitest/config"

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

    // ✅ IMPORTANT: prevent Vite from reloading when MCP/Chromium profile writes files
    watch: {
      ignored: [
        "**/.mcp/**",
        "**/.mcp/**/**",
        "**/tools/mcp/**",
        "**/tools/mcp/**/**",
        "**/src/slides/**/tools/mcp/**",
        "**/src/slides/**/tools/mcp/**/**",
      ],
    },

    fs: {
      deny: [
        "**/.hitech-backups/**",
        "**/scripts/hitech-templates/**",
        "**/hitech-templates/**",
        "**/scripts/hitech-templates_backup_*/**",
      ],
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
  },
})
