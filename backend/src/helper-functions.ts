const twilio = require('twilio');
require('dotenv').config();
// Find your Account SID and Auth Token at twilio.com/console
// and set the environment variables. See http://twil.io/secure

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

const servicesId = process.env.TWILIO_SERVICES_SID;

const accountSid =
  process.env.NODE_ENV === 'test'
    ? process.env.TEST_TWILIO_ACCOUNT_SID
    : process.env.TWILIO_ACCOUNT_SID;
const authToken =
  process.env.NODE_ENV === 'test'
    ? process.env.TEST_TWILIO_AUTH_TOKEN
    : process.env.TWILIO_AUTH_TOKEN;
const testPhoneNumber = process.env.TEST_PHONE_NUMBER;
const client = twilio(accountSid, authToken);

async function sendVerificationCode(phoneNumber: string = testPhoneNumber) {
  const verification = await client.verify.v2
    .services(servicesId)
    .verifications.create({
      channel: 'sms',
      to: phoneNumber,
    });

  return verification;
}

async function checkVerificationCode({
  code,
  phoneNumber = testPhoneNumber,
}: {
  code: string;
  phoneNumber?: string;
}) {
  const verificationCheck = await client.verify.v2
    .services(servicesId)
    .verificationChecks.create({
      code,
      to: phoneNumber,
    });

  console.log(verificationCheck.status);
}

export { sendVerificationCode, checkVerificationCode };
