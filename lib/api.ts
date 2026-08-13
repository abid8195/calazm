import { NextResponse } from "next/server";
import { currentUserId } from "./session";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function guard(): Promise<{ userId: string } | NextResponse> {
  const userId = await currentUserId();
  if (!userId) return json({ error: "Not signed in" }, 401);
  return { userId };
}

export function isResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}
