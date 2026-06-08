import type { CsRef } from "./cs-knowledge";

/**
 * CS 기초 질문 풀 — jwasham/coding-interview-university 커리큘럼 기반.
 * 미션과 무관한 컴퓨터 사이언스 기본기(자료구조/알고리즘/OS/네트워크 등).
 * 매일 회전하며 인터뷰식 질문 + 힌트 + 참고 링크를 던진다.
 */

export const CIU: CsRef = {
  label: "coding-interview-university",
  url: "https://github.com/jwasham/coding-interview-university",
};

export interface FundTopic {
  id: string;
  title: string;
  questions: string[];
  hint: string;
  sites: CsRef[]; // CIU는 항상 뒤에 붙이므로 여기엔 canonical 문서만
}

const W = (label: string, slug: string): CsRef => ({
  label,
  url: `https://en.wikipedia.org/wiki/${slug}`,
});

export const FUNDAMENTALS: FundTopic[] = [
  {
    id: "big-o",
    title: "시간/공간 복잡도 (Big-O)",
    questions: [
      "Big-O, Big-Θ, Big-Ω의 차이는? 보통 면접에서 왜 Big-O만 말할까?",
      "O(n log n)이 나오는 대표적 상황은? 분할정복과의 관계를 설명해보라.",
      "amortized(상환) 분석이란? 동적 배열 append가 O(1) amortized인 이유는?",
    ],
    hint: "최악/평균/최선을 구분하고, 입력이 2배가 될 때 연산량 변화를 그려보세요.",
    sites: [W("Big-O notation (Wikipedia)", "Big_O_notation")],
  },
  {
    id: "array-dynamic",
    title: "배열과 동적 배열",
    questions: [
      "동적 배열은 어떻게 커지나? resize 시 비용과 amortized 복잡도는?",
      "배열 vs 연결 리스트: 임의 접근/삽입/삭제 비용을 비교해보라.",
    ],
    hint: "메모리 연속성과 캐시 지역성이 성능에 주는 영향을 떠올리세요.",
    sites: [W("Dynamic array (Wikipedia)", "Dynamic_array")],
  },
  {
    id: "linked-list",
    title: "연결 리스트",
    questions: [
      "단일/이중 연결 리스트의 차이와 각 장단점은?",
      "연결 리스트에서 사이클을 어떻게 탐지할까? (느린/빠른 포인터)",
    ],
    hint: "포인터 조작 순서를 그림으로 그리며 따라가 보세요.",
    sites: [W("Linked list (Wikipedia)", "Linked_list")],
  },
  {
    id: "stack-queue",
    title: "스택과 큐",
    questions: [
      "스택(LIFO)/큐(FIFO)는 각각 어디에 쓰나? 실제 예를 들어보라.",
      "배열과 연결 리스트 중 무엇으로 큐를 구현하는 게 좋을까?",
    ],
    hint: "함수 호출 스택, BFS 큐 같은 실사용 예부터 떠올리세요.",
    sites: [W("Stack (Wikipedia)", "Stack_%28abstract_data_type%29")],
  },
  {
    id: "hash-table",
    title: "해시 테이블",
    questions: [
      "해시 충돌은 어떻게 해결하나? (체이닝 vs 오픈 어드레싱)",
      "평균 O(1) 조회인데 최악이 O(n)이 되는 이유는?",
      "좋은 해시 함수의 조건은 무엇일까?",
    ],
    hint: "load factor와 리해싱(resize) 시점을 함께 생각하세요.",
    sites: [W("Hash table (Wikipedia)", "Hash_table")],
  },
  {
    id: "tree-bst",
    title: "트리 / 이진 탐색 트리",
    questions: [
      "BST의 탐색/삽입이 평균 O(log n)인데 최악 O(n)이 되는 경우는?",
      "균형 트리(AVL, Red-Black)는 왜 필요한가?",
      "전위/중위/후위 순회는 각각 언제 쓰나?",
    ],
    hint: "한쪽으로 치우친(skewed) 트리를 그려보면 최악 케이스가 보입니다.",
    sites: [W("Binary search tree (Wikipedia)", "Binary_search_tree")],
  },
  {
    id: "heap",
    title: "힙 / 우선순위 큐",
    questions: [
      "힙으로 우선순위 큐를 만들면 push/pop 복잡도는?",
      "힙 정렬은 어떻게 동작하나? 안정 정렬인가?",
    ],
    hint: "완전 이진 트리를 배열로 표현하는 방식부터 정리하세요.",
    sites: [W("Heap (Wikipedia)", "Heap_%28data_structure%29")],
  },
  {
    id: "graph",
    title: "그래프",
    questions: [
      "인접 행렬 vs 인접 리스트: 공간/탐색 비용을 비교해보라.",
      "BFS와 DFS는 각각 어떤 문제에 적합한가?",
      "다익스트라가 음수 간선에서 실패하는 이유는?",
    ],
    hint: "그래프 표현 방식 선택이 알고리즘 복잡도를 좌우합니다.",
    sites: [W("Graph (Wikipedia)", "Graph_%28abstract_data_type%29")],
  },
  {
    id: "sorting",
    title: "정렬 알고리즘",
    questions: [
      "퀵정렬 vs 병합정렬: 복잡도·안정성·메모리를 비교해보라.",
      "퀵정렬의 최악이 O(n²)인 경우와 회피법은?",
      "안정 정렬(stable sort)이 왜 중요할 때가 있을까?",
    ],
    hint: "평균/최악 복잡도와 추가 메모리(in-place 여부)를 표로 정리하세요.",
    sites: [W("Sorting algorithm (Wikipedia)", "Sorting_algorithm")],
  },
  {
    id: "binary-search",
    title: "이진 탐색",
    questions: [
      "이진 탐색의 전제 조건은? 흔한 off-by-one 버그는 어디서 나나?",
      "lower_bound/upper_bound(경계 탐색)는 어떻게 구현하나?",
    ],
    hint: "left/right/mid 갱신과 종료 조건을 정확히 적어보세요.",
    sites: [W("Binary search (Wikipedia)", "Binary_search_algorithm")],
  },
  {
    id: "dynamic-programming",
    title: "동적 계획법 (DP)",
    questions: [
      "메모이제이션(top-down)과 타뷸레이션(bottom-up)의 차이는?",
      "어떤 문제가 DP로 풀리나? (최적 부분구조·중복 부분문제)",
    ],
    hint: "점화식과 상태 정의부터 적은 뒤 작은 예제로 검증하세요.",
    sites: [W("Dynamic programming (Wikipedia)", "Dynamic_programming")],
  },
  {
    id: "process-thread",
    title: "프로세스와 스레드 (OS)",
    questions: [
      "프로세스와 스레드의 차이는? 무엇을 공유하고 무엇을 따로 갖나?",
      "컨텍스트 스위칭 비용은 왜 발생하나?",
      "데드락의 4가지 조건과 회피 방법은?",
    ],
    hint: "주소 공간/스택/힙 중 무엇이 공유되는지부터 구분하세요.",
    sites: [W("Thread (Wikipedia)", "Thread_%28computing%29")],
  },
  {
    id: "network-tcp-http",
    title: "네트워크 (TCP/IP·HTTP)",
    questions: [
      "TCP와 UDP의 차이는? 각각 언제 쓰나?",
      "TCP 3-way handshake는 왜 필요한가?",
      "HTTPS에서 TLS 핸드셰이크는 대략 어떻게 동작하나?",
    ],
    hint: "신뢰성/순서보장/혼잡제어가 필요한지로 TCP vs UDP를 가르세요.",
    sites: [W("Internet protocol suite (Wikipedia)", "Internet_protocol_suite")],
  },
];
