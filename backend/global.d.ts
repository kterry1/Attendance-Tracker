declare global {
  namespace NodeJS {
    interface ProcessEnv {
      JWT_SECRET: string;
      TEST_TWILIO_ACCOUNT_SID: string;
      TWILIO_ACCOUNT_SID: string;
      NODE_ENV: string;
      TEST_TWILIO_AUTH_TOKEN: string;
      TWILIO_AUTH_TOKEN: string;
      TEST_PHONE_NUMBER: string;
      TWILIO_SERVICES_SID: string;
    }
  }
}

export {};
