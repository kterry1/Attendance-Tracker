import redis from './redis-client';

export const rateLimit = async (
  key: string,
  maxRequests: number,
  windowSeconds: number
) => {
  const redisKey = `rate-limit:${key}`;
  const requests = await redis.incr(redisKey);

  if (requests === 1) {
    await redis.expire(redisKey, windowSeconds);
  }

  if (requests > maxRequests) {
    throw new Error(`Rate limit reached. Please try again later.`);
  }
};
