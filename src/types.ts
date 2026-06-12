export interface BriefItem {
  /** 짧은 한 줄 표시 — 마크다운 허용 (링크 등) */
  text: string;
  /** 우선순위: 낮을수록 위에 표시 */
  priority?: number;
  /** 마감일 ISO (있을 때만 정렬에 사용) */
  due?: string;
  /** 추적용 — 같은 항목 중복 방지 */
  key?: string;
  /** 들여쓰기 단계 (0=최상위). 중첩 불릿/체크박스 표현 */
  indent?: number;
  /** 체크박스 항목으로 렌더 (- [ ] ...) */
  checkbox?: boolean;
  /** 불릿 없는 일반 텍스트(캡션 등) */
  plain?: boolean;
}

export interface BriefSection {
  title: string;
  emoji: string;
  items: BriefItem[];
  /** 비어 있을 때 표시할 문구. 없으면 섹션 자체를 숨김 */
  emptyText?: string;
}

export interface BriefSource {
  /** 데일리 브리프의 한 섹션을 만들어 반환 */
  collect(): Promise<BriefSection>;
}
