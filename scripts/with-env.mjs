import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

// Hosted services inject environment variables; local development can use .env.
const args = [...(existsSync(".env") ? ["--env-file=.env"] : []), ...process.argv.slice(2)];
const child = spawn(process.execPath, args, { stdio: "inherit", env: process.env });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
