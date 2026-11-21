export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      service: "habiton-frontend",
      version: process.env.VERCEL_GIT_COMMIT_SHA || process.env.APP_VERSION || "unknown",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
