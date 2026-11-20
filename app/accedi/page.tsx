"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function AccediPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Email o password non corrette.");
      return;
    }
    router.push("/admin");
  }

  return (
    <main className="mx-auto max-w-sm px-6 pb-20 pt-32">
      <h1 className="text-3xl font-semibold">Accesso</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <input
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none focus:border-white/60"
        />
        <input
          required
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none focus:border-white/60"
        />
        {error && <p className="text-amber-300">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
        >
          {loading ? "Accesso in corso…" : "Accedi"}
        </button>
      </form>
    </main>
  );
}