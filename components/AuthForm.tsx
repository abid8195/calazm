"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Something went wrong.");
      return;
    }
    router.push(mode === "signup" ? "/onboarding" : "/today");
  }

  return (
    <main className="max-w-sm mx-auto px-6 pt-16">
      <Link href="/" className="text-xl font-bold tracking-tight" style={{ color: "var(--brand)" }}>
        calazm
      </Link>
      <h1 className="text-2xl font-bold mt-8">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
      <p className="text-sm mt-1 mb-6" style={{ color: "var(--muted)" }}>
        {mode === "signup" ? "Two minutes to your first AI meal scan." : "Sign in to keep Calazm learning."}
      </p>
      <form onSubmit={submit} className="grid gap-3">
        {mode === "signup" && (
          <input className="input" placeholder="First name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <input className="input" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          className="input"
          type="password"
          required
          minLength={8}
          placeholder="Password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p className="text-sm" style={{ color: "var(--carbs)" }}>
            {error}
          </p>
        )}
        <button className="btn btn-brand mt-2" disabled={busy}>
          {busy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>
      <p className="text-sm mt-6" style={{ color: "var(--muted)" }}>
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium" style={{ color: "var(--brand)" }}>
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to Calazm?{" "}
            <Link href="/signup" className="font-medium" style={{ color: "var(--brand)" }}>
              Create an account
            </Link>
          </>
        )}
      </p>
    </main>
  );
}
