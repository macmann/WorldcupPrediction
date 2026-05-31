import { createScreenshotPng } from "@/lib/pngAssets";

export const dynamic = "force-static";

export function GET() {
  return new Response(createScreenshotPng("predict"), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
