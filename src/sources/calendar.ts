import { requestUrl } from "obsidian";
import ICAL from "ical.js";
import type { BriefItem, BriefSection, BriefSource } from "../types";
import type { DailyBriefSettings } from "../settings";

/**
 * Google Calendar(또는 임의 캘린더)의 비밀 ICS URL을 읽어 '오늘 일정'을 표시.
 * - OAuth 불필요(읽기 전용 비공개 iCal 주소)
 * - 반복 일정(RRULE)은 ical.js로 오늘 범위만 전개
 */
export class CalendarSource implements BriefSource {
  constructor(private settings: DailyBriefSettings) {}

  async collect(): Promise<BriefSection> {
    const section: BriefSection = {
      title: "오늘 일정",
      emoji: "📅",
      items: [],
      emptyText: "오늘 일정이 없습니다.",
    };

    if (!this.settings.calendarEnabled || !this.settings.calendarIcsUrl) {
      return { ...section, items: [] }; // 미설정이면 섹션 숨김
    }

    let text: string;
    try {
      const res = await requestUrl({
        url: this.settings.calendarIcsUrl,
        throw: false,
      });
      if (res.status >= 400) {
        section.items.push({ text: `⚠️ 캘린더 조회 실패: HTTP ${res.status}` });
        return section;
      }
      text = res.text;
    } catch (e) {
      section.items.push({ text: `⚠️ 캘린더 조회 실패: ${(e as Error).message}` });
      return section;
    }

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    let occs: Array<{ start: Date; end: Date; allDay: boolean; summary: string }>;
    try {
      occs = expandToday(text, dayStart, dayEnd);
    } catch (e) {
      section.items.push({ text: `⚠️ 캘린더 파싱 실패: ${(e as Error).message}` });
      return section;
    }

    occs.sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1; // 종일 먼저
      return a.start.getTime() - b.start.getTime();
    });

    const items: BriefItem[] = occs
      .slice(0, this.settings.calendarMaxEvents || 15)
      .map((o, i) => ({
        text: o.allDay
          ? `🗓️ 종일 — ${escapeMd(o.summary)}`
          : `${hhmm(o.start)} ${escapeMd(o.summary)}${durationHint(o)}`,
        priority: i,
        key: `cal:${o.start.toISOString()}:${o.summary}`,
      }));

    section.items = items;
    return section;
  }
}

function expandToday(
  ics: string,
  dayStart: Date,
  dayEnd: Date
): Array<{ start: Date; end: Date; allDay: boolean; summary: string }> {
  const jcal = ICAL.parse(ics);
  const comp = new ICAL.Component(jcal);
  const vevents = comp.getAllSubcomponents("vevent");
  const out: Array<{ start: Date; end: Date; allDay: boolean; summary: string }> = [];

  const overlaps = (s: Date, e: Date) =>
    s.getTime() < dayEnd.getTime() && e.getTime() > dayStart.getTime();

  for (const ve of vevents) {
    let event: ICAL.Event;
    try {
      event = new ICAL.Event(ve);
    } catch {
      continue;
    }
    const summary = event.summary || "(제목 없음)";

    if (event.isRecurring()) {
      const it = event.iterator();
      let next: ICAL.Time | null;
      let guard = 0;
      while ((next = it.next()) && guard++ < 5000) {
        const occStart = next.toJSDate();
        if (occStart.getTime() >= dayEnd.getTime()) break; // 오늘 이후 → 중단
        const details = event.getOccurrenceDetails(next);
        const s = details.startDate.toJSDate();
        const e = details.endDate.toJSDate();
        if (overlaps(s, e)) {
          out.push({ start: s, end: e, allDay: isAllDay(details.startDate), summary });
        }
      }
    } else {
      const s = event.startDate.toJSDate();
      const e = event.endDate.toJSDate();
      if (overlaps(s, e)) {
        out.push({ start: s, end: e, allDay: isAllDay(event.startDate), summary });
      }
    }
  }
  return out;
}

function isAllDay(t: ICAL.Time): boolean {
  // date-only(시간 없음) 이면 종일
  return (t as unknown as { isDate?: boolean }).isDate === true;
}

function hhmm(d: Date): string {
  const p = (n: number) => (n < 10 ? "0" + n : String(n));
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

function durationHint(o: { start: Date; end: Date }): string {
  const mins = Math.round((o.end.getTime() - o.start.getTime()) / 60000);
  if (mins <= 0 || mins >= 24 * 60) return "";
  if (mins < 60) return ` _(${mins}m)_`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? ` _(${h}h${m}m)_` : ` _(${h}h)_`;
}

function escapeMd(s: string): string {
  return s.replace(/[\[\]]/g, "");
}
