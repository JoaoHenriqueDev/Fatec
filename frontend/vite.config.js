import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:3001',
      '/questoes': 'http://localhost:3001',
      '/provas': 'http://localhost:3001',
      '/redacoes': 'http://localhost:3001',
      '/respostas': 'http://localhost:3001',
      '/simulados': 'http://localhost:3001',
      '/estatisticas': 'http://localhost:3001',
      '/trilha': 'http://localhost:3001',
    },
  },
});
