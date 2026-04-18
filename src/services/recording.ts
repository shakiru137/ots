import axios from 'axios'
import { env } from '../config/env'

const AGORA_API_URL = 'https://api.agora.io/v1/apps'

interface RecordingConfig {
  channel: string
  uid: number
  token: string
  storageConfig: {
    vendor: number // 1 = AWS S3
    region: number // AWS region code
    bucket: string
    accessKey: string
    secretKey: string
    fileNamePrefix: string[]
  }
}

// Start cloud recording
export const startCloudRecording = async (
  channel: string,
  uid: number = 0,
  token: string
): Promise<{ sid: string; resourceId: string } | null> => {
  try {
    // Get resource ID first
    const resourceRes = await axios.post(
      `${AGORA_API_URL}/${env.AGORA_APP_ID}/cloud_recording/acquire`,
      {
        cname: channel,
        uid: String(uid),
        clientRequest: {
          resourceExpiredHour: 24,
          scene: 0
        }
      },
      {
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${env.AGORA_APP_ID}:${env.AGORA_APP_CERT}`).toString('base64'),
          'Content-Type': 'application/json'
        }
      }
    )

    const resourceId = resourceRes.data.resourceId

    // Start recording
    const startRes = await axios.post(
      `${AGORA_API_URL}/${env.AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/mode/mix/start`,
      {
        cname: channel,
        uid: String(uid),
        clientRequest: {
          token,
          recordingConfig: {
            maxIdleTime: 30,
            streamTypes: 2, // Audio + Video
            channelType: 0, // Live
            videoStreamType: 0, // High quality
            transcodingConfig: {
              height: 640,
              width: 360,
              bitrate: 500,
              fps: 15,
              mixedVideoLayout: 1,
              backgroundColor: '#000000'
            }
          },
          recordingFileConfig: {
            avFileType: ['hls', 'mp4']
          },
          storageConfig: {
            vendor: 1, // AWS
            region: 0, // US East (change as needed)
            bucket: env.AWS_S3_BUCKET,
            accessKey: env.AWS_ACCESS_KEY_ID!,
            secretKey: env.AWS_SECRET_ACCESS_KEY!,
            fileNamePrefix: ['ots-recordings', channel]
          }
        }
      },
      {
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${env.AGORA_APP_ID}:${env.AGORA_APP_CERT}`).toString('base64'),
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('Cloud recording started:', startRes.data.sid)
    return {
      sid: startRes.data.sid,
      resourceId: resourceId
    }
  } catch (err: any) {
    console.error('Failed to start recording:', err?.response?.data || err.message)
    return null
  }
}

// Stop cloud recording
export const stopCloudRecording = async (
  resourceId: string,
  sid: string,
  channel: string,
  uid: number = 0
): Promise<{ fileList: string[]; serverResponse: any } | null> => {
  try {
    const res = await axios.post(
      `${AGORA_API_URL}/${env.AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`,
      {
        cname: channel,
        uid: String(uid),
        clientRequest: {}
      },
      {
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${env.AGORA_APP_ID}:${env.AGORA_APP_CERT}`).toString('base64'),
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('Cloud recording stopped:', res.data)
    return {
      fileList: res.data.serverResponse?.fileList || [],
      serverResponse: res.data.serverResponse
    }
  } catch (err: any) {
    console.error('Failed to stop recording:', err?.response?.data || err.message)
    return null
  }
}