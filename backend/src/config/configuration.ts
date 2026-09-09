export default () => ({
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  sms: {
    gatewayMode: (process.env.SMS_GATEWAY_MODE || process.env.SMARTPING_MODE || 'MOCK').toUpperCase().trim(),
    provider: (process.env.SMS_GATEWAY_PROVIDER || 'mock').toLowerCase().trim(),
    fakeOtpEnabled: process.env.DEV_FAKE_OTP_ENABLED !== undefined
      ? ['true', '1', 'yes', 't'].includes(String(process.env.DEV_FAKE_OTP_ENABLED).toLowerCase().trim())
      : (process.env.SMS_GATEWAY_MODE || process.env.SMARTPING_MODE || 'MOCK').toUpperCase().trim() !== 'PRODUCTION',
    fakeOtpCode: process.env.DEV_FAKE_OTP_CODE || '12345',
    smartping: {
      apiUrl: process.env.SMARTPING_API_URL || 'https://pgapi.smartping.ai/fe/api/v1/send',
      username: process.env.SMARTPING_USERNAME || '',
      password: process.env.SMARTPING_PASSWORD || '',
      senderId: process.env.SMARTPING_SENDER_ID || '',
      dltId: process.env.SMARTPING_DLT_ID || '',
      message: process.env.SMARTPING_OTP_MESSAGE || 'Your OTP is {otp}. Do not share it with anyone. It is valid for 15 minutes.',
    },
  },
});
