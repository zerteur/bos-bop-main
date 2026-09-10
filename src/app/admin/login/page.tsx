import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { loginAction } from "@/lib/admin-actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  if (await getSession()) redirect("/admin");
  const params = await searchParams;

  return (
    <div className="login-page">
      <div className="login-box">
        <h1>BOS &amp; BOP</h1>
        <p className="sous">Administration du site</p>
        {params.error && (
          <div className="notice erreur">Identifiants incorrects.</div>
        )}
        <form action={loginAction}>
          <input type="hidden" name="next" value={params.next ?? ""} />
          <label className="champ">
            Adresse email
            <input type="email" name="email" required autoFocus autoComplete="username" />
          </label>
          <label className="champ">
            Mot de passe
            <input type="password" name="password" required autoComplete="current-password" />
          </label>
          <button type="submit" className="btn principal">
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
}
