import { scheduleRecurringJobs } from "./runtime";

scheduleRecurringJobs()
  .then(() => {
    console.log("Scheduled fixture ingestion every 4 hours and three-minute live score polling.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
