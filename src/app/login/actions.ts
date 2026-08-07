"use server";

import { redirect } from "next/navigation";
import { checkPassword, createSession, LoginLockedError } from "@/lib/auth";

export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  const password = String(formData.get("password") ?? "");
  try {
    if (!(await checkPassword(password))) {
      return { error: "Mot de passe incorrect." };
    }
  } catch (e) {
    if (e instanceof LoginLockedError) return { error: e.message };
    throw e;
  }
  await createSession();
  redirect("/");
}
