import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@mediasync/db";

export const SESSION_COOKIE = "mediasync_uid";

export async function getSessionUser() {
  const userId = cookies().get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    include: { role: true, secondaryRole: true, project: true },
  });
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireMember(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.accessLevel === "OBSERVER") redirect("/dashboard");
  return user;
}

export function isPM(user: SessionUser): boolean {
  return user.accessLevel === "MEMBER" && user.role.code === "PM";
}

export function canApproveTask(user: SessionUser): boolean {
  return (
    user.accessLevel === "MEMBER" &&
    (user.role.code === "PM" || user.role.code === "QC")
  );
}

export function canFacilitate(user: SessionUser): boolean {
  return (
    user.accessLevel === "MEMBER" &&
    (user.role.code === "PM" || user.role.code === "CD")
  );
}

export function isObserver(user: SessionUser): boolean {
  return user.accessLevel === "OBSERVER";
}

export function roleLabel(user: SessionUser): string {
  return user.role.name;
}
