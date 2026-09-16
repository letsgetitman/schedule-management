"use client";

import { useEffect, useState } from "react";

type CoupleInfo = {
  id: string;
  inviteCode: string;
  partner: { id: string; name: string } | null;
} | null;

export default function SettingsPage() {
  const [couple, setCouple] = useState<CoupleInfo>(null);
  const [inviteInput, setInviteInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/couple");
    if (res.ok) {
      const body = await res.json();
      setCouple(body.couple);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount is intentional
    load();
  }, []);

  async function createCouple() {
    setError(null);
    const res = await fetch("/api/couple", { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "생성에 실패했습니다.");
      return;
    }
    load();
  }

  async function joinCouple(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/couple/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: inviteInput }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "연결에 실패했습니다.");
      return;
    }
    setInviteInput("");
    load();
  }

  if (loading) return <p className="text-sm text-black/40">불러오는 중...</p>;

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-lg font-semibold">커플 연결</h1>

      {couple ? (
        <div className="space-y-2 rounded-lg border border-black/10 p-4 text-sm">
          {couple.partner ? (
            <p>
              <strong>{couple.partner.name}</strong>님과 연결되어 일정 / 맛집을
              공유하고 있습니다.
            </p>
          ) : (
            <>
              <p>아직 파트너가 연결되지 않았습니다. 아래 초대 코드를 공유하세요.</p>
              <p className="rounded-md bg-black/5 px-3 py-2 font-mono text-base">
                {couple.inviteCode}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={createCouple}
            className="w-full rounded-md bg-black py-2 text-sm text-white"
          >
            초대 코드 만들기
          </button>

          <form onSubmit={joinCouple} className="flex gap-2">
            <input
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="상대방의 초대 코드 입력"
              className="flex-1 rounded-md border border-black/15 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md border border-black/15 px-3 py-2 text-sm"
            >
              연결
            </button>
          </form>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
