import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function vialReadApi(): Plugin {
  return {
    name: 'vial-read-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split('?')[0] !== '/api/read-vial') return next()
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method not allowed')
          return
        }
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(Buffer.from(chunk))
        const loaded = (await import('./api/read-vial.ts')) as {
          POST: (request: Request) => Promise<Response>
        }
        const response = await loaded.POST(
          new Request('http://localhost/api/read-vial', {
            method: 'POST',
            headers: {
              'content-type': req.headers['content-type'] || 'application/json',
              authorization: req.headers.authorization || '',
            },
            body: Buffer.concat(chunks),
          }),
        )
        res.statusCode = response.status
        response.headers.forEach((value: string, key: string) => res.setHeader(key, value))
        res.end(Buffer.from(await response.arrayBuffer()))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), vialReadApi()],
  base: './',
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
})
