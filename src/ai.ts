import { requestUrl } from "obsidian";
import { execFile } from "child_process";
import { tmpdir } from "os";
import type { DailyBriefSettings } from "./settings";
import type { GapResult, ConceptNote } from "./learning";

/**
 * Anthropic Messages API를 obsidian requestUrl로 직접 호출 (SDK 미사용 → 번들 가벼움 + CORS 우회).
 *
 * 프롬프트 캐싱: 안정적인 시스템 프롬프트에 cache_control(ephemeral)을 건다.
 * (단, opus 계열 최소 캐시 프리픽스는 ~4096토큰이라 이 정도 짧은 프롬프트는 실제로는
 *  캐시에 안 올라갈 수 있다. 구조는 올바르게 둔다.)
 *
 * thinking은 생략(=off). off일 때 opus-4-8이 본문에 사고과정을 길게 쓰는 경향이 있어
 * 시스템 프롬프트에 "최종 답만" 지시를 넣어 억제한다.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = [
  "너는 우아한테크코스 수강생의 학습 멘토다.",
  "현재 미션, 그 미션에서 중요한 CS 주제(노트 있음/없음), 내용이 얕아 보강이 필요한 노트, 학습자의 개념 노트 목록, 그리고 '참고 링크' 목록을 받는다.",
  "학습 정도에 맞춰 '다음에 학습하면 좋을 것' 3가지를 우선순위 순으로 추천한다.",
  "우선순위 기준: (1) 아직 노트가 없는 핵심 주제를 먼저, (2) 노트는 있으나 얕은 주제는 '심화'로, (3) 이미 충분히 정리된 주제는 추천하지 말 것.",
  "각 추천 형식(한 줄): `- **제목** — 왜 지금 중요한지 한 문장. 📎 [링크제목](URL)`",
  "링크 규칙: 반드시 아래 '참고 링크' 목록에 주어진 URL만 사용한다. 적절한 링크가 없으면 링크를 생략한다. URL을 절대 새로 지어내지 마라.",
  "출력은 한국어 마크다운 불릿 3줄만. 서론/맺음말/사고과정 없이 최종 추천만.",
].join("\n");

export interface AiContext {
  missionLabel: string;
  uncoveredTitles: string[];
  coveredTitles: string[];
  thinNoteTitles: string[];
  noteTitles: string[];
  recentKeywords: string[];
  topicLinks: { title: string; urls: string[] }[];
}

export function buildAiContext(
  gap: GapResult,
  notes: ConceptNote[],
  recentKeywords: string[]
): AiContext {
  const topicLinks = (gap.mission?.topics ?? []).map((t) => ({
    title: t.title,
    urls: (t.sites && t.sites.length ? t.sites : t.refs).map((r) => r.url),
  }));
  return {
    missionLabel: gap.mission?.label ?? "(미설정)",
    uncoveredTitles: gap.uncovered.map((t) => t.title),
    coveredTitles: gap.covered.map((t) => t.title),
    thinNoteTitles: gap.thin.map((n) => n.title).slice(0, 10),
    noteTitles: notes.map((n) => n.title).slice(0, 100),
    recentKeywords,
    topicLinks,
  };
}

function userContent(ctx: AiContext): string {
  const lines: string[] = [];
  lines.push(`현재 미션: ${ctx.missionLabel}`);
  lines.push("");
  lines.push(`아직 노트가 없는 CS 주제: ${listOrNone(ctx.uncoveredTitles)}`);
  lines.push(`이미 노트가 있는 CS 주제: ${listOrNone(ctx.coveredTitles)}`);
  lines.push(`내용이 얕아 보강(심화)이 필요한 노트: ${listOrNone(ctx.thinNoteTitles)}`);
  if (ctx.recentKeywords.length) {
    lines.push(`최근 학습로그 키워드: ${ctx.recentKeywords.join(", ")}`);
  }
  lines.push("");
  lines.push("내 개념 노트 제목 목록:");
  lines.push(listOrNone(ctx.noteTitles));
  lines.push("");
  lines.push("참고 링크 (이 URL들만 사용 가능):");
  if (ctx.topicLinks.length) {
    for (const t of ctx.topicLinks) {
      if (t.urls.length) lines.push(`- ${t.title}: ${t.urls.join(" , ")}`);
    }
  } else {
    lines.push("(없음)");
  }
  return lines.join("\n");
}

function listOrNone(arr: string[]): string {
  return arr.length ? arr.join(", ") : "(없음)";
}

export async function recommendNextLearning(
  settings: DailyBriefSettings,
  ctx: AiContext
): Promise<string> {
  if (!settings.anthropicApiKey) {
    throw new Error("Anthropic API 키가 설정되지 않았습니다.");
  }

  const body = {
    model: settings.aiModel || "claude-opus-4-8",
    max_tokens: 2000,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: userContent(ctx),
      },
    ],
  };

  const res = await requestUrl({
    url: ANTHROPIC_URL,
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": settings.anthropicApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
    throw: false,
  });

  if (res.status >= 400) {
    const msg = extractError(res.text);
    throw new Error(`HTTP ${res.status} — ${msg}`);
  }

  const json = res.json as {
    content?: Array<{ type: string; text?: string }>;
    usage?: { cache_read_input_tokens?: number; input_tokens?: number };
  };
  const text = (json.content ?? [])
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("\n")
    .trim();

  return text || "(추천 내용을 받지 못했습니다.)";
}

/**
 * 구독 기반 — 로컬에 설치된 `claude` CLI(Claude Code)를 호출.
 * Pro/Max 구독 로그인을 그대로 쓰므로 API 키·종량제 결제가 필요 없다. (Claudian과 동일 방식)
 * - 중립 디렉토리(tmp)에서 실행해 CLAUDE.md 등 프로젝트 컨텍스트 오염 방지
 * - --system-prompt로 기본 코딩 에이전트 프롬프트를 교체, 도구는 전부 비활성화
 */
export function recommendViaCli(
  settings: DailyBriefSettings,
  ctx: AiContext
): Promise<string> {
  const cli = settings.claudeCliPath || "claude";
  const model = settings.aiModel || "opus";
  const args = [
    "-p",
    userContent(ctx),
    "--model",
    model,
    "--system-prompt",
    SYSTEM_PROMPT,
    "--disallowedTools",
    "Bash Edit Write Read Glob Grep WebFetch WebSearch",
    "--output-format",
    "text",
  ];

  return new Promise<string>((resolve, reject) => {
    execFile(
      cli,
      args,
      { cwd: tmpdir(), timeout: 120000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          const hint =
            (err as NodeJS.ErrnoException).code === "ENOENT"
              ? `claude CLI를 찾을 수 없습니다 (경로: ${cli}). 설정에서 절대경로를 지정하세요.`
              : stderr?.trim() || err.message;
          reject(new Error(hint));
          return;
        }
        const out = (stdout || "").trim();
        if (/not logged in|please run \/login|invalid api key/i.test(out)) {
          reject(
            new Error(
              "claude CLI가 로그인되어 있지 않습니다. 터미널에서 `claude` 실행 후 로그인(/login)하거나, 백엔드를 'API 키'로 바꾸세요."
            )
          );
          return;
        }
        resolve(out || "(추천 내용을 받지 못했습니다.)");
      }
    );
  });
}

function extractError(raw: string): string {
  try {
    const j = JSON.parse(raw);
    return j?.error?.message ?? raw.slice(0, 200);
  } catch {
    return raw.slice(0, 200);
  }
}
