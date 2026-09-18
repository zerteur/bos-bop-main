import { prisma } from "@/lib/db";
import { getSetting, setSetting } from "@/lib/settings";

export async function recordUniqueOpen(subject: string, user: string) {
  if (!subject || !user) return;

  const key = `opens:${subject}`;
  let openedList: string[] = [];

  try {
    const listStr = await getSetting(key, "[]");
    openedList = JSON.parse(listStr);
  } catch {
    openedList = [];
  }

  if (openedList.includes(user)) return;

  openedList.push(user);
  await setSetting(key, JSON.stringify(openedList));

  const today = new Date().toISOString().split("T")[0];
  const path = `email:${subject}`;

  await prisma.trafficStat
    .upsert({
      where: { date_path: { date: today, path } },
      create: { date: today, path, views: 1, humanViews: 1, duration: 0 },
      update: { views: { increment: 1 }, humanViews: { increment: 1 } },
    })
    .catch(() => {});
}
