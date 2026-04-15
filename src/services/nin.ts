import axios from 'axios'
import crypto from 'crypto'
import { env } from '../config/env'

export const verifyNIN = async (nin: string, fullName: string, dob: string) => {
  try {
    const response = await axios.post(
      'https://api.smileidentity.com/v1/id_verification',
      {
        partner_id: env.SMILE_ID_KEY,
        id_type: 'NIN',
        id_number: nin,
        first_name: fullName.split(' ')[0],
        last_name: fullName.split(' ')[1] || '',
        dob,
        country: 'NG',
      }
    )

    const { ResultCode, ResultText, PartnerParams } = response.data

    if (ResultCode !== '1012') {
      return { success: false, message: ResultText }
    }

    return {
      success: true,
      verificationId: PartnerParams?.job_id,
      ninHash: crypto.createHash('sha256').update(nin).digest('hex'),
    }
  } catch (err: any) {
    console.error('Smile ID error:', err?.response?.data || err.message)
    return { success: false, message: 'NIN verification failed' }
  }
}