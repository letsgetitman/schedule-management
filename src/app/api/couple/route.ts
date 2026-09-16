import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Returns the current user's couple, including the partner (if joined).
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { couple: { include: { users: true } } },
  });

  if (!user?.couple) {
    return NextResponse.json({ couple: null });
  }

  const partner = user.couple.users.find((u) => u.id !== user.id) ?? null;

  return NextResponse.json({
    couple: {
      id: user.couple.id,
      inviteCode: user.couple.inviteCode,
      partner: partner ? { id: partner.id, name: partner.name } : null,
    },
  });
}

// Creates a new couple and assigns the current user to it, returning an
// invite code the partner can use to join.
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const existing = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (existing?.coupleId) {
    return NextResponse.json(
      { error: "이미 커플에 연결되어 있습니다." },
      { status: 409 },
    );
  }

  const couple = await prisma.couple.create({
    data: { users: { connect: { id: session.user.id } } },
  });

  return NextResponse.json({ couple });
}
