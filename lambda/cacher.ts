import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: "https://fancy-jackal-39326.upstash.io",
  token: process.env.UPSTASH_REDIS_TOKEN,
});

export const setCache = async (
  key: string,
  value: string,
  ex: number = 60 * 60 * 24 * 30
) => {
  await redis.set(key, value, { ex });
};

export const getCache = async (key: string) => {
  return await redis.get(key);
};

export const deleteCache = async (key: string) => {
  await redis.del(key);
};

export const clearCache = async () => {
  await redis.flushall();
};

export const getCacheKeys = async () => {
  return await redis.keys("*");
};
