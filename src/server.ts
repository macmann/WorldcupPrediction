import { createServer } from "node:http";
import type { UrlWithParsedQuery } from "node:url";
import next from "next";
import { startBackgroundJobs, stopBackgroundJobs } from "./jobs/runtime";

const dev = process.env.NODE_ENV !== "production";
// Render and other platforms set HOSTNAME to an internal container name.
// Binding Next.js to that value can make the server unreachable from the public edge.
const hostname = process.env.APP_HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function main() {
  await app.prepare();

  const server = createServer(async (request, response) => {
    try {
      const origin = request.headers.host ? `http://${request.headers.host}` : `http://${hostname}:${port}`;
      const parsedUrl = new URL(request.url ?? "/", origin);
      const nextUrl: UrlWithParsedQuery = {
        auth: null,
        hash: parsedUrl.hash,
        host: parsedUrl.host,
        hostname: parsedUrl.hostname,
        href: parsedUrl.href,
        pathname: parsedUrl.pathname,
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        port: parsedUrl.port,
        protocol: parsedUrl.protocol,
        query: Object.fromEntries(parsedUrl.searchParams.entries()),
        search: parsedUrl.search,
        slashes: true
      };
      await handle(request, response, nextUrl);
    } catch (error) {
      if (response.headersSent || response.writableEnded || response.destroyed) {
        return;
      }

      console.error("Unhandled request error", error);
      response.statusCode = 500;
      response.end("Internal server error");
    }
  });

  server.on("clientError", (error: NodeJS.ErrnoException, socket) => {
    if (error.code === "ECONNRESET" || !socket.writable) {
      return;
    }

    socket.end("HTTP/1.1 400 Bad Request\\r\\n\\r\\n");
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

  if (process.env.ENABLE_BACKGROUND_JOBS !== "false") {
    startBackgroundJobs().catch((error) => {
      console.error("Background jobs failed to start in web process. Web server will continue running.", error);
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
