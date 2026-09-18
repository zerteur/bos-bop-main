import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function optOut(email: string | null) {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  if (!normalized.includes("@")) return false;
  await prisma.customer
    .update({
      where: { email: normalized },
      data: { optIn: false },
    })
    .catch(() => {});
  return true;
}

function confirmationPage(email: string) {
  const safe = escapeHtml(email);
  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <title>Désinscription — BOS &amp; BOP</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f4f5f8; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
      .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: center; max-width: 400px; border-top: 4px solid #ddc076; }
      h1 { color: #1f2430; margin-top: 0; font-size: 22px; }
      p { color: #6b7280; line-height: 1.5; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Désinscription confirmée</h1>
      <p>L'adresse <strong>${safe}</strong> a bien été retirée de notre liste de diffusion.</p>
      <p style="font-size: 13px; margin-top: 20px;">Vous pouvez fermer cette page.</p>
    </div>
  </body>
</html>`;
}

export async function GET(request: NextRequest) {
  const email = new URL(request.url).searchParams.get("email");
  if (!email) return new NextResponse("Email manquant", { status: 400 });
  await optOut(email);
  return new NextResponse(confirmationPage(email), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

/** RFC 8058 — désinscription en un clic depuis Gmail / Outlook. */
export async function POST(request: NextRequest) {
  const email = new URL(request.url).searchParams.get("email");
  if (!(await optOut(email))) return new NextResponse("Email manquant", { status: 400 });
  return new NextResponse(null, { status: 200 });
}
