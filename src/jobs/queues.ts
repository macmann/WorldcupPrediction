import { Queue } from "bullmq";
import IORedis from "ioredis";
import { config } from "../lib/config";

let redisConnection: IORedis | null = null;
let redisConnectionMode: "primary" | "fallback" = "primary";
let fixtureQueue: Queue | null = null;
let liveScoreQueue: Queue | null = null;
let scoringQueue: Queue | null = null;

export function getConnection() {
  if (!redisConnection) {
    redisConnection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });
    redisConnection.on("error", (error) => {
      const isSslPacketLengthError = typeof error?.message === "string" && error.message.includes("ERR_SSL_PACKET_LENGTH_TOO_LONG");
      const canFallbackToNonTls = redisConnectionMode === "primary" && config.redisUrl.startsWith("rediss://");
      if (!isSslPacketLengthError || !canFallbackToNonTls) return;

      const fallbackUrl = `redis://${config.redisUrl.slice("rediss://".length)}`;
      console.warn("Redis TLS handshake failed with ERR_SSL_PACKET_LENGTH_TOO_LONG. Falling back to non-TLS Redis URL.");
      redisConnectionMode = "fallback";
      redisConnection?.disconnect(false);
      redisConnection = new IORedis(fallbackUrl, { maxRetriesPerRequest: null });
    });
  }
  return redisConnection;
}

export function getFixtureQueue() {
  fixtureQueue ??= new Queue("fixtures", { connection: getConnection() });
  return fixtureQueue;
}

export function getLiveScoreQueue() {
  liveScoreQueue ??= new Queue("live-scores", { connection: getConnection() });
  return liveScoreQueue;
}

export function getScoringQueue() {
  scoringQueue ??= new Queue("scoring", { connection: getConnection() });
  return scoringQueue;
}

export async function closeQueues() {
  await fixtureQueue?.close();
  await liveScoreQueue?.close();
  await scoringQueue?.close();
  await redisConnection?.quit();
  fixtureQueue = null;
  liveScoreQueue = null;
  scoringQueue = null;
  redisConnection = null;
  redisConnectionMode = "primary";
}
