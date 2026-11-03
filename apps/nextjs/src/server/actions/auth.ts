"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@mediasync/db";

import { SESSION_COOKIE } from "~/server/auth";

export async function switchUser(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");

  cookies().set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/dashboard");
}
