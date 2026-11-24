const { defineConfig } = require("vite");

module.exports = defineConfig({
  base: "./",
  server: {
    host: "localhost",
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
  build: {
    rollupOptions: {
      input: "index.html",
    },
  },
});
