import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email");

  if (!email) return new NextResponse("Email manquant", { status: 400 });

  await prisma.customer.update({
    where: { email },
    data: { optIn: false }
  }).catch(() => {});

  return new NextResponse(`
    <html>
      <head>
        <title>Désinscription - BOS & BOP</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f4f5f8; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); text-align: center; max-width: 400px; border-top: 4px solid #ddc076; }
          h2 { color: #1f2430; margin-top: 0; }
          p { color: #6b7280; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Désinscription confirmée</h2>
          <p>L'adresse <strong>\${email}</strong> a bien été retirée de notre liste de diffusion.</p>
          <p style="font-size: 13px; margin-top: 20px;">Vous pouvez fermer cette page.</p>
        </div>
      </body>
    </html>
  `, { headers: { "Content-Type": "text/html" } });
}
