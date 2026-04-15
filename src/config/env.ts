import 'dotenv/config'

export const env = {
  PORT: Number(process.env.PORT) || 3000,
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  DATABASE_URL: process.env.DATABASE_URL!,
  REDIS_URL: process.env.REDIS_URL!,
  SMILE_ID_KEY: process.env.SMILE_ID_KEY!,
  TERMII_API_KEY: process.env.TERMII_API_KEY!,
  FCM_SERVER_KEY: process.env.FCM_SERVER_KEY!,
  AGORA_APP_ID: process.env.AGORA_APP_ID!,
  AGORA_APP_CERT: process.env.AGORA_APP_CERT!,
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET!,
}