import { scheduleRecurringJobs } from "./runtime";

scheduleRecurringJobs()
  .then(() => {
    console.log("Scheduled daily fixture ingestion at 00:00 UTC and three-minute live score polling.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
