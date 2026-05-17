import { fixtureQueue } from "./queues";

async function schedule() {
  await fixtureQueue.upsertJobScheduler("daily-fixture-ingestion", { pattern: "0 2 * * *" }, { name: "daily-fixture-ingestion" });
  await fixtureQueue.upsertJobScheduler("live-match-sync", { every: 3 * 60 * 1000 }, { name: "live-match-sync" });
  console.log("Scheduled daily fixture ingestion and three-minute live match sync jobs.");
}

schedule().catch((error) => {
  console.error(error);
  process.exit(1);
});
