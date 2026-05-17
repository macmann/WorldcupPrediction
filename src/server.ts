import { createServer } from "node:http";
import next from "next";
import { parse } from "node:url";
import { startBackgroundJobs, stopBackgroundJobs } from "./jobs/runtime";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function main() {
  await app.prepare();

  if (process.env.ENABLE_BACKGROUND_JOBS !== "false") {
    await startBackgroundJobs();
  }

  const server = createServer(async (request, response) => {
    try {
      const parsedUrl = parse(request.url ?? "/", true);
      await handle(request, response, parsedUrl);
    } catch (error) {
      console.error("Unhandled request error", error);
      response.statusCode = 500;
      response.end("Internal server error");
    }
  });

  const shutdown = async () => {
    console.log("Shutting down web app and background jobs...");
    server.close();
    await stopBackgroundJobs();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  server.listen(port, hostname, () => {
    console.log(`Football Fantasy Myanmar - WC 2026 ready on http://${hostname}:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
