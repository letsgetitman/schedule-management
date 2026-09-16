"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";

type Category = "DATE" | "PERSONAL" | "WORK" | "HEALTH" | "ETC";

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  startTime: string;
  endTime: string;
  category: Category;
  tag: string | null;
  completed: boolean;
  isShared: boolean;
  author: { id: string; name: string };
};

const CATEGORY_LABEL: Record<Category, string> = {
  DATE: "데이트",
  PERSONAL: "개인",
  WORK: "일",
  HEALTH: "헬스",
  ETC: "기타",
};

const CATEGORY_COLOR: Record<Category, string> = {
  DATE: "bg-pink-100 text-pink-800 border-pink-300",
  PERSONAL: "bg-blue-100 text-blue-800 border-blue-300",
  WORK: "bg-amber-100 text-amber-800 border-amber-300",
  HEALTH: "bg-emerald-100 text-emerald-800 border-emerald-300",
  ETC: "bg-gray-100 text-gray-800 border-gray-300",
};

type ViewMode = "month" | "week" | "day";

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 - 23:00

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => {
    if (view === "month") {
      return {
        start: startOfWeek(startOfMonth(anchor)),
        end: endOfWeek(endOfMonth(anchor)),
      };
    }
    if (view === "week") {
      return { start: startOfWeek(anchor), end: endOfWeek(anchor) };
    }
    return { start: anchor, end: anchor };
  }, [view, anchor]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      start: format(range.start, "yyyy-MM-dd"),
      end: format(range.end, "yyyy-MM-dd"),
    });
    const res = await fetch(`/api/events?${params}`);
    if (res.ok) {
      const body = await res.json();
      setEvents(body.events);
    }
    setLoading(false);
  }, [range.start, range.end]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount/deps-change is intentional
    loadEvents();
  }, [loadEvents]);

  function eventsOn(day: Date) {
    return events.filter((e) => isSameDay(new Date(e.date), day));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-black/10 p-1">
          {(["month", "week", "day"] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 text-sm ${
                view === v ? "bg-black text-white" : "text-black/60"
              }`}
            >
              {v === "month" ? "월간" : v === "week" ? "주간" : "일간"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              setAnchor((d) =>
                view === "month"
                  ? addMonths(d, -1)
                  : view === "week"
                    ? addWeeks(d, -1)
                    : addDays(d, -1),
              )
            }
            className="rounded-md border border-black/15 px-2 py-1"
          >
            이전
          </button>
          <span className="min-w-[9rem] text-center font-medium">
            {view === "day"
              ? format(anchor, "yyyy.MM.dd (EEE)")
              : format(anchor, "yyyy.MM")}
          </span>
          <button
            onClick={() =>
              setAnchor((d) =>
                view === "month"
                  ? addMonths(d, 1)
                  : view === "week"
                    ? addWeeks(d, 1)
                    : addDays(d, 1),
              )
            }
            className="rounded-md border border-black/15 px-2 py-1"
          >
            다음
          </button>
          <button
            onClick={() => setAnchor(new Date())}
            className="rounded-md border border-black/15 px-2 py-1 text-sm"
          >
            오늘
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-black/40">불러오는 중...</p>}

      {view === "month" && (
        <MonthGrid
          anchor={anchor}
          range={range}
          eventsOn={eventsOn}
          onSelectDay={(d) => {
            setAnchor(d);
            setView("day");
          }}
        />
      )}

      {view === "week" && (
        <WeekGrid
          range={range}
          eventsOn={eventsOn}
          onSelectDay={(d) => {
            setAnchor(d);
            setView("day");
          }}
        />
      )}

      {view === "day" && (
        <DayTimeline
          day={anchor}
          events={eventsOn(anchor)}
          onChanged={loadEvents}
        />
      )}
    </div>
  );
}

function MonthGrid({
  anchor,
  range,
  eventsOn,
  onSelectDay,
}: {
  anchor: Date;
  range: { start: Date; end: Date };
  eventsOn: (d: Date) => CalendarEvent[];
  onSelectDay: (d: Date) => void;
}) {
  const days: Date[] = [];
  for (let d = range.start; d <= range.end; d = addDays(d, 1)) days.push(d);

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-black/10 bg-black/10 text-sm">
      {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
        <div key={d} className="bg-white p-2 text-center font-medium">
          {d}
        </div>
      ))}
      {days.map((day) => {
        const dayEvents = eventsOn(day);
        return (
          <button
            key={day.toISOString()}
            onClick={() => onSelectDay(day)}
            className={`flex min-h-24 flex-col gap-1 bg-white p-2 text-left ${
              isSameMonth(day, anchor) ? "" : "text-black/30"
            } ${isSameDay(day, new Date()) ? "ring-2 ring-inset ring-black" : ""}`}
          >
            <span className="text-xs">{format(day, "d")}</span>
            <div className="flex flex-wrap gap-1">
              {dayEvents.slice(0, 3).map((e) => (
                <span
                  key={e.id}
                  className={`w-full truncate rounded border px-1 text-[10px] ${CATEGORY_COLOR[e.category]}`}
                >
                  {e.title}
                </span>
              ))}
              {dayEvents.length > 3 && (
                <span className="text-[10px] text-black/40">
                  +{dayEvents.length - 3}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function WeekGrid({
  range,
  eventsOn,
  onSelectDay,
}: {
  range: { start: Date; end: Date };
  eventsOn: (d: Date) => CalendarEvent[];
  onSelectDay: (d: Date) => void;
}) {
  const days: Date[] = [];
  for (let d = range.start; d <= range.end; d = addDays(d, 1)) days.push(d);

  return (
    <div className="grid grid-cols-7 gap-3">
      {days.map((day) => (
        <button
          key={day.toISOString()}
          onClick={() => onSelectDay(day)}
          className={`flex min-h-40 flex-col gap-1 rounded-lg border border-black/10 p-2 text-left ${
            isSameDay(day, new Date()) ? "ring-2 ring-black" : ""
          }`}
        >
          <span className="text-xs font-medium">{format(day, "EEE d")}</span>
          {eventsOn(day).map((e) => (
            <span
              key={e.id}
              className={`truncate rounded border px-1 py-0.5 text-[11px] ${CATEGORY_COLOR[e.category]}`}
            >
              {e.startTime} {e.title}
            </span>
          ))}
        </button>
      ))}
    </div>
  );
}

function DayTimeline({
  day,
  events,
  onChanged,
}: {
  day: Date;
  events: CalendarEvent[];
  onChanged: () => void;
}) {
  const [showForm, setShowForm] = useState(false);

  async function toggleComplete(e: CalendarEvent) {
    await fetch(`/api/events/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !e.completed }),
    });
    onChanged();
  }

  async function removeEvent(id: string) {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1 space-y-1">
        {HOURS.map((hour) => {
          const hourEvents = events.filter(
            (e) => parseInt(e.startTime.split(":")[0], 10) === hour,
          );
          return (
            <div key={hour} className="flex gap-3 border-t border-black/5 py-1">
              <span className="w-12 shrink-0 text-xs text-black/40">
                {String(hour).padStart(2, "0")}:00
              </span>
              <div className="flex-1 space-y-1">
                {hourEvents.map((e) => (
                  <div
                    key={e.id}
                    className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 ${CATEGORY_COLOR[e.category]} ${
                      e.completed ? "opacity-50 line-through" : ""
                    }`}
                  >
                    <label className="flex flex-1 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={e.completed}
                        onChange={() => toggleComplete(e)}
                      />
                      <span className="font-medium">
                        {e.startTime}-{e.endTime} {e.title}
                      </span>
                      {e.tag && (
                        <span className="rounded bg-white/60 px-1.5 text-[11px]">
                          #{e.tag}
                        </span>
                      )}
                      {e.isShared && (
                        <span className="text-[11px] text-black/50">공유됨</span>
                      )}
                    </label>
                    <button
                      onClick={() => removeEvent(e.id)}
                      className="text-xs text-black/40 hover:text-red-600"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="w-72 shrink-0">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="w-full rounded-md bg-black py-2 text-sm text-white"
        >
          {showForm ? "닫기" : "+ 일정 추가"}
        </button>
        {showForm && (
          <NewEventForm
            day={day}
            onCreated={() => {
              setShowForm(false);
              onChanged();
            }}
          />
        )}
      </div>
    </div>
  );
}

function NewEventForm({
  day,
  onCreated,
}: {
  day: Date;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [category, setCategory] = useState<Category>("PERSONAL");
  const [tag, setTag] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        date: format(day, "yyyy-MM-dd"),
        startTime,
        endTime,
        category,
        tag: tag || undefined,
        isShared,
      }),
    });
    setSubmitting(false);
    onCreated();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-2 rounded-lg border border-black/10 p-3 text-sm"
    >
      <input
        required
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-black/15 px-2 py-1"
      />
      <div className="flex gap-2">
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="w-full rounded-md border border-black/15 px-2 py-1"
        />
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="w-full rounded-md border border-black/15 px-2 py-1"
        />
      </div>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as Category)}
        className="w-full rounded-md border border-black/15 px-2 py-1"
      >
        {Object.entries(CATEGORY_LABEL).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
      <input
        placeholder="태그 (예: 운동, 준비물)"
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        className="w-full rounded-md border border-black/15 px-2 py-1"
      />
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isShared}
          onChange={(e) => setIsShared(e.target.checked)}
        />
        여자친구와 공유
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-black py-1.5 text-white disabled:opacity-50"
      >
        추가
      </button>
    </form>
  );
}
