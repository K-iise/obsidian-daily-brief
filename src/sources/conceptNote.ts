import { App, TFile, normalizePath, requestUrl } from "obsidian";
import type { BriefItem, BriefSection, BriefSource } from "../types";
import type { DailyBriefSettings } from "../settings";
import {
  BACKEND_CS,
  GYOOGLE_BRANCH,
  GYOOGLE_REPO,
  gyoogleUrl,
  type BackendTopic,
} from "../cs-backend";

/**
 * 오늘의 CS 개념 — gyoogle/tech-interview-for-developer(MIT) 원문을 가져와
 * 보관함에 개념 노트로 생성하고, 확인 질문(원문 헤딩 기반)을 던진다.
 *
 * 흐름: 자료를 먼저 읽게 하고 → 질문은 확인용.
 *  - 노트가 이미 있으면 덮어쓰지 않고 링크만 (사용자 정리 보존)
 *  - 상대경로 이미지는 raw.githubusercontent 절대경로로 보정
 */
export class ConceptNoteSource implements BriefSource {
  constructor(private app: App, private settings: DailyBriefSettings) {}

  async collect(): Promise<BriefSection> {
    const section: BriefSection = {
      title: "오늘의 CS 개념",
      emoji: "📖",
      items: [],
      emptyText: "",
    };
    if (!this.settings.gyoogleEnabled || BACKEND_CS.length === 0) {
      return { ...section, items: [] };
    }

    const doy = dayOfYear(new Date());
    const n = Math.min(this.settings.gyooglePerDay || 1, BACKEND_CS.length);
    const start = (doy * n) % BACKEND_CS.length;

    const items: BriefItem[] = [];
    for (let k = 0; k < n; k++) {
      const topic = BACKEND_CS[(start + k) % BACKEND_CS.length];
      try {
        const md = await this.fetchRaw(topic.path);
        const checks = extractChecks(md);
        const file = await this.ensureNote(topic, md, checks);

        items.push({
          text: `📖 [${topic.category}] **${topic.title}** → [[${file.basename}]] _(읽고 아래 확인)_`,
          priority: k * 10,
          key: `concept-note:${topic.id}`,
        });
        for (const c of checks.slice(0, 3)) {
          items.push({
            text: `${c} — 보지 않고 설명할 수 있다`,
            indent: 1,
            checkbox: true,
            priority: k * 10 + 2,
          });
        }
      } catch (e) {
        items.push({
          text: `⚠️ 개념 자료 가져오기 실패: ${(e as Error).message} — [원문](${gyoogleUrl(
            topic.path
          )})`,
          priority: k * 10,
        });
      }
    }

    section.items = items;
    return section;
  }

  private async fetchRaw(path: string): Promise<string> {
    const url = `https://raw.githubusercontent.com/${GYOOGLE_REPO}/${GYOOGLE_BRANCH}/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
    const res = await requestUrl({ url, throw: false });
    if (res.status >= 400) throw new Error(`HTTP ${res.status}`);
    return res.text;
  }

  /** 개념 노트 생성 — 이미 있으면 그대로 반환 (사용자 정리를 덮어쓰지 않음) */
  private async ensureNote(
    topic: BackendTopic,
    md: string,
    checks: string[]
  ): Promise<TFile> {
    const base = normalizePath(this.settings.gyoogleFolder || "CS 개념");
    // 카테고리별 하위 폴더로 분리 저장 (예: CS 개념/데이터베이스/Transaction.md)
    const folder = normalizePath(`${base}/${sanitizeName(topic.category)}`);
    await this.ensureFolder(base);
    await this.ensureFolder(folder);

    const path = normalizePath(`${folder}/${sanitizeName(topic.title)}.md`);
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) return existing;

    return await this.app.vault.create(path, buildNote(topic, md, checks));
  }

  private async ensureFolder(path: string): Promise<void> {
    if (!this.app.vault.getAbstractFileByPath(path)) {
      await this.app.vault.createFolder(path);
    }
  }
}

function buildNote(topic: BackendTopic, md: string, checks: string[]): string {
  const origin = gyoogleUrl(topic.path);
  const today = isoDate(new Date());
  const checkLines = checks
    .slice(0, 5)
    .map((c) => `- [ ] ${c} — 보지 않고 설명할 수 있다`)
    .join("\n");

  return [
    "---",
    `source: ${GYOOGLE_REPO} (MIT)`,
    `origin: ${origin}`,
    `category: ${topic.category}`,
    `created: ${today}`,
    "tags:",
    "  - cs-개념",
    "---",
    "",
    `> [!quote] 출처: [${GYOOGLE_REPO}](${origin}) (MIT License) — 학습용으로 가져온 자료입니다.`,
    "",
    fixRelativeImages(cleanMarkdown(md), topic.path),
    "",
    "---",
    "",
    "## ✅ 확인 질문",
    checkLines,
    "",
    "## ✍️ 내 정리",
    "",
    "",
  ].join("\n");
}

/**
 * 확인 질문 후보 — 원문 헤딩(##~####)에서 추출.
 * gyoogle 파일 포맷이 제각각(####만 쓰거나 h1+볼드만)이라 없으면 일반 질문 폴백.
 */
function extractChecks(md: string): string[] {
  const out: string[] = [];
  let inCode = false;
  for (const line of md.split("\n")) {
    if (/^\s*```/.test(line)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const m = line.match(/^#{2,4}\s+(.+?)\s*$/);
    if (!m) continue;
    const h = m[1].replace(/[*_`#\[\]]/g, "").trim();
    if (!h || h.length < 2) continue;
    if (/^(reference|참고|출처|예제|예시|기타)/i.test(h)) continue;
    out.push(h);
  }
  return out.length > 0
    ? out
    : ["핵심 개념", "장단점과 사용 시점", "면접 꼬리질문 1개에 대한 답"];
}

/**
 * gyoogle 원문을 옵시디언에서 읽기 좋게 정리.
 *  - <br> 태그 제거 (블록마다 박혀 있어 빈 줄이 과도해짐)
 *  - 첫 H1 제목 제거 (노트 파일명과 중복)
 *  - 헤딩 승격: 가장 얕은 헤딩이 ##가 되도록 (####만 쓰는 파일이 너무 작게 렌더되는 문제)
 *  - 연속 빈 줄 3개+ → 1개
 * 코드펜스(```) 안은 건드리지 않는다.
 */
function cleanMarkdown(md: string): string {
  const raw = md.split("\n").map((l) => l.replace(/<br\s*\/?>/gi, "").trimEnd());

  // 1) 최소 헤딩 레벨 계산 (첫 H1 제목 제외, 코드펜스 밖)
  let inCode = false;
  let titleSeen = false;
  const levels: number[] = [];
  for (const l of raw) {
    if (/^\s*```/.test(l)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const m = l.match(/^(#{1,6})\s+/);
    if (!m) continue;
    if (!titleSeen && m[1].length === 1) {
      titleSeen = true;
      continue;
    }
    levels.push(m[1].length);
  }
  const shift = levels.length ? Math.max(0, Math.min(...levels) - 2) : 0;

  // 2) 재구성 (제목 제거 + 헤딩 승격)
  inCode = false;
  titleSeen = false;
  const out: string[] = [];
  for (const l of raw) {
    if (/^\s*```/.test(l)) {
      inCode = !inCode;
      out.push(l);
      continue;
    }
    if (!inCode) {
      const hm = l.match(/^(#{1,6})(\s+.*)$/);
      if (hm) {
        if (!titleSeen && hm[1].length === 1) {
          titleSeen = true; // 첫 H1 제목 → 제거
          continue;
        }
        if (shift > 0) {
          const lvl = Math.max(2, hm[1].length - shift);
          out.push("#".repeat(lvl) + hm[2]);
          continue;
        }
      }
    }
    out.push(l);
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** 상대경로 이미지(md/img 태그)를 raw 절대경로로 보정 */
function fixRelativeImages(md: string, mdPath: string): string {
  const dir = mdPath.split("/").slice(0, -1).join("/");
  const abs = (rel: string): string => {
    const clean = rel.trim().replace(/^\.\//, "");
    const full = clean.startsWith("/")
      ? clean.slice(1)
      : dir
      ? `${dir}/${clean}`
      : clean;
    return `https://raw.githubusercontent.com/${GYOOGLE_REPO}/${GYOOGLE_BRANCH}/${full
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
  };
  return md
    .replace(
      /!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g,
      (_m, alt: string, rel: string) => `![${alt}](${abs(rel)})`
    )
    .replace(
      /<img([^>]*?)src="(?!https?:\/\/)([^"]+)"/g,
      (_m, pre: string, rel: string) => `<img${pre}src="${abs(rel)}"`
    );
}

function sanitizeName(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
}

function isoDate(d: Date): string {
  const p = (n: number) => (n < 10 ? "0" + n : String(n));
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}
