# 💱 환율 변환기 (Currency Converter)

실시간 환율 정보를 제공하는 웹 애플리케이션입니다.

## 🔗 링크

| 항목 | URL |
|------|-----|
| 🌐 배포 (GitHub Pages) | https://jiae05.github.io/currency-converter/ |
| 📁 GitHub 저장소 | https://github.com/jiae05/currency-converter |

---

## 🛠 기술 스택

| 분류 | 기술 |
|------|------|
| 마크업 | HTML5 |
| 스타일 | CSS3 (Flexbox, Grid, CSS Variables) |
| 스크립트 | Vanilla JavaScript (ES6+) |
| 차트 | Chart.js 4.4.0 |
| 외부 API | [Frankfurter API](https://api.frankfurter.app) |
| 저장소 | Browser LocalStorage |
| 호스팅 | GitHub Pages |

---

## ✅ 구현 기능

### 1. 환율 변환
- 금액 입력 → 실시간 변환 결과 표시
- 기준 통화 / 대상 통화 선택 (150+ 통화 지원)
- Debouncing (400ms) 적용으로 불필요한 API 호출 방지
- 마지막 업데이트 시간 표시

### 2. 통화 교환 (Swap)
- 버튼 클릭으로 기준/대상 통화 즉시 교환
- 90도 회전 애니메이션 효과

### 3. 환율 추이 차트
- 기간 선택: **7일 / 30일 / 90일 / 1년**
- Chart.js Line 차트로 시각화
- 호버 시 정확한 환율값 툴팁 표시

### 4. 즐겨찾기 통화
- 기본값: EUR, JPY, KRW
- 최대 **6개** 등록 가능
- 카드 클릭 시 대상 통화 자동 변경
- LocalStorage에 자동 저장/불러오기

### 5. 숫자 포맷팅
| 범위 | 소수점 |
|------|--------|
| 100 이상 | 최대 2자리 |
| 1 ~ 100 | 최대 4자리 |
| 1 미만 | 최대 6자리 |

---

## 📁 프로젝트 구조

```
currency-converter/
├── index.html      # 메인 HTML (변환기, 차트, 즐겨찾기 섹션)
├── app.js          # 핵심 로직 (API, 상태 관리, 이벤트)
├── style.css       # 스타일 (디자인 시스템, 반응형)
└── README.md       # 프로젝트 문서
```

---

## 🔌 API 정보

**Frankfurter API** — 무료, 오픈소스 환율 API

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /currencies` | 지원 통화 목록 |
| `GET /latest?from=USD&to=KRW` | 최신 환율 |
| `GET /2024-01-01..2024-12-31?from=USD&to=KRW` | 기간별 환율 이력 |

---

## 📝 커밋 히스토리

| 커밋 | 내용 |
|------|------|
| `6aa8e2c` | revert: 여행 예산 계산기 제거 |
| `040898f` | feat: 여행 인원 입력 및 1인당 예산 계산 기능 추가 |
| `04f920c` | fix: app.js 캐시 버스팅 추가 |
| `3e22049` | feat: 여행 예산 계산기 추가 |
| `24ec432` | Initial commit: 환율 변환기 |

---

## 🎨 디자인 시스템

| 항목 | 값 |
|------|-----|
| Primary Color | `#6366f1` (인디고) |
| Background | `#f1f5f9` (라이트 그레이) |
| Text | `#1e293b` (다크 슬레이트) |
| 최대 너비 | 680px |
| 반응형 기준 | 520px 이하 |

---

## 🚀 로컬 실행 방법

별도 빌드 없이 `index.html`을 브라우저에서 바로 열면 됩니다.

```bash
# 저장소 클론
git clone git@github.com:jiae05/currency-converter.git

# 폴더 이동 후 index.html 실행
open index.html
```
