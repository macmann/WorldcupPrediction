import { Queue } from "bullmq";
import IORedis from "ioredis";
import { config } from "@/lib/config";

export const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });

export const fixtureQueue = new Queue("fixtures", { connection });
export const scoringQueue = new Queue("scoring", { connection });
