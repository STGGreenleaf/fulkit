import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  // Pass code to client-side page that can exchange it
  if (code) {
    return NextResponse.redirect(
      `${origin}/auth/confirm?code=${code}&next=${encodeURIComponent(next)}`
    );
  }

  return NextResponse.redirect(`${origin}/login`);
}
