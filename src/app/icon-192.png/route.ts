import { createIconPng } from "@/lib/pngAssets";

export const dynamic = "force-static";

export function GET() {
  return new Response(createIconPng(192), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
