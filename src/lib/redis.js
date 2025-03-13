// lib/redis.js
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL); // Connect to your Redis instance
export default redis;
