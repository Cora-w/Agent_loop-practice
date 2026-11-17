import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 本地开发和预览时通过 Vite 代理转发模型请求：
// 浏览器请求 /openrouter/chat/completions，代理转发到 https://openrouter.ai/api/v1/chat/completions
const openrouterProxy = {
  '/openrouter': {
    target: process.env.OPENROUTER_TARGET ?? 'https://openrouter.ai/api/v1',
    changeOrigin: true,
    secure: true,
    rewrite: (path: string) => path.replace(/^\/openrouter/, ''),
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: openrouterProxy },
  preview: { proxy: openrouterProxy },
})
