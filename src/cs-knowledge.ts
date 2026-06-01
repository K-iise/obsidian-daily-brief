/**
 * CS 지식베이스 — 우테코 미션별로 "지금 이 미션에서 중요한 CS 주제"를 큐레이션.
 *
 * 참조 레포는 한국 개발자들이 운영하는 대표적인 CS/면접 정리 저장소들.
 * (출처: zerozero7bang.tistory.com/44 및 GitHub 검색)
 */

export interface CsRef {
  label: string;
  url: string;
}

export interface CsTopic {
  /** 안정적인 식별자 — 진도 추적용 */
  id: string;
  title: string;
  /** 왜 이 미션에서 중요한가 */
  why: string;
  /** 오늘 해볼 만한 작은 액션 */
  task: string;
  refs: CsRef[];
  /** 보관함 개념노트 갭 분석용 매칭 키워드 (제목/태그/헤딩에서 검색) */
  keywords?: string[];
}

export interface Mission {
  id: string;
  label: string;
  summary: string;
  topics: CsTopic[];
  /**
   * 인덱스 레포 안에서 이 미션의 노트가 모여 있는 경로 접두사.
   * 예: "레벨2/spring-roomescape" → admin/member/waiting 전부 매칭.
   * 없으면 GitHub 노트 소스는 이 미션을 건너뜀.
   */
  notesPrefix?: string;
}

/** 대표 참조 레포 (주제 태그 포함) — 링크 재사용용 */
export const REPOS = {
  gyoogle: {
    label: "gyoogle/tech-interview-for-developer",
    url: "https://github.com/gyoogle/tech-interview-for-developer",
  },
  backendInterview: {
    label: "ksundong/backend-interview-question",
    url: "https://github.com/ksundong/backend-interview-question",
  },
  seogeurim: {
    label: "Seogeurim/CS-study",
    url: "https://github.com/Seogeurim/CS-study",
  },
  weareSoft: {
    label: "WeareSoft/tech-interview",
    url: "https://github.com/WeareSoft/tech-interview",
  },
  jaeyeop: {
    label: "JaeYeopHan/Interview_Question_for_Beginner",
    url: "https://github.com/JaeYeopHan/Interview_Question_for_Beginner",
  },
  teachYourself: {
    label: "minnsane/TeachYourselfCS-KR",
    url: "https://github.com/minnsane/TeachYourselfCS-KR",
  },
  devSquad: {
    label: "devSquad-study/2023-CS-Study",
    url: "https://github.com/devSquad-study/2023-CS-Study",
  },
} satisfies Record<string, CsRef>;

// ---------------------------------------------------------------------------
// 방탈출 예약 (Spring 웹) — 현재 미션. CS 주제는 중요도(=우선순위) 순.
// ---------------------------------------------------------------------------
const roomEscape: Mission = {
  id: "room-escape-reservation",
  label: "방탈출 예약 (웹)",
  summary:
    "Spring MVC로 예약 시스템을 만드는 미션. HTTP/REST·계층형 아키텍처·트랜잭션·동시성·인증이 핵심.",
  notesPrefix: "레벨2/spring-roomescape",
  topics: [
    {
      id: "concurrency-double-booking",
      title: "동시성 제어 — 중복 예약 방지 (낙관적 락 vs 비관적 락)",
      why:
        "예약 시스템의 본질적 난제. 두 요청이 같은 시간대를 동시에 예약하면 더블 부킹이 난다. 트랜잭션만으로는 막지 못하고 락 전략 또는 유니크 제약이 필요.",
      task:
        "같은 (테마, 날짜, 시간)에 동시 예약이 들어오는 상황을 가정해 DB 유니크 제약 + 낙관적 락 중 어떤 걸 쓸지 한 단락으로 정리.",
      refs: [REPOS.backendInterview, REPOS.gyoogle],
      keywords: ["동시성", "락", "낙관적", "비관적", "concurrency", "중복 예약"],
    },
    {
      id: "transaction-acid",
      title: "트랜잭션과 격리 수준 (ACID, @Transactional)",
      why:
        "예약 생성/취소는 원자적이어야 하고, 동시 접근 시 격리 수준에 따라 팬텀 리드 등이 생긴다. @Transactional의 전파/롤백 동작 이해가 곧 데이터 정합성.",
      task:
        "READ COMMITTED와 REPEATABLE READ에서 예약 조회→생성 사이에 일어날 수 있는 이상 현상 비교.",
      refs: [REPOS.backendInterview, REPOS.gyoogle],
      keywords: ["트랜잭션", "transaction", "ACID", "격리", "isolation", "Transactional"],
    },
    {
      id: "http-methods-status",
      title: "HTTP 메서드와 상태 코드 (멱등성)",
      why:
        "예약 생성(POST)·조회(GET)·취소(DELETE)를 의미에 맞게 설계해야 한다. 멱등성을 이해하면 '재시도 시 중복 예약' 문제를 메서드 차원에서 줄일 수 있다.",
      task:
        "내 API에서 POST/PUT/DELETE의 멱등성 여부를 표로 정리하고, 201/204/409를 언제 쓸지 적기.",
      refs: [REPOS.gyoogle, REPOS.jaeyeop],
      keywords: ["HTTP", "멱등", "idempotent", "상태 코드", "메서드", "status code"],
    },
    {
      id: "rest-api-design",
      title: "REST API 설계 (자원 모델링, URI)",
      why:
        "/reservations, /times, /themes 처럼 자원 중심으로 URI를 설계해야 확장이 쉽다. 미션 리뷰에서 가장 많이 지적받는 부분.",
      task: "내 컨트롤러의 URI를 자원 명사 기준으로 다시 점검(동사 들어간 곳 찾기).",
      refs: [REPOS.backendInterview, REPOS.weareSoft],
      keywords: ["REST", "RESTful", "API 설계", "URI", "자원", "resource"],
    },
    {
      id: "auth-cookie-session-jwt",
      title: "인증/인가 — 쿠키 vs 세션 vs JWT",
      why:
        "방탈출 미션 후반에 로그인·관리자 권한 단계가 나온다. 쿠키에 무엇을 담고 어디서 검증하는지, JWT의 stateless 특성과 트레이드오프 이해 필요.",
      task: "세션 기반과 JWT 기반 로그인의 서버 저장 상태 차이를 3줄로 비교.",
      refs: [REPOS.gyoogle, REPOS.backendInterview],
      keywords: ["인증", "권한", "쿠키", "세션", "JWT", "auth", "session", "cookie"],
    },
    {
      id: "layered-architecture",
      title: "계층형 아키텍처 (Controller-Service-Repository)",
      why:
        "관심사 분리가 곧 테스트 용이성. 비즈니스 로직이 컨트롤러로 새지 않게 하는 것이 리뷰 핵심 포인트.",
      task: "Service에 있어야 할 로직이 Controller에 남아있지 않은지 한 클래스 점검.",
      refs: [REPOS.backendInterview, REPOS.seogeurim],
      keywords: ["계층", "아키텍처", "layered", "Controller", "Service", "Repository", "관심사 분리"],
    },
    {
      id: "db-index-normalization",
      title: "DB 인덱스와 정규화",
      why:
        "예약 조회 쿼리(테마·날짜 기준)가 잦으므로 인덱스 설계가 성능을 좌우한다. 정규화/반정규화 트레이드오프도 이때 체득.",
      task: "예약 조회에서 가장 자주 쓰는 WHERE 조건에 맞는 복합 인덱스 후보 적기.",
      refs: [REPOS.gyoogle, REPOS.devSquad],
      keywords: ["인덱스", "index", "정규화", "normalization", "복합 인덱스"],
    },
  ],
};

// ---------------------------------------------------------------------------
// 다른 미션들 (간단 버전) — 나중에 채워나갈 수 있게 스텁
// ---------------------------------------------------------------------------
const racingLotto: Mission = {
  id: "racing-lotto",
  label: "자동차 경주 / 로또",
  summary: "객체지향 입문 미션. 단위 테스트·원시값 포장·일급 컬렉션·객체 분리 중심.",
  topics: [
    {
      id: "oop-encapsulation",
      title: "캡슐화와 객체 분리",
      why: "원시값을 객체로 포장하고 책임을 나누는 연습이 미션의 본질.",
      task: "한 클래스의 getter 노출을 줄이고 행위 메서드로 바꿀 곳 1군데 찾기.",
      refs: [REPOS.seogeurim, REPOS.gyoogle],
    },
    {
      id: "unit-test",
      title: "단위 테스트와 경계값",
      why: "테스트 가능한 설계가 곧 좋은 객체 설계. JUnit/AssertJ로 경계값 검증.",
      task: "예외 상황(빈 입력, 범위 초과)에 대한 테스트 1개 추가.",
      refs: [REPOS.jaeyeop, REPOS.seogeurim],
    },
  ],
};

const ladderBlackjack: Mission = {
  id: "ladder-blackjack",
  label: "사다리타기 / 블랙잭",
  summary: "자료구조와 상태 관리. 그래프/스택, 일급 컬렉션, 다형성 중심.",
  notesPrefix: "레벨1/java-blackjack",
  topics: [
    {
      id: "data-structure",
      title: "자료구조 선택 (List/Map/Stack)",
      why: "사다리 연결·카드 덱 표현에 맞는 자료구조 선택이 코드 품질을 결정.",
      task: "현재 컬렉션을 다른 자료구조로 바꾸면 생기는 트레이드오프 메모.",
      refs: [REPOS.gyoogle, REPOS.seogeurim],
    },
    {
      id: "polymorphism-state",
      title: "다형성과 상태 패턴",
      why: "블랙잭의 Hit/Stay/Bust 상태를 분기문 대신 다형성으로 표현.",
      task: "if/switch로 상태 분기하는 곳을 enum/클래스로 바꿀 후보 찾기.",
      refs: [REPOS.seogeurim, REPOS.weareSoft],
    },
  ],
};

const chess: Mission = {
  id: "chess",
  label: "체스 / 장기",
  summary: "도메인 모델링과 영속성. 다형성·DB 연동(JDBC) 중심.",
  notesPrefix: "레벨1/java-janggi",
  topics: [
    {
      id: "domain-modeling",
      title: "도메인 모델링",
      why: "말의 이동 규칙을 다형성으로 표현하는 깊은 OOP 연습.",
      task: "기물별 이동 규칙을 공통 추상화로 묶을 수 있는지 검토.",
      refs: [REPOS.seogeurim, REPOS.gyoogle],
    },
    {
      id: "persistence-jdbc",
      title: "영속성과 JDBC",
      why: "게임 상태를 DB에 저장/복원. 커넥션·트랜잭션 기초 체득.",
      task: "체스 상태 저장 스키마를 정규화 관점에서 점검.",
      refs: [REPOS.gyoogle, REPOS.backendInterview],
    },
  ],
};

export const MISSIONS: Mission[] = [
  roomEscape,
  racingLotto,
  ladderBlackjack,
  chess,
];

export function findMission(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id);
}
