// twilioService.test.js
import { sendVerificationCode } from '../helper-functions';

export const verificationMock = jest.fn().mockResolvedValue({
  sid: 'FAKE_SID',
  status: 'pending',
});

// Mock the nested structure of the Twilio client.
jest.mock('twilio', () => {
  return jest.fn(() => ({
    verify: {
      v2: {
        services: jest.fn(() => ({
          verifications: {
            create: verificationMock,
          },
        })),
      },
    },
  }));
});

describe('sendVerificationCode', () => {
  beforeEach(() => {
    jest.resetModules();
  });
  it('sends a verification code and returns a mocked verification object', async () => {
    const phoneNumber = '+15005550006'; // twilioFakeSMSTestNumber
    const result = await sendVerificationCode();
    expect(verificationMock).toHaveBeenCalledWith({
      channel: 'sms',
      to: phoneNumber,
    });
    expect(result.sid).toBe('FAKE_SID');
  });
});
