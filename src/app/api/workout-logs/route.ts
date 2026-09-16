import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  date: z.string(),
  exercise: z.string().min(1),
  actualSets: z.number().int().min(1),
  actualReps: z.number().int().min(1),
  actualWeight: z.number().optional(),
});

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

  const logs = await prisma.workoutLog.findMany({
    where: {
      userId: session.user.id,
      date: { gte: new Date(start), lte: new Date(end) },
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ logs });
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

  const log = await prisma.workoutLog.create({
    data: {
      ...parsed.data,
      date: new Date(parsed.data.date),
      userId: session.user.id,
    },
  });

  return NextResponse.json({ log }, { status: 201 });
}
