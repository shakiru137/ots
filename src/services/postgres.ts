import { Pool } from 'pg'
import 'dotenv/config'

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                  // max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

db.on('error', (err) => {
  console.error('Unexpected PostgreSQL error:', err)
  process.exit(-1)
})

export const query = (text: string, params?: any[]) => db.query(text, params)