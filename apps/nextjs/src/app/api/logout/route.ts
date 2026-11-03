import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "~/server/auth";

export function POST(request: Request) {
  cookies().delete(SESSION_COOKIE);
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
