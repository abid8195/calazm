import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/session";
import { json } from "@/lib/api";

export async function POST(req: Request) {
  const { email, password, name } = await req.json();
  if (!email || !password || password.length < 8) {
    return json({ error: "Email and a password of at least 8 characters are required." }, 400);
  }
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return json({ error: "An account with this email already exists." }, 409);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      name: name || null,
      subscription: { create: { plan: "free" } },
    },
  });
  await setSession(user.id);
  return json({ ok: true });
}
