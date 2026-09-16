import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ inviteCode: z.string().min(1) });

// Joins an existing couple (created by the partner) using their invite code.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (me?.coupleId) {
    return NextResponse.json(
      { error: "이미 커플에 연결되어 있습니다." },
      { status: 409 },
    );
  }

  const couple = await prisma.couple.findUnique({
    where: { inviteCode: parsed.data.inviteCode },
    include: { users: true },
  });
  if (!couple) {
    return NextResponse.json(
      { error: "초대 코드를 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  if (couple.users.length >= 2) {
    return NextResponse.json(
      { error: "이미 두 명이 연결된 커플입니다." },
      { status: 409 },
    );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { coupleId: couple.id },
  });

  return NextResponse.json({ ok: true });
}
