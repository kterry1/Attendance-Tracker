const twilio = require('twilio');
require('dotenv').config();
// Find your Account SID and Auth Token at twilio.com/console
// and set the environment variables. See http://twil.io/secure
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const servicesId = process.env.TWILIO_SERVICES_SID;
const testPhoneNumber = process.env.PHONE_NUMBER;
const client = twilio(accountSid, authToken);

async function sendVerificationCode(phoneNumber: string = testPhoneNumber) {
  const verification = await client.verify.v2
    .services(servicesId)
    .verifications.create({
      channel: 'sms',
      to: phoneNumber,
    });

  console.log(verification);
}

async function checkVerificationCode({
  code,
  phoneNumber = testPhoneNumber,
}: {
  code: string;
  phoneNumber: string;
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
