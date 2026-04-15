import Redis from 'ioredis'
import 'dotenv/config'

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

redis.on('connect', () => console.log('Redis connected'))
redis.on('error', (err) => console.error('Redis error:', err))

// Save live GPS coordinate for a user
export const updateLocation = async (userId: string, lng: number, lat: number) => {
  await redis.geoadd('sos:locations', lng, lat, userId)
}

// Get latest location for a user
export const getLocation = async (userId: string) => {
  return redis.geopos('sos:locations', userId)
}

// Mark SOS session as active
export const setSOSActive = async (userId: string, sessionId: string) => {
  await redis.set(`sos:active:${userId}`, sessionId, 'EX', 86400) // 24hr expiry
}

// Get active SOS session
export const getSOSSession = async (userId: string) => {
  return redis.get(`sos:active:${userId}`)
}

// Clear SOS session
export const clearSOSSession = async (userId: string) => {
  await redis.del(`sos:active:${userId}`)
  await redis.zrem('sos:locations', userId)
}