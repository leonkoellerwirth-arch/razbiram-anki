import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// razbiram-anki runs fully in the browser — parse .apkg, convert, and push to the
// student's own GitHub. There is no backend, so (unlike the Studio) no dev proxy.
export default defineConfig({
  plugins: [react()],
  server: { host: "127.0.0.1" },
});
