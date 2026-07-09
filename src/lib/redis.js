import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL, {
  tls: {
    rejectUnauthorized: false, // Required for Upstash
  },
});

redis.on("error", (err) => console.error("Redis Error:", err));

export default redis;
