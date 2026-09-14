import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Pour préserver la rétrocompatibilité si un GET traîne
export async function GET(request: NextRequest) {
  return new NextResponse(Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"), {
    headers: { "Content-Type": "image/gif" },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const type = body.type;
    const id = Number(body.id);
    const duration = Number(body.duration) || 0;
    const isHuman = Boolean(body.isHuman);

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const path = String(body.path || "/");

    if (!type || isNaN(id)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }
    
    const safeDuration = Math.min(duration, 1800);

    // Update global counters on Page/Product
    const globalData = {
      viewCount: { increment: 1 },
      ...(isHuman ? {
        humanViewCount: { increment: 1 },
        totalTimeSeconds: { increment: safeDuration }
      } : {})
    };

    if (type === "page") {
      await prisma.page.update({ where: { id }, data: globalData }).catch(() => {});
    } else if (type === "product") {
      await prisma.product.update({ where: { id }, data: globalData }).catch(() => {});
    }

    // Update time-series (DailyStat)
    await prisma.trafficStat.upsert({
      where: {
        date_path: {
          date: today,
          path: path,
        }
      },
      create: {
        date: today,
        path: path,
        views: 1,
        humanViews: isHuman ? 1 : 0,
        duration: isHuman ? safeDuration : 0,
      },
      update: {
        views: { increment: 1 },
        humanViews: isHuman ? { increment: 1 } : undefined,
        duration: isHuman ? { increment: safeDuration } : undefined,
      }
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
