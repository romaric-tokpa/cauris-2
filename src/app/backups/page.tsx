import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import BackupsClient from "./BackupsClient";

export const dynamic = "force-dynamic";

export default async function BackupsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <BackupsClient />;
}
