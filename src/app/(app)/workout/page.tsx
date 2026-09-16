"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, startOfWeek, endOfWeek, addWeeks } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Plan = {
  id: string;
  exercise: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number | null;
};

type Log = {
  id: string;
  date: string;
  exercise: string;
  actualSets: number;
  actualReps: number;
  actualWeight: number | null;
};

export default function WorkoutPage() {
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [plans, setPlans] = useState<Plan[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);

  const weekStart = useMemo(
    () => startOfWeek(weekAnchor, { weekStartsOn: 1 }),
    [weekAnchor],
  );
  const weekEnd = useMemo(
    () => endOfWeek(weekAnchor, { weekStartsOn: 1 }),
    [weekAnchor],
  );

  const loadData = useCallback(async () => {
    const [planRes, logRes] = await Promise.all([
      fetch(`/api/workout-plans?weekStart=${format(weekStart, "yyyy-MM-dd")}`),
      fetch(
        `/api/workout-logs?start=${format(weekStart, "yyyy-MM-dd")}&end=${format(
          weekEnd,
          "yyyy-MM-dd",
        )}`,
      ),
    ]);
    if (planRes.ok) setPlans((await planRes.json()).plans);
    if (logRes.ok) setLogs((await logRes.json()).logs);
  }, [weekStart, weekEnd]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount/deps-change is intentional
    loadData();
  }, [loadData]);

  const chartData = useMemo(() => {
    const exercises = new Set<string>([
      ...plans.map((p) => p.exercise),
      ...logs.map((l) => l.exercise),
    ]);
    return Array.from(exercises).map((exercise) => {
      const plan = plans.find((p) => p.exercise === exercise);
      const actualVolume = logs
        .filter((l) => l.exercise === exercise)
        .reduce((sum, l) => sum + l.actualSets * l.actualReps, 0);
      return {
        exercise,
        계획: plan ? plan.targetSets * plan.targetReps : 0,
        실제: actualVolume,
      };
    });
  }, [plans, logs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setWeekAnchor((d) => addWeeks(d, -1))}
          className="rounded-md border border-black/15 px-2 py-1"
        >
          이전 주
        </button>
        <span className="font-medium">
          {format(weekStart, "MM.dd")} - {format(weekEnd, "MM.dd")}
        </span>
        <button
          onClick={() => setWeekAnchor((d) => addWeeks(d, 1))}
          className="rounded-md border border-black/15 px-2 py-1"
        >
          다음 주
        </button>
        <button
          onClick={() => setWeekAnchor(new Date())}
          className="rounded-md border border-black/15 px-2 py-1 text-sm"
        >
          이번 주
        </button>
      </div>

      <div className="h-72 rounded-lg border border-black/10 p-3">
        {chartData.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-black/40">
            이번 주 계획/기록이 아직 없습니다.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="exercise" />
              <YAxis
                label={{
                  value: "세트 x 횟수",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip />
              <Legend />
              <Bar dataKey="계획" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="실제" fill="#0f172a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <PlanForm weekStart={weekStart} onCreated={loadData} />
        <LogForm weekStart={weekStart} onCreated={loadData} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-medium">이번 주 계획</h2>
          <ul className="space-y-1 text-sm">
            {plans.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-md border border-black/10 px-3 py-2"
              >
                <span>
                  {p.exercise}: {p.targetSets}세트 x {p.targetReps}회
                  {p.targetWeight ? ` @ ${p.targetWeight}kg` : ""}
                </span>
                <button
                  onClick={async () => {
                    await fetch(`/api/workout-plans/${p.id}`, {
                      method: "DELETE",
                    });
                    loadData();
                  }}
                  className="text-xs text-black/40 hover:text-red-600"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-2 font-medium">이번 주 기록</h2>
          <ul className="space-y-1 text-sm">
            {logs.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between rounded-md border border-black/10 px-3 py-2"
              >
                <span>
                  {format(new Date(l.date), "MM.dd")} {l.exercise}:{" "}
                  {l.actualSets}세트 x {l.actualReps}회
                  {l.actualWeight ? ` @ ${l.actualWeight}kg` : ""}
                </span>
                <button
                  onClick={async () => {
                    await fetch(`/api/workout-logs/${l.id}`, {
                      method: "DELETE",
                    });
                    loadData();
                  }}
                  className="text-xs text-black/40 hover:text-red-600"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function PlanForm({
  weekStart,
  onCreated,
}: {
  weekStart: Date;
  onCreated: () => void;
}) {
  const [exercise, setExercise] = useState("");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/workout-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStartDate: format(weekStart, "yyyy-MM-dd"),
        exercise,
        targetSets: sets,
        targetReps: reps,
        targetWeight: weight ? Number(weight) : undefined,
      }),
    });
    setExercise("");
    onCreated();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 rounded-lg border border-black/10 p-3 text-sm"
    >
      <h3 className="font-medium">이번 주 목표 추가</h3>
      <input
        required
        placeholder="운동 이름 (예: 벤치프레스)"
        value={exercise}
        onChange={(e) => setExercise(e.target.value)}
        className="w-full rounded-md border border-black/15 px-2 py-1"
      />
      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          value={sets}
          onChange={(e) => setSets(Number(e.target.value))}
          className="w-full rounded-md border border-black/15 px-2 py-1"
          placeholder="세트"
        />
        <input
          type="number"
          min={1}
          value={reps}
          onChange={(e) => setReps(Number(e.target.value))}
          className="w-full rounded-md border border-black/15 px-2 py-1"
          placeholder="횟수"
        />
        <input
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="w-full rounded-md border border-black/15 px-2 py-1"
          placeholder="kg (선택)"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-md bg-black py-1.5 text-white"
      >
        목표 추가
      </button>
    </form>
  );
}

function LogForm({
  weekStart,
  onCreated,
}: {
  weekStart: Date;
  onCreated: () => void;
}) {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [exercise, setExercise] = useState("");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/workout-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        exercise,
        actualSets: sets,
        actualReps: reps,
        actualWeight: weight ? Number(weight) : undefined,
      }),
    });
    setExercise("");
    onCreated();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 rounded-lg border border-black/10 p-3 text-sm"
    >
      <h3 className="font-medium">오늘 수행 기록</h3>
      <input
        type="date"
        value={date}
        min={format(weekStart, "yyyy-MM-dd")}
        onChange={(e) => setDate(e.target.value)}
        className="w-full rounded-md border border-black/15 px-2 py-1"
      />
      <input
        required
        placeholder="운동 이름"
        value={exercise}
        onChange={(e) => setExercise(e.target.value)}
        className="w-full rounded-md border border-black/15 px-2 py-1"
      />
      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          value={sets}
          onChange={(e) => setSets(Number(e.target.value))}
          className="w-full rounded-md border border-black/15 px-2 py-1"
          placeholder="세트"
        />
        <input
          type="number"
          min={1}
          value={reps}
          onChange={(e) => setReps(Number(e.target.value))}
          className="w-full rounded-md border border-black/15 px-2 py-1"
          placeholder="횟수"
        />
        <input
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="w-full rounded-md border border-black/15 px-2 py-1"
          placeholder="kg (선택)"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-md bg-black py-1.5 text-white"
      >
        기록 추가
      </button>
    </form>
  );
}
