import { App, getAllTags, normalizePath } from "obsidian";
import type { DailyBriefSettings } from "./settings";
import { findMission, type CsTopic, type Mission } from "./cs-knowledge";

export interface ConceptNote {
  title: string;
  path: string;
  tags: string[]; // '#' 제거된 형태
  headings: string[];
  sizeBytes: number;
}

export interface GapResult {
  mission: Mission | undefined;
  notesScanned: number;
  uncovered: CsTopic[]; // 아직 노트가 없는 주제
  covered: CsTopic[];
  thin: ConceptNote[]; // 내용이 얇아 보강이 필요한 노트
  review: ConceptNote[]; // 복습 태그가 붙은 노트
}

/** 설정(폴더/태그/전체)에 따라 개념 노트 인벤토리를 만든다. */
export function collectConceptNotes(
  app: App,
  settings: DailyBriefSettings,
  excludePath: string | null
): ConceptNote[] {
  const folder = settings.conceptFolder.trim()
    ? normalizePath(settings.conceptFolder.trim())
    : "";
  const wantTag = settings.conceptTag.trim().replace(/^#/, "").toLowerCase();

  const out: ConceptNote[] = [];
  for (const file of app.vault.getMarkdownFiles()) {
    if (excludePath && file.path === excludePath) continue;
    if (folder && !(file.path === folder || file.path.startsWith(folder + "/")))
      continue;

    const cache = app.metadataCache.getFileCache(file);
    const tags = (cache ? getAllTags(cache) ?? [] : []).map((t) =>
      t.replace(/^#/, "").toLowerCase()
    );

    if (wantTag && !tags.includes(wantTag)) continue;

    out.push({
      title: file.basename,
      path: file.path,
      tags,
      headings: (cache?.headings ?? []).map((h) => h.heading),
      sizeBytes: file.stat.size,
    });
  }
  return out;
}

/** 미션 CS 주제 ↔ 개념 노트 대조. */
export function analyzeGaps(
  notes: ConceptNote[],
  missionId: string,
  settings: DailyBriefSettings
): GapResult {
  const mission = findMission(missionId);
  const result: GapResult = {
    mission,
    notesScanned: notes.length,
    uncovered: [],
    covered: [],
    thin: [],
    review: [],
  };
  if (!mission) return result;

  const haystacks = notes.map((n) =>
    [n.title, n.headings.join(" "), n.tags.join(" ")].join(" ").toLowerCase()
  );

  for (const topic of mission.topics) {
    const keywords = (topic.keywords ?? tokenizeTitle(topic.title)).map((k) =>
      k.toLowerCase()
    );
    const covered = haystacks.some((h) =>
      keywords.some((k) => keywordMatches(h, k))
    );
    (covered ? result.covered : result.uncovered).push(topic);
  }

  const reviewTag = settings.reviewTag.trim().replace(/^#/, "").toLowerCase();
  for (const n of notes) {
    if (n.sizeBytes < settings.thinNoteBytes) result.thin.push(n);
    if (reviewTag && n.tags.includes(reviewTag)) result.review.push(n);
  }
  // 얇은 노트는 작은 순으로
  result.thin.sort((a, b) => a.sizeBytes - b.sizeBytes);

  return result;
}

/**
 * 키워드 매칭.
 *  - 영어/ASCII 키워드: 단어 경계(\b) 매칭 → 'rest'가 'RestControllerAdvice'에 안 걸림.
 *    (한글은 \w가 아니라서 'jwt토큰'의 jwt는 정상 매칭됨)
 *  - 한글 포함 키워드: 합성어 매칭이 필요하므로 부분 문자열 매칭 유지.
 * haystack/kw 모두 소문자라고 가정.
 */
function keywordMatches(haystack: string, kw: string): boolean {
  if (/^[\x00-\x7f]+$/.test(kw)) {
    const re = new RegExp(`\\b${escapeRegExp(kw)}\\b`);
    return re.test(haystack);
  }
  return haystack.includes(kw);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenizeTitle(title: string): string[] {
  // 괄호/구분기호 제거 후 의미있는 토큰만
  return title
    .replace(/\(.*?\)/g, " ")
    .split(/[\s—\-·/,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && !/^(vs|및|와|과|의)$/i.test(s));
}
