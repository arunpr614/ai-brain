import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        gallery: fileURLToPath(new URL("./index.html", import.meta.url)),
        directionA: fileURLToPath(new URL("./direction-a.html", import.meta.url)),
        directionB: fileURLToPath(new URL("./direction-b.html", import.meta.url)),
        directionC: fileURLToPath(new URL("./direction-c.html", import.meta.url)),
        itemDetail: fileURLToPath(new URL("./item-detail.html", import.meta.url)),
        designHandoff: fileURLToPath(new URL("./design-handoff.html", import.meta.url)),
        groupSortSpecimen: fileURLToPath(new URL("./group-sort-specimen.html", import.meta.url)),
        agentPickup: fileURLToPath(new URL("./agent-pickup.html", import.meta.url)),
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx", "./src/handoff-main.jsx"],
    },
  },
  plugins: [react()],
});
