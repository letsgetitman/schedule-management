# 우리 둘의 일정 / 맛집 지도 / 헬스 기록

커플이 함께 쓰는 일정 관리 + 맛집 지도 + 헬스 계획-실적 트래커. Next.js(App
Router) + Prisma(SQLite) + NextAuth(자격증명 로그인) + Naver 지도/검색 API로
만들었습니다.

## 기능

- **일정관리**: 월간 → 주간 → 일간(시간대별 타임라인) 뷰. 일정에 체크
  표시, 태그, 카테고리를 붙일 수 있고 "여자친구와 공유" 토글로 커플 캘린더에
  노출할지 정할 수 있습니다.
- **맛집 지도**: Naver 지역 검색 API로 장소를 검색해 Naver 지도에 핀으로
  추가. 방문 여부 체크, 5점 별점, 메모를 남길 수 있고 커플로 연결되면
  파트너가 추가한 맛집도 함께 보입니다.
- **헬스**: 이번 주 종목별 목표(세트 x 횟수)와 실제 수행 기록을 입력하면
  막대그래프로 계획 vs 실제를 비교해 보여줍니다.
- **커플 연결**: 각자 회원가입 후 `/settings`에서 초대 코드를 만들고,
  상대방이 그 코드를 입력하면 연결됩니다. 연결 전까지는 개인 전용 데이터만
  보입니다.

## 시작하기

```bash
npm install
cp .env.example .env   # 아래 "환경 변수" 참고해서 값 채우기
npx prisma migrate dev # SQLite DB 생성 + 마이그레이션 적용
npm run dev
```

http://localhost:3000 접속 → 회원가입 → 로그인하면 바로 사용할 수 있습니다.

## 환경 변수 (.env)

| 변수 | 설명 |
| --- | --- |
| `DATABASE_URL` | 기본값 `file:./dev.db` (SQLite). 그대로 두면 됩니다. |
| `AUTH_SECRET` | 세션 서명용 랜덤 값. `openssl rand -base64 32`로 생성. |
| `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID` | Naver 지도(Dynamic Map) 클라이언트 ID. 브라우저에 노출됩니다. |
| `NAVER_SEARCH_CLIENT_ID` / `NAVER_SEARCH_CLIENT_SECRET` | Naver 지역 검색 API 인증키. 서버에서만 사용(절대 `NEXT_PUBLIC_` 접두사 붙이지 말 것). |

### Naver API 키 발급 방법

지도 표시와 맛집 검색은 **서로 다른 두 개의 Naver 서비스**에서 각각 키를
발급받아야 합니다.

1. **지도 (NEXT_PUBLIC_NAVER_MAP_CLIENT_ID)**
   - [Naver Cloud Platform](https://www.ncloud.com) 가입 → 콘솔에서
     **AI·NAVER API > Maps** 서비스 신청
   - Application 등록 시 "Web Dynamic Map"을 선택하고, 서비스 URL에
     `http://localhost:3000`(개발용)과 배포 도메인을 등록
   - 발급된 **Client ID**를 `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`에 입력
   - (참고) NCP 콘솔 UI가 바뀌면서 파라미터명이 `ncpClientId`에서
     `ncpKeyId`로 변경되었을 수 있습니다. 지도가 안 뜨면
     `src/app/(app)/restaurants/page.tsx`의 Naver Maps 스크립트 URL
     쿼리 파라미터명을 최신 문서 기준으로 맞춰주세요.

2. **지역(맛집) 검색 (NAVER_SEARCH_CLIENT_ID / SECRET)**
   - [Naver 개발자센터](https://developers.naver.com/apps) 가입 →
     애플리케이션 등록 → 사용 API에서 **검색** 선택
   - 발급된 **Client ID / Client Secret**을 각각
     `NAVER_SEARCH_CLIENT_ID`, `NAVER_SEARCH_CLIENT_SECRET`에 입력
   - 이 키는 절대 브라우저에 노출하면 안 되므로, 코드에서도
     `src/app/api/restaurants/search/route.ts`(서버 라우트)에서만
     사용합니다.

두 키 모두 설정하지 않아도 나머지 기능(일정관리, 헬스)은 정상 동작합니다.

## 데이터 구조 (Prisma 스키마 요약)

`prisma/schema.prisma` 참고. 핵심 모델:

- `User` / `Couple`: 계정별 로그인 + 초대 코드로 커플 연결(최대 2명)
- `Event`: 캘린더 일정. `date/startTime/endTime`으로 월·주·일 뷰를 모두
  커버, `completed`(체크), `tag`, `isShared`(커플 공유 여부) 포함
- `Restaurant`: 맛집 핀. `lat/lng`, Naver 검색 결과의 `naverPlaceId`,
  방문 여부·별점·메모
- `WorkoutPlan` / `WorkoutLog`: 주간 목표(세트x횟수)와 실제 기록을 분리
  저장해 헬스 페이지에서 계획 vs 실제 막대그래프로 집계

## 기술 스택

- Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind CSS
- Prisma 6 + SQLite (로컬 개발용. 여러 기기에서 쓰려면 Postgres로 교체 권장)
- NextAuth v5 (Credentials + JWT 세션)
- recharts (헬스 막대그래프), date-fns (날짜 계산)
