import Fastify from 'fastify'
import { Server } from 'socket.io'
import fjwt from '@fastify/jwt'
import cors from '@fastify/cors'
import { db } from './services/postgres'
import { redis } from './services/redis'
import { registerSocketHandlers } from './services/socket'
import { authRoutes } from './routes/auth'
import { sosRoutes } from './routes/sos'
import { contactsRoutes } from './routes/contacts'
import { startBatchWriter } from './services/batchWriter'
import { env } from './config/env'

const app = Fastify({ logger: true })

// Plugins
app.register(cors, { origin: '*' })
app.register(fjwt, { secret: env.JWT_SECRET })

// Routes
app.register(authRoutes)
app.register(sosRoutes)
app.register(contactsRoutes)

// Socket.io
const io = new Server(app.server, { cors: { origin: '*' } })
registerSocketHandlers(io)

// Health check
app.get('/health', async () => ({ status: 'ok' }))

// Start
db.query('SELECT NOW()').then(() => console.log('PostgreSQL connected'))
redis.on('connect', () => console.log('Redis connected'))

app.listen({ port: env.PORT }, (err) => {
  if (err) throw err
  startBatchWriter()
})

// GET route for '/'
app.get('/', async (request, reply) => {
  return reply.type('text/html').send(`
    <html>
      <head>
        <title>OTS</title>
      </head>
      <body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;">
        <h1>OTS APPLICATION</h1>
      </body>
    </html>
  `)
})
