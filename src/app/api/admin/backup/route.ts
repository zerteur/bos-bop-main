import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    await requireSession(); // Ensure only admins can download the DB!
    
    const dbPath = path.join(process.cwd(), "prisma", "bosbop.db");
    
    if (!fs.existsSync(dbPath)) {
      return new NextResponse("Database file not found", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(dbPath);
    
    const date = new Date().toISOString().split('T')[0];
    
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Content-Disposition": `attachment; filename="bosbop-backup-${date}.db"`,
      },
    });
  } catch (error) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
}
