import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "Missing GITHUB_CLIENT_ID" },
      { status: 500 },
    );
  }

  const url = `https://github.com/settings/connections/applications/${clientId}`;

  return NextResponse.redirect(url);
}
