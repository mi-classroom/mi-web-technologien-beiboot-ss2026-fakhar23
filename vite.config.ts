import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// A small plugin to shim @mediapipe/hands to avoid missing export errors from its buggy CJS/ESM distribution
const mediapipeShimPlugin = () => {
  return {
    name: "mediapipe-shim",
    enforce: "pre" as const,
    resolveId(id: string) {
      if (id === "@mediapipe/hands") {
        return "\0@mediapipe/hands";
      }
    },
    load(id: string) {
      if (id === "\0@mediapipe/hands") {
        return `export const Hands = window.Hands || {};
export const HAND_CONNECTIONS = window.HAND_CONNECTIONS || [];
export const VERSION = "0.4.1646424915";`;
      }
    },
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), mediapipeShimPlugin()],
  optimizeDeps: {
    exclude: ["@mediapipe/hands"],
  },
});
