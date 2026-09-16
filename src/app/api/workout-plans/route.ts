import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  weekStartDate: z.string(), // ISO date of the Monday for that week
  exercise: z.string().min(1),
  targetSets: z.number().int().min(1),
  targetReps: z.number().int().min(1),
  targetWeight: z.number().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get("weekStart");
  if (!weekStart) {
    return NextResponse.json({ error: "weekStart가 필요합니다." }, { status: 400 });
  }

  const plans = await prisma.workoutPlan.findMany({
    where: { userId: session.user.id, weekStartDate: new Date(weekStart) },
    orderBy: { exercise: "asc" },
  });

  return NextResponse.json({ plans });
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

  const plan = await prisma.workoutPlan.create({
    data: {
      ...parsed.data,
      weekStartDate: new Date(parsed.data.weekStartDate),
      userId: session.user.id,
    },
  });

  return NextResponse.json({ plan }, { status: 201 });
}
