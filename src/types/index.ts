export interface User {
  id: string
  full_name: string
  phone: string
  email?: string
  password_hash: string
  verification_id?: string
  nin_hash?: string
  is_verified: boolean
  role: 'user' | 'responder' | 'admin'
  created_at: Date
  updated_at: Date
}

export interface SOSSession {
  id: string
  user_id: string
  type: 'personal' | 'third_party'
  status: 'active' | 'resolved' | 'signal_lost'
  idempotency_key: string
  agora_channel?: string
  recording_url?: string
  last_known_location?: any
  started_at: Date
  ended_at?: Date
}

export interface JWTPayload {
  userId: string
  phone: string
  role: string
}