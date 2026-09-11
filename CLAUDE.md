# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

개인 재정관리 및 시뮬레이션 웹 도구. 순수 HTML/CSS/JS로 구성되며 서버 없이 브라우저에서 바로 실행된다.
데이터는 localStorage + GitHub Gist 클라우드 동기화로 관리된다.
모든 UI와 메시지는 한국어로 통일한다.

## 배포 및 접속

- **GitHub Pages**: https://jasper-oh-oh.github.io/budget-planner/
- **리포지토리**: https://github.com/jasper-oh-oh/budget-planner (Public)
- 코드 수정 → `git push` → 1~2분 후 Pages 자동 배포

## 실행 방법

```
# 웹 접속 (권장)
https://jasper-oh-oh.github.io/budget-planner/

# 로컬 개발 시
start index.html

# 또는 로컬 서버 (CORS 이슈 시)
python -m http.server 8080
```

## 아키텍처

단일 페이지 앱(SPA). 탭 네비게이션으로 6개 뷰를 전환한다:
- **월별 예산** (`budget.js`) — 분류/항목 2단 구조로 수입/지출 관리. 카드대금·대출 납부액·주식 매도 수익은 시뮬레이션에서 자동 연동. 예상/실제 컬럼 토글, 금액 셀 툴팁, 월별 구분선·홀짝 배경, 셀 편집 시 스크롤 위치 유지
- **신용카드** (`cards.js`) — 카드별 이월잔액, 이자, 상환 시뮬레이션. 기준월(baseMonth) 설정으로 해당 월부터 시뮬레이션 시작, 이전 월은 0. 결제일·월이용금액·최소결제비율·이자율 월별 조정 가능
- **대출** (`loans.js`) — 대출별 잔액, 원금상환, 이자, 월납부액 시뮬레이션. 원리금균등/원금균등/만기일시 3가지 상환방식. 고정/변동 금리 지원, 변동금리는 금리 이력 모달(rateHistory)로 관리
- **투자/저축** (`stocks.js`) — 종목별 월별 매입(수량+단가)/매도(수량+단가) 시뮬레이션. 매도 수익은 예산 수입에 자동 연동. 기간 이전 보유 주식 지원
- **대시보드** (`chart.js`) — Canvas 기반 바/라인 차트. 외부 라이브러리 없음
- **설정** (`app.js`) — 기간 설정, JSON 내보내기/가져오기, 클라우드 동기화, 초기화

`data.js`가 중앙 데이터 스토어 역할:
- `DataStore` 싱글턴이 localStorage를 래핑
- 모든 데이터 변경은 `DataStore`를 통해 수행하고 자동 저장
- 신용카드(`simulateCard`), 대출(`simulateLoan`), 주식(`simulateStock`) 시뮬레이션 로직 포함
- 예산 테이블의 카드대금/대출/주식 분류는 시뮬레이션 결과를 자동 반영 (읽기전용 Expected)

`sync.js`가 클라우드 동기화 담당:
- `CloudSync` 모듈이 GitHub Gist API와 통신 (fetch만 사용, 외부 SDK 없음)
- GitHub Classic PAT (gist 스코프)로 인증, 토큰은 localStorage에만 저장
- 데이터 편집 시 3초 디바운스 후 자동 push, 앱 시작 시 자동 pull
- 새 기기에서는 토큰만 입력하면 Gist를 자동 검색하여 연결

## 핵심 데이터 흐름

1. 앱 시작 → `DataStore.load()` → localStorage에서 데이터 복원 (없으면 DEFAULT_DATA 사용)
2. 앱 시작 → `CloudSync` 연결 확인 → Gist에서 pull → 최신이면 덮어쓰기
3. 셀 편집 → `DataStore.updateCell()` → localStorage 저장 → 3초 후 Gist 자동 push
4. 카드 시뮬레이션 → `DataStore.simulateCard(card)` → 월별 이월/이자 계산 결과 반환
5. 대출 시뮬레이션 → `DataStore.simulateLoan(loan)` → 월별 잔액/원금/이자/납부액 계산
6. 주식 시뮬레이션 → `DataStore.simulateStock(stock)` → 월별 매입/매도/보유수량/투자금 계산 (기간 이전 거래 자동 반영)

## 신용카드 계산 공식

```
④ 최소결제금액 = (①월이용금액 + ②이월결제금액) × ③최소결제비율
⑤ 잔여결제금액 = (①월이용금액 + ②이월결제금액) - ④최소결제금액
⑦ 이용수수료 = ⑤잔여결제금액 × ⑥이자율 / 12
청구액 = ④최소결제금액 + ⑦이용수수료
다음달 이월금액 = ⑤잔여결제금액 + ⑦이용수수료
※ 최소결제비율이 100%이면 이자율은 자동으로 0 적용
※ 기준월(baseMonth) 이전 월은 모든 값 0 반환. 시뮬레이션은 기준월부터 initialCarryOver로 시작
```

## 대출 상환 공식

```
[원리금균등] 월납부액 = 원금 × r × (1+r)^n / ((1+r)^n - 1), r=월이율, n=총개월
[원금균등]   월원금 = 원금/n, 이자 = 잔액×r, 월납부 = 원금+이자 (매월 감소)
[만기일시]   월이자 = 잔액×r (매월), 만기월에 원금+이자 전액
변동금리: rateHistory 배열 [{from:"2022-01", rate:0.042}, ...] 로 금리 변경 이력 관리
         변경 시 잔액/잔여기간 기준 월납부액 재계산. 개별 월 오버라이드(rateOverrides) > 이력 > 기본금리 순 우선
```

## 주식 시뮬레이션 로직

```
매입: 평균단가 = (기존보유 × 기존평균단가 + 매입수량 × 매입단가) / 총보유수량
매도: 매도총액 = 매도수량 × 매도단가 → 예산 수입에 자동 반영
보유수량: 누적 매입 - 누적 매도 (기간 이전 보유 포함)
기간 이전 거래: monthlyOverrides에 저장된 과거 월 데이터를 시뮬레이션 전에 먼저 처리
```

## 분류 체계

수입: 급여, 부수입, 주식
지출: 주거비, 보험, 교육, 생활비, 대출, 투자/저축, 카드대금

## 코딩 규칙

- 외부 라이브러리/CDN 없이 순수 JS로 구현
- 금액 표시: `₩` 접두사 + 천단위 쉼표 (`₩1,234,567`)
- 큰 금액 축약: 만/억 단위 (`1,234만`, `1.2억`)
- 금리: 소수점 3자리 (`.toFixed(3)`, 예: `3.456%`)
- CSS 변수(`--bg`, `--accent` 등)를 통한 다크 테마
