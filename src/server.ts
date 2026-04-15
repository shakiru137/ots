import Fastify from 'fastify'
import { Server } from 'socket.io'
import fjwt from '@fastify/jwt'
import cors from '@fastify/cors'
import { db } from './services/postgres'
import { redis } from './services/redis'
import { registerSocketHandlers } from './services/socket'
import { authRoutes } from './routes/auth'
import { env } from './config/env'

const app = Fastify({ logger: true })

// Plugins
app.register(cors, { origin: '*' })
app.register(fjwt, { secret: env.JWT_SECRET })

// Routes
app.register(authRoutes)

// Socket.io
const io = new Server(app.server, { cors: { origin: '*' } })
registerSocketHandlers(io)

// Health check
app.get('/health', async () => ({ status: 'ok' }))

// Start
db.query('SELECT NOW()').then(() => console.log('PostgreSQL connected'))

app.listen({ port: env.PORT }, (err) => {
  if (err) throw err
})