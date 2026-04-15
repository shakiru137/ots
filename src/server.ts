import Fastify from 'fastify'
import { Server } from 'socket.io'
import { db } from './services/postgres'
import { redis } from './services/redis'
import { registerSocketHandlers } from './services/socket'
import 'dotenv/config'

const app = Fastify({ logger: true })

// Test DB connection on startup
db.query('SELECT NOW()').then(() => console.log('PostgreSQL connected'))

// Socket.io
const io = new Server(app.server, { cors: { origin: '*' } })
registerSocketHandlers(io)

app.get('/health', async () => ({ status: 'ok' }))

app.listen({ port: Number(process.env.PORT) || 3000 }, (err) => {
  if (err) throw err
})