import { Queue } from "bullmq";
import IORedis from "ioredis";
import { config } from "../lib/config";

let redisConnection: IORedis | null = null;
let fixtureQueue: Queue | null = null;
let scoringQueue: Queue | null = null;

export function getConnection() {
  redisConnection ??= new IORedis(config.redisUrl, { maxRetriesPerRequest: null });
  return redisConnection;
}

export function getFixtureQueue() {
  fixtureQueue ??= new Queue("fixtures", { connection: getConnection() });
  return fixtureQueue;
}

export function getScoringQueue() {
  scoringQueue ??= new Queue("scoring", { connection: getConnection() });
  return scoringQueue;
}

export async function closeQueues() {
  await fixtureQueue?.close();
  await scoringQueue?.close();
  await redisConnection?.quit();
  fixtureQueue = null;
  scoringQueue = null;
  redisConnection = null;
}
