import { scheduleRecurringJobs } from "./runtime";

scheduleRecurringJobs()
  .then(() => {
    console.log("Scheduled daily fixture ingestion and three-minute live match sync jobs.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
