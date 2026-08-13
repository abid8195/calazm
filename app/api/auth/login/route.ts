import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/session";
import { json } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const rl = rateLimit(`login:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) return json({ error: `Too many attempts — try again in ${rl.retryAfterS}s.` }, 429);
  const { email, password } = await req.json();
  const user = await prisma.user.findUnique({ where: { email: (email ?? "").toLowerCase() } });
  if (!user || !(await bcrypt.compare(password ?? "", user.passwordHash))) {
    return json({ error: "Invalid email or password." }, 401);
  }
  await setSession(user.id);
  return json({ ok: true });
}
