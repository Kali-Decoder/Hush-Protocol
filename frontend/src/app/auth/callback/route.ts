import { NextResponse } from "next/server";

/** Legacy Supabase OAuth callback. Redirect home. */
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/register`);
}
