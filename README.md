# FixOn — 시설 고장 신고 및 정비 관리

Vercel 배포 방법: [docs/VERCEL_DEPLOY.md](docs/VERCEL_DEPLOY.md). 로컬 실행은 아래 기존 명령을 그대로 사용합니다. 배포 시 온라인 DB와 MySQL 세션용 sessions 테이블을 준비합니다.

교수님 수업의 Express·Nunjucks·Sequelize·MySQL 구조를 바탕으로 만든 웹 프로젝트입니다. 별도 React 서버 없이 Express 한 서버에서 화면과 JSON API를 제공합니다.

## 구현 범위

- 세션 기반 가입·로그인·로그아웃, bcrypt 비밀번호 해시
- 신고 8개·시설 7개·분류 7개·정비 작업 8개: 업무 라우터 4개, API 30개
- 일반 사용자 본인 신고 관리, 관리자 전체 업무 관리
- 검색·페이지네이션·통계·활성 변경·기한 초과 조회
- 정비 담당자 배정, 상태 전이 검증, 작업 완료와 신고 완료의 트랜잭션 동기화
- 라우터별 실제 MySQL API 테스트 및 화면 렌더링 테스트

## 준비 사항

- Node.js 22 이상 (검증 환경: Node.js 24.21.0, npm 11.19.0)
- MySQL Server 8.0 또는 8.4 계열 (실제 검증: MySQL 8.4.13)
- 선택: MySQL Workbench

**Workbench는 DB 관리 도구이고 MySQL Server는 데이터를 보관하는 서버입니다. Workbench만 설치되어 있으면 앱이 실행되지 않습니다.** MySQL Server도 준비하고 실행해야 합니다.

공식 다운로드: [MySQL Community Server](https://dev.mysql.com/downloads/mysql/), [Windows 설치 안내](https://dev.mysql.com/doc/refman/8.4/en/windows-installation.html).

## 설치 및 실행 — PowerShell

압축을 풀고 프로젝트 폴더에서 실행합니다.

```powershell
npm ci
Copy-Item .env.example .env
```

MySQL Workbench에서 관리자 계정으로 연결하고 `scripts/create-databases.sql`을 엽니다. 비밀번호 예시를 본인 값으로 변경한 다음 실행합니다. `fixon`과 `fixon_test` 두 DB 및 앱 전용 계정을 만듭니다. 같은 MySQL 서버 안의 DB 두 개이며 별도 서버를 두 개 설치하지 않습니다.

이미 같은 이름의 계정이 있으면 SQL의 CREATE USER IF NOT EXISTS는 비밀번호를 바꾸지 않습니다. 기존 비밀번호를 .env에 입력하거나 본인이 Workbench에서 계정을 조정하세요.

`.env`의 값을 실제 환경에 맞춥니다.

```dotenv
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=fixon_user
DB_PASSWORD=본인이설정한비밀번호
DB_NAME=fixon
TEST_DB_NAME=fixon_test
SECRET=32자이상의임의문자열로변경하세요_개발용
SEED_ADMIN_PASSWORD=Admin123!
SEED_USER_PASSWORD=Student123!
```

```powershell
npm run seed
npm start
```

[http://localhost:3000](http://localhost:3000)을 엽니다. seed는 기본 테이블·계정·시설·분류·신고를 준비하며, 반복 실행 시 같은 시연 데이터를 중복 생성하지 않도록 구성했습니다. 기존 계정 비밀번호는 덮어쓰지 않습니다.

| 계정 | 아이디 | seed 기본 비밀번호 | 역할 |
|---|---|---|---|
| 관리자 | admin | Admin123! | ADMIN |
| 학생 | student | Student123! | USER |

위 비밀번호는 로컬 시연용입니다. 실제 사용자 서비스용으로 사용하지 마세요.

## 명령

| 명령 | 역할 |
|---|---|
| npm start | 서버 실행 |
| npm run dev | nodemon 개발 실행 |
| npm run seed | 테이블·시연 데이터 준비 |
| npm test | 실제 MySQL 테스트 DB에서 테스트 순차 실행 |
| npm run check | 전체 JavaScript 구문 검사 |

Nunjucks 화면을 사용하므로 프런트엔드 빌드 명령은 필요하지 않습니다.

## 화면 사용 순서

1. student 로그인 → 고장 신고 → 새로 등록 → 시설·분류·고장 내용 입력
2. admin 로그인 → 신고 목록에서 작업 생성 → 처리 기한 입력
3. 정비 작업 → 배정 → 담당자 선택
4. 상태 → 진행 중
5. 상태 → 작업 완료, 처리 결과 입력
6. 신고 상세에서 해결 완료와 처리 결과 확인

시설과 분류의 등록·수정·삭제는 관리자만 가능합니다. 일반 사용자는 본인 신고만 조회하고 REPORTED 상태에서 수정·삭제할 수 있습니다. 담당자로 배정된 일반 회원도 작업 변경 권한은 없으며, 관리자가 정비 기록을 관리합니다.

## 테스트

MySQL을 실행하고 `scripts/create-databases.sql`로 테스트 DB와 계정 권한까지 준비한 후 실행합니다.

```powershell
npm test
```

테스트는 **fixon_test의 테이블을 초기화**합니다. 이 DB에는 실제 데이터를 저장하지 마세요. NODE_ENV와 DB 이름을 검사한 후에만 초기화하며 서비스용 fixon DB는 초기화하지 않습니다. 각 테스트는 독립된 기본 데이터를 준비하고 API 응답과 실제 DB 상태를 검증합니다. 로그인 쿠키와 CSRF 토큰도 실제 절차로 전달합니다.

검증 결과와 한계는 [docs/TEST_REPORT.md](docs/TEST_REPORT.md)를 참고하세요.

## 프로젝트 구조

```text
fixon/
├── app.js                  # Express 설정·라우터·오류 처리
├── server.js               # DB 연결·테이블 준비·listen
├── config/config.js        # 수업 config.json을 환경 변수 방식으로 확장
├── models/                 # 수업처럼 Sequelize 모델·관계 정의
├── routes/                 # 화면·회원·업무 Router
├── middleware/auth.js      # 세션 인증·관리자 검사·CSRF
├── public/css/             # 반응형 CSS
├── public/js/              # 화면 Fetch 호출·폼·목록 처리
├── views/                  # Nunjucks 화면
├── scripts/                # DB 준비 SQL·seed·구문 검사
├── tests/                  # 4개 업무 라우터 테스트·화면 테스트
└── docs/                   # API·ERD·테스트 결과·보고서 초안
```

수업의 `routes/comment.js` 대신 FixOn의 업무 라우터를 구성했습니다. 모델 조회는 수업처럼 라우터에서 Sequelize 메서드를 호출합니다. 별도 Controller·Repository 계층은 도입하지 않았습니다. 공통 입력·조회 함수만 routes/helpers.js에 모았습니다.

## API 요청 예시

로그인 후 브라우저 개발자 도구에서 같은 출처로 실행하는 예시입니다. 실제 화면은 public/js/api.js를 통해 동일한 방식으로 호출합니다.

```javascript
const { csrfToken } = await fetch('/api/users/csrf').then(r => r.json());
const response = await fetch('/api/reports', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
  body: JSON.stringify({ facilityId: 1, categoryId: 1,
    title: '조명 고장', description: '불이 켜지지 않습니다.', priority: 'NORMAL' })
});
console.log(response.status, await response.json());
```

실제 시설·분류 ID를 사용하세요. 가입·로그인을 포함한 모든 변경 요청에는 먼저 세션에 맞는 CSRF 토큰이 필요합니다. 로그인 후에는 응답의 새 토큰을 사용합니다.

## 자주 발생하는 문제

| 증상 | 확인·해결 |
|---|---|
| ECONNREFUSED | MySQL Server 실행 여부와 DB_PORT 확인 |
| Access denied | DB_USER·DB_PASSWORD·계정 접속 호스트·권한 확인 |
| Unknown database | Workbench에서 DB 준비 SQL 실행 |
| SECRET 오류 | .env의 SECRET을 32자 이상으로 설정 |
| 403 보안 토큰 오류 | 페이지 새로고침, 세션 쿠키·X-CSRF-Token 확인 |
| 409 삭제 오류 | 연결 신고·정비 기록 확인, 시설·분류는 비활성화 활용 |
| 테스트 안전 검사 실패 | TEST_DB_NAME=fixon_test, DB_NAME=fixon 확인 |
| EADDRINUSE | 기존 앱 종료 또는 PORT 변경 |
| 테이블 구조를 바꿨는데 반영 안 됨 | sync(force:false)는 스키마 마이그레이션이 아님. 데이터 보존 후 변경 SQL 작성 |

## 제출

- 프로젝트와 별도로 지정 양식 보고서 PDF를 제출해야 합니다.
- 보고서 초안은 docs/REPORT_DRAFT.md이며 최종 제출 PDF가 아닙니다.
- 제공되지 않은 실제 회의 사진과 팀 정보는 팀이 직접 입력해야 합니다.
- 제출용 ZIP에는 node_modules, .env, 실제 DB 파일·접속 비밀번호를 넣지 않습니다.
- package.json, package-lock.json, .env.example, DB 준비 SQL은 포함합니다.
- 압축 파일을 다시 풀어 npm ci로 복원할 수 있습니다.

현재 구성은 로컬 대학 과제 시연용입니다. 세션은 메모리에 저장하므로 Node 서버 재시작 시 로그아웃되지만, MySQL의 신고·시설 데이터는 유지됩니다. 작업 사진은 업로드 대신 선택적 HTTP/HTTPS 이미지 URL 입력 방식입니다.
