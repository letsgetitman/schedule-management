import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  address: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  naverPlaceId: z.string().optional(),
  memo: z.string().optional(),
});

// Lists restaurants visible to the current user: their own pins, plus
// couple pins if they've joined a couple.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });

  const restaurants = await prisma.restaurant.findMany({
    where: {
      OR: [
        { addedById: session.user.id },
        ...(me?.coupleId ? [{ coupleId: me.coupleId }] : []),
      ],
    },
    include: { addedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ restaurants });
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

  const restaurant = await prisma.restaurant.create({
    data: {
      ...parsed.data,
      addedById: session.user.id,
      coupleId: me?.coupleId ?? null,
    },
  });

  return NextResponse.json({ restaurant }, { status: 201 });
}
