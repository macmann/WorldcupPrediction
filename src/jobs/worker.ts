import { Worker } from "bullmq";
import { connection } from "./queues";
import { ingestFixtures, syncLiveMatches } from "@/services/fixtures";
import { recalculateMatch } from "@/services/scoring";

new Worker(
  "fixtures",
  async (job) => {
    if (job.name === "daily-fixture-ingestion") return ingestFixtures();
    if (job.name === "live-match-sync") return syncLiveMatches();
  },
  { connection, concurrency: 2 }
);

new Worker(
  "scoring",
  async (job) => {
    if (job.name === "score-match") return recalculateMatch(Number(job.data.matchId));
  },
  { connection, concurrency: 8 }
);
