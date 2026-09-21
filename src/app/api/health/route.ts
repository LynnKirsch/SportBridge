import { NextResponse } from "next/server";

import { withRequestLogging } from "@/lib/logger/request";

export const GET = withRequestLogging(
  () => NextResponse.json({ status: "ok" }),
  { route: "/api/health" },
);
