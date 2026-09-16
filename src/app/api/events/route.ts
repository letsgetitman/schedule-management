import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  date: z.string(), // ISO date, e.g. "2026-09-16"
  startTime: z.string(), // "HH:mm"
  endTime: z.string(),
  category: z.enum(["DATE", "PERSONAL", "WORK", "HEALTH", "ETC"]).default("PERSONAL"),
  tag: z.string().optional(),
  isShared: z.boolean().default(false),
});

// Lists events visible to the current user (their own events, plus shared
// couple events) within a [start, end] date range.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json(
      { error: "start, end 쿼리 파라미터가 필요합니다." },
      { status: 400 },
    );
  }

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });

  const events = await prisma.event.findMany({
    where: {
      date: { gte: new Date(start), lte: new Date(end) },
      OR: [
        { authorId: session.user.id },
        ...(me?.coupleId
          ? [{ coupleId: me.coupleId, isShared: true }]
          : []),
      ],
    },
    include: { author: { select: { id: true, name: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });

  const event = await prisma.event.create({
    data: {
      ...parsed.data,
      date: new Date(parsed.data.date),
      authorId: session.user.id,
      coupleId: me?.coupleId ?? null,
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
