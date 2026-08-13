import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/session";
import { json } from "@/lib/api";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const user = await prisma.user.findUnique({ where: { email: (email ?? "").toLowerCase() } });
  if (!user || !(await bcrypt.compare(password ?? "", user.passwordHash))) {
    return json({ error: "Invalid email or password." }, 401);
  }
  await setSession(user.id);
  return json({ ok: true });
}
