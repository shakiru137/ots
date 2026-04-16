import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { query } from '../services/postgres'
import { setSOSActive, redis } from '../services/redis'

const triggerSchema = z.object({
  type: z.enum(['personal', 'third_party']),
  lng: z.number(),
  lat: z.number(),
})

export const sosRoutes = async (app: FastifyInstance) => {

  // Verify JWT on every request in this scope
  

  app.addHook('preHandler', async (req, reply) => {
    try {
      await req.jwtVerify()
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
  })

  // Trigger SOS
  app.post('/sos/trigger', async (req, reply) => {
    const parsed = triggerSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() })
    }

    const { type, lng, lat } = parsed.data
    const { userId } = req.user as { userId: string }

    const minute = Math.floor(Date.now() / 60000)
    const idempotencyKey = `${userId}:${minute}`

    const existing = await query(
      `SELECT id FROM sos_sessions WHERE idempotency_key = $1`,
      [idempotencyKey]
    )
    if (existing.rows.length > 0) {
      return reply.send({
        message: 'SOS already active',
        sessionId: existing.rows[0].id
      })
    }

    const sessionId = uuidv4()
    const agoraChannel = `sos-${sessionId}`

    await query(
      `INSERT INTO sos_sessions (id, user_id, type, status, idempotency_key, agora_channel, last_known_location)
       VALUES ($1, $2, $3, 'active', $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326))`,
      [sessionId, userId, type, idempotencyKey, agoraChannel, lng, lat]
    )

    await setSOSActive(userId, sessionId)
    await redis.geoadd('sos:locations', lng, lat, userId)

    if (type === 'personal') {
      const contacts = await query(
        `SELECT phone, name FROM family_contacts WHERE user_id = $1`,
        [userId]
      )
      console.log(`Personal SOS — notifying ${contacts.rows.length} family contacts`)
    } else {
      console.log(`Third-party SOS — routing to nearest responder hub`)
    }

    return reply.status(201).send({
      sessionId,
      agoraChannel,
      message: 'SOS triggered successfully'
    })
  })

  // Get active SOS session
  app.get('/sos/active', async (req, reply) => {
    const { userId } = req.user as { userId: string }

    const result = await query(
      `SELECT * FROM sos_sessions WHERE user_id = $1 AND status = 'active' ORDER BY started_at DESC LIMIT 1`,
      [userId]
    )

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'No active SOS session' })
    }

    return reply.send({ session: result.rows[0] })
  })

  // Resolve SOS
  app.post('/sos/resolve', async (req, reply) => {
    const { userId } = req.user as { userId: string }
    const { sessionId } = req.body as { sessionId: string }

    await query(
      `UPDATE sos_sessions SET status = 'resolved', ended_at = NOW() WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    )

    return reply.send({ message: 'SOS resolved' })
  })
}