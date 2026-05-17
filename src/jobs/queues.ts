import { Queue } from "bullmq";
import IORedis from "ioredis";
import { config } from "../lib/config";

let redisConnection: IORedis | null = null;
let fixtureQueue: Queue | null = null;
let liveScoreQueue: Queue | null = null;
let scoringQueue: Queue | null = null;

export function getConnection() {
  redisConnection ??= new IORedis(config.redisUrl, { maxRetriesPerRequest: null });
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
}
