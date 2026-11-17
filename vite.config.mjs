import { defineConfig, loadEnv } from 'vite'
import { createTryOnMiddleware } from './server/youcam.mjs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'YOUCAM_')
  return {
    plugins: [{
      name: 'local-youcam-api',
      configureServer(server) {
        server.middlewares.use(createTryOnMiddleware({
          apiKey: process.env.YOUCAM_API_KEY || env.YOUCAM_API_KEY,
        }))
      },
    }],
  }
})
