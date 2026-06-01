function errorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" || typeof code === "number" ? String(code) : null;
}

function errorDetailParts(error: unknown) {
  if (!error || typeof error !== "object") return [];
  const typed = error as { syscall?: unknown; hostname?: unknown; host?: unknown; address?: unknown; port?: unknown };
  const parts: string[] = [];
  for (const [label, value] of [
    ["syscall", typed.syscall],
    ["host", typed.hostname ?? typed.host],
    ["address", typed.address],
    ["port", typed.port]
  ] as const) {
    if (typeof value === "string" || typeof value === "number") parts.push(`${label} ${value}`);
  }
  return parts;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return String(error ?? "Unknown error");
}

export function formatErrorWithCause(error: unknown, seen = new Set<unknown>()): string {
  if (seen.has(error)) return "circular error cause";
  seen.add(error);

  const message = errorMessage(error);
  const code = errorCode(error);
  const detailParts = errorDetailParts(error);
  const details = [code, ...detailParts].filter(Boolean);
  const messageWithDetails = details.length > 0 ? `${message} (${details.join("; ")})` : message;

  if (error && typeof error === "object" && "cause" in error) {
    const cause = (error as { cause?: unknown }).cause;
    if (cause) return `${messageWithDetails}: ${formatErrorWithCause(cause, seen)}`;
  }

  return messageWithDetails;
}
