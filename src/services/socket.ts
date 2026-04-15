import { Server, Socket } from 'socket.io'
import { updateLocation, setSOSActive, clearSOSSession, getLocation } from './redis'
import { query } from './postgres'

export const registerSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id)

    // Client sends GPS ping every 1 second during SOS
    socket.on('sos:location', async ({ userId, sessionId, lng, lat }) => {
      await updateLocation(userId, lng, lat)
      // Broadcast to responder room
      io.to(`responder:${sessionId}`).emit('sos:location:update', { userId, lng, lat })
    })

    // SOS triggered
    socket.on('sos:start', async ({ userId, sessionId }) => {
      await setSOSActive(userId, sessionId)
      socket.join(`sos:${sessionId}`)
      console.log(`SOS started: user ${userId}, session ${sessionId}`)
    })

    // Heartbeat monitor — if socket disconnects during active SOS
    socket.on('disconnect', async () => {
      const { userId, sessionId } = socket.data
      if (!userId || !sessionId) return

      const lastLocation = await getLocation(userId)

      // Notify responders of signal loss
      io.to(`responder:${sessionId}`).emit('sos:signal_lost', {
        userId,
        sessionId,
        lastKnownLocation: lastLocation
      })

      // Update session status in DB
      await query(
        `UPDATE sos_sessions SET status = 'signal_lost', ended_at = NOW() WHERE id = $1`,
        [sessionId]
      )

      await clearSOSSession(userId)
      console.log(`Signal lost: user ${userId}`)
    })

    // SOS resolved
    socket.on('sos:end', async ({ userId, sessionId }) => {
      await clearSOSSession(userId)
      await query(
        `UPDATE sos_sessions SET status = 'resolved', ended_at = NOW() WHERE id = $1`,
        [sessionId]
      )
      socket.leave(`sos:${sessionId}`)
    })
  })
}