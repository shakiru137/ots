import cron from 'node-cron'
import { redis } from './redis'
import { query } from './postgres'

export const startBatchWriter = () => {
  // Runs every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try {
      // Get all active SOS sessions
      const activeSessions = await query(
        `SELECT id, user_id FROM sos_sessions WHERE status = 'active'`
      )

      for (const session of activeSessions.rows) {
        const { id: sessionId, user_id: userId } = session

        // Get latest GPS from Redis
        const location = await redis.geopos('sos:locations', userId)
        if (!location || !location[0]) continue

        const [lng, lat] = location[0]

        // Update last known location in PostgreSQL
        await query(
          `UPDATE sos_sessions
           SET last_known_location = ST_SetSRID(ST_MakePoint($1, $2), 4326)
           WHERE id = $3`,
          [lng, lat, sessionId]
        )

        // Append to incident movement path
        await query(
          `INSERT INTO incidents (session_id, user_id, movement_path)
           VALUES ($1, $2, $3::jsonb)
           ON CONFLICT (session_id)
           DO UPDATE SET movement_path = incidents.movement_path || $3::jsonb`,
          [sessionId, userId, JSON.stringify([{ lng, lat, t: Date.now() }])]
        )
      }
    } catch (err) {
      console.error('Batch writer error:', err)
    }
  })

  console.log('Batch writer started — syncing every 30s')
}