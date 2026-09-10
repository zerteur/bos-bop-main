"use server";

// Actions de session : connexion, déconnexion, mot de passe.

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "../db";
import {
  requireSession,
  createSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE,
} from "../auth";
import { formString as str } from "../forms";

export async function loginAction(formData: FormData) {
  const email = str(formData, "email", 200).toLowerCase();
  const password = str(formData, "password", 200);
  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !valid) {
    redirect("/admin/login?error=1");
  }
  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
  });
  (await cookies()).set(SESSION_COOKIE, token, await getSessionCookieOptions());
  const next = str(formData, "next", 300);
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

export async function changePasswordAction(formData: FormData) {
  const session = await requireSession();
  const current = str(formData, "current", 200);
  const next = str(formData, "new", 200);
  const confirm = str(formData, "confirm", 200);
  if (next.length < 8) redirect("/admin/parametres?erreur=mdp-court");
  if (next !== confirm) redirect("/admin/parametres?erreur=mdp-differents");
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
    redirect("/admin/parametres?erreur=mdp-actuel");
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 12) },
  });
  redirect("/admin/parametres?ok=mdp");
}
