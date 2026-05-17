import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true,
        allowedHosts: ['game-ui.ecoding.cc'],
  },
});
