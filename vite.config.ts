import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // В разработке API отдаёт сервер из каталога server/ (npm run dev там)
    proxy: { '/api': 'http://localhost:3000' },
  },
})
