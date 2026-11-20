"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ReimpostaPasswordPage() {
  const router = useRouter();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
    });
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("La password deve avere almeno 8 caratteri.");
      return;
    }
    if (password !== repeat) {
      setError("Le due password non coincidono.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("Non è stato possibile salvare la password. Richiedi un nuovo link.");
      return;
    }
    await supabase.auth.signOut();
    router.push("/accedi");
  }

  if (hasSession === null) {
    return <main className="mx-auto max-w-sm px-6 pb-20 pt-32 text-white/70">Caricamento…</main>;
  }

  if (!hasSession) {
    return (
      <main className="mx-auto max-w-sm space-y-4 px-6 pb-20 pt-32">
        <h1 className="text-3xl font-semibold">Link non valido</h1>
        <p className="text-white/70">
          Il link è scaduto o è già stato usato. Richiedi un nuovo link di recupero password.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm px-6 pb-20 pt-32">
      <h1 className="text-3xl font-semibold">Nuova password</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <input
          required
          type="password"
          placeholder="Nuova password (minimo 8 caratteri)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none focus:border-white/60"
        />
        <input
          required
          type="password"
          placeholder="Ripeti la password"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 outline-none focus:border-white/60"
        />
        {error && <p className="text-amber-300">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
        >
          {loading ? "Salvataggio…" : "Salva password"}
        </button>
      </form>
    </main>
  );
}