import { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import { query } from '../services/postgres'
import { verifyNIN } from '../services/nin'
import { z } from 'zod'
import { JWTPayload } from '../types'
import crypto from 'crypto'

const registerSchema = z.object({
  full_name: z.string().min(3),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  password: z.string().min(6),
  nin: z.string().length(11),
  dob: z.string(), // YYYY-MM-DD
})

const loginSchema = z.object({
  phone: z.string(),
  password: z.string(),
})

export const authRoutes = async (app: FastifyInstance) => {

  // Register
  app.post('/auth/register', async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() })
    }

    const { full_name, phone, email, password, nin, dob } = parsed.data

    // Check if user exists
    const existing = await query('SELECT id FROM users WHERE phone = $1', [phone])
    if (existing.rows.length > 0) {
      return reply.status(409).send({ error: 'Phone number already registered' })
    }

    // TODO: re-enable in production
const ninResult = {
  success: true,
  verificationId: 'dev-bypass',
  ninHash: crypto.createHash('sha256').update(nin).digest('hex')
}

    // Hash password
    const password_hash = await bcrypt.hash(password, 12)

    // Save user — never store raw NIN
    const result = await query(
      `INSERT INTO users (full_name, phone, email, password_hash, verification_id, nin_hash, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id, full_name, phone, role`,
      [full_name, phone, email, password_hash, ninResult.verificationId, ninResult.ninHash]
    )

    const user = result.rows[0]

    const token = app.jwt.sign(
      { userId: user.id, phone: user.phone, role: user.role } as JWTPayload,
      { expiresIn: '15m' }
    )
    const refreshToken = app.jwt.sign(
      { userId: user.id, phone: user.phone, role: user.role } as JWTPayload,
      { expiresIn: '7d' }
    )

    return reply.status(201).send({ user, token, refreshToken })
  })

  // Login
  app.post('/auth/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() })
    }

    const { phone, password } = parsed.data

    const result = await query(
      'SELECT * FROM users WHERE phone = $1',
      [phone]
    )

    const user = result.rows[0]
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const token = app.jwt.sign(
      { userId: user.id, phone: user.phone, role: user.role } as JWTPayload,
      { expiresIn: '15m' }
    )
    const refreshToken = app.jwt.sign(
      { userId: user.id, phone: user.phone, role: user.role } as JWTPayload,
      { expiresIn: '7d' }
    )

    return reply.send({
      user: { id: user.id, full_name: user.full_name, phone: user.phone, role: user.role },
      token,
      refreshToken
    })
  })

  // Refresh token
  app.post('/auth/refresh', async (req, reply) => {
    const { refreshToken } = req.body as { refreshToken: string }
    if (!refreshToken) {
      return reply.status(400).send({ error: 'Refresh token required' })
    }

    try {
      const payload = app.jwt.verify(refreshToken) as JWTPayload
      const token = app.jwt.sign(
        { userId: payload.userId, phone: payload.phone, role: payload.role },
        { expiresIn: '15m' }
      )
      return reply.send({ token })
    } catch {
      return reply.status(401).send({ error: 'Invalid refresh token' })
    }
  })
}