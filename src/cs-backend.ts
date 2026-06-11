/**
 * 백엔드 CS 지식 풀 — gyoogle/tech-interview-for-developer 기반.
 * 신입 백엔드 개발자가 알면 좋은 주제만 선별 (프론트/모바일/언어별 C·JS 등 제외).
 * 하루 하나씩 회전하며 주제 + gyoogle 원문 링크를 던져 정리하게 한다.
 */

export const GYOOGLE_REPO = "gyoogle/tech-interview-for-developer";
export const GYOOGLE_BRANCH = "master";

export interface BackendTopic {
  id: string;
  category: string;
  title: string;
  path: string; // 레포 내 원문 경로 (렌더 시 URL 인코딩)
}

// [category, title, repo-path]
const RAW: Array<[string, string, string]> = [
  // 자료구조
  ["자료구조", "Array vs ArrayList vs LinkedList", "Computer Science/Data Structure/Array vs ArrayList vs LinkedList.md"],
  ["자료구조", "Hash", "Computer Science/Data Structure/Hash.md"],
  ["자료구조", "Binary Search Tree", "Computer Science/Data Structure/Binary Search Tree.md"],
  ["자료구조", "Heap", "Computer Science/Data Structure/Heap.md"],
  ["자료구조", "B Tree & B+ Tree", "Computer Science/Data Structure/B Tree & B+ Tree.md"],
  ["자료구조", "Stack & Queue", "Computer Science/Data Structure/Stack & Queue.md"],
  ["자료구조", "Trie", "Computer Science/Data Structure/Trie.md"],

  // 알고리즘
  ["알고리즘", "Binary Search", "Algorithm/Binary Search.md"],
  ["알고리즘", "DFS & BFS", "Algorithm/DFS & BFS.md"],
  ["알고리즘", "QuickSort", "Algorithm/QuickSort.md"],
  ["알고리즘", "MergeSort", "Algorithm/MergeSort.md"],
  ["알고리즘", "동적 계획법 (DP)", "Algorithm/동적 계획법 (Dynamic Programming).md"],
  ["알고리즘", "다익스트라 (Dijkstra)", "Algorithm/다익스트라(Dijkstra).md"],

  // 운영체제
  ["운영체제", "Process vs Thread", "Computer Science/Operating System/Process vs Thread.md"],
  ["운영체제", "CPU Scheduling", "Computer Science/Operating System/CPU Scheduling.md"],
  ["운영체제", "DeadLock", "Computer Science/Operating System/DeadLock.md"],
  ["운영체제", "Semaphore & Mutex", "Computer Science/Operating System/Semaphore & Mutex.md"],
  ["운영체제", "Paging & Segmentation", "Computer Science/Operating System/Paging and Segmentation.md"],
  ["운영체제", "PCB & Context Switching", "Computer Science/Operating System/PCB & Context Switcing.md"],
  ["운영체제", "Page Replacement Algorithm", "Computer Science/Operating System/Page Replacement Algorithm.md"],
  ["운영체제", "Memory", "Computer Science/Operating System/Memory.md"],
  ["운영체제", "IPC", "Computer Science/Operating System/IPC(Inter Process Communication).md"],
  ["운영체제", "Race Condition", "Computer Science/Operating System/Race Condition.md"],
  ["운영체제", "Process Address Space", "Computer Science/Operating System/Process Address Space.md"],

  // 데이터베이스
  ["데이터베이스", "Transaction", "Computer Science/Database/Transaction.md"],
  ["데이터베이스", "Transaction Isolation Level", "Computer Science/Database/Transaction Isolation Level.md"],
  ["데이터베이스", "Index", "Computer Science/Database/[DB] Index.md"],
  ["데이터베이스", "Anomaly", "Computer Science/Database/[DB] Anomaly.md"],
  ["데이터베이스", "정규화 (Normalization)", "Computer Science/Database/정규화(Normalization).md"],
  ["데이터베이스", "Key", "Computer Science/Database/[DB] Key.md"],
  ["데이터베이스", "JOIN", "Computer Science/Database/[Database SQL] JOIN.md"],
  ["데이터베이스", "SQL vs NoSQL", "Computer Science/Database/SQL과 NOSQL의 차이.md"],
  ["데이터베이스", "Redis", "Computer Science/Database/Redis.md"],
  ["데이터베이스", "SQL Injection", "Computer Science/Database/SQL Injection.md"],

  // 네트워크
  ["네트워크", "HTTP & HTTPS", "Computer Science/Network/HTTP & HTTPS.md"],
  ["네트워크", "TCP 3·4 way handshake", "Computer Science/Network/TCP 3 way handshake & 4 way handshake.md"],
  ["네트워크", "TCP 흐름제어·혼잡제어", "Computer Science/Network/TCP (흐름제어혼잡제어).md"],
  ["네트워크", "UDP", "Computer Science/Network/UDP.md"],
  ["네트워크", "OSI 7 계층", "Computer Science/Network/OSI 7 계층.md"],
  ["네트워크", "DNS", "Computer Science/Network/DNS.md"],
  ["네트워크", "TLS Handshake", "Computer Science/Network/TLS HandShake.md"],
  ["네트워크", "대칭키 & 공개키", "Computer Science/Network/대칭키 & 공개키.md"],
  ["네트워크", "로드 밸런싱", "Computer Science/Network/로드 밸런싱(Load Balancing).md"],
  ["네트워크", "Blocking/Non-blocking & Sync/Async", "Computer Science/Network/[Network] Blocking,Non-blocking & Synchronous,Asynchronous.md"],

  // Java
  ["Java", "JVM (자바 가상 머신)", "Language/[java] 자바 가상 머신(Java Virtual Machine).md"],
  ["Java", "Call by value vs reference", "Language/[java] Call by value와 Call by reference.md"],
  ["Java", "Java에서의 Thread", "Language/[java] Java에서의 Thread.md"],
  ["Java", "Stream", "Language/[java] Stream.md"],
  ["Java", "String / StringBuilder / StringBuffer", "Language/[java] String StringBuilder StringBuffer 차이.md"],
  ["Java", "직렬화 (Serialization)", "Language/[Java] 직렬화(Serialization).md"],
  ["Java", "Composition", "Language/[Java] 컴포지션(Composition).md"],

  // Spring / 웹 백엔드
  ["Spring", "Spring MVC", "Web/Spring/Spring MVC.md"],
  ["Spring", "JPA", "Web/Spring/JPA.md"],
  ["Spring", "Spring Security (인증/인가)", "Web/Spring/Spring Security - Authentication and Authorization.md"],
  ["웹", "Cookie & Session", "Web/Cookie & Session.md"],
  ["웹", "JWT", "Web/JWT(JSON Web Token).md"],
  ["웹", "OAuth", "Web/OAuth.md"],
  ["웹", "HTTP status code", "Web/HTTP status code.md"],
  ["웹", "HTTP Request Methods", "Web/HTTP Request Methods.md"],
  ["웹", "CSRF & XSS", "Web/CSRF & XSS.md"],

  // 디자인 패턴
  ["디자인패턴", "SOLID", "Design Pattern/SOLID.md"],
  ["디자인패턴", "Singleton", "Design Pattern/Singleton Pattern.md"],
  ["디자인패턴", "Strategy", "Design Pattern/Strategy Pattern.md"],
  ["디자인패턴", "Factory Method", "Design Pattern/Design Pattern_Factory Method.md"],
  ["디자인패턴", "Template Method", "Design Pattern/Template Method Pattern.md"],
  ["디자인패턴", "Observer", "Design Pattern/Observer pattern.md"],

  // 소프트웨어 공학
  ["SW공학", "객체지향 프로그래밍 (OOP)", "Computer Science/Software Engineering/Object-Oriented Programming.md"],
  ["SW공학", "TDD", "Computer Science/Software Engineering/TDD(Test Driven Development).md"],
  ["SW공학", "Clean Code & Refactoring", "Computer Science/Software Engineering/Clean Code & Refactoring.md"],
];

export const BACKEND_CS: BackendTopic[] = RAW.map(([category, title, path], i) => ({
  id: String(i + 1),
  category,
  title,
  path,
}));

/** GitHub blob URL — 경로 세그먼트별 인코딩 (공백·&·괄호·한글 처리) */
export function gyoogleUrl(path: string): string {
  const enc = path.split("/").map(encodeURIComponent).join("/");
  return `https://github.com/${GYOOGLE_REPO}/blob/${GYOOGLE_BRANCH}/${enc}`;
}
