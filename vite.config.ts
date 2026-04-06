import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Prefer TypeScript source over compiled JS mirrors when both exist
    extensions: [".mjs", ".mts", ".ts", ".tsx", ".jsx", ".js", ".json"]
  },
  server: {
    host: "0.0.0.0",
    port: 5173
  }
});
