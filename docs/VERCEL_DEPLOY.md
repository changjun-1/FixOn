# FixOn Vercel 배포

## 로컬 환경과 배포 환경

`npm start`는 기존 server.js와 로컬 MySQL을 그대로 사용한다. Vercel에서는 app.js의 기본 Express 내보내기를 사용한다. index.js도 같은 앱을 내보낸다. public/은 Vercel이 정적 파일로 제공하며 views/는 함수에 포함한다. 배포 요청 중에는 스키마를 변경하거나 seed를 실행하지 않는다.

production DB 설정을 추가했고, HTTPS 프록시·Secure 쿠키·MySQL 세션 저장을 적용했다. sessions 테이블은 서버가 여러 개여도 같은 로그인 정보를 조회하도록 한다. 로컬 기본값은 기존 메모리 세션이며, SESSION_STORE=mysql로 로컬에서도 SQL 세션을 시험할 수 있다.

## 1. 온라인 DB 준비

TiDB Cloud Starter의 **MySQL 호환** 인스턴스를 이용할 수 있다. 이것은 원래 MySQL 제품 자체는 아니며 MySQL 드라이버로 연결하는 호환 DB다. 수업용 로컬 MySQL은 변경하지 않는다. 온라인 DB에 연결한 뒤 신고 생성·작업 배정·완료 트랜잭션을 실제로 확인해야 한다.

- https://tidbcloud.com/ 에서 로그인하고 Starter / MySQL Compatible 선택
- 무료로 진행하려면 Spending limit을 0으로 유지하고 유료 플랜·결제는 선택하지 않는다.
- DB 준비가 끝나면 Connect에서 Host, Port, Username, Password 확인
- SQL Editor에서 `CREATE DATABASE IF NOT EXISTS fixon;` 실행
- 비밀번호는 GitHub·채팅·스크린샷에 공유하지 않는다.

공식 안내: https://docs.pingcap.com/tidbcloud/create-tidb-cluster-serverless/

## 2. DB 테이블과 시연 계정 초기화

로컬의 .env는 유지하고 프로젝트 루트에 `.env.cloud`를 별도로 만든다. .gitignore와 .vercelignore가 이 파일을 제외한다. 다음 값은 제공받은 온라인 DB 정보로 입력한다.

```dotenv
NODE_ENV=production
DB_HOST=온라인호스트
DB_PORT=온라인포트
DB_USER=온라인사용자명
DB_PASSWORD=온라인DB비밀번호
DB_NAME=fixon
DB_SSL=true
SECRET=32자이상의임의문자열
SEED_ADMIN_PASSWORD=12자이상의새로운시연비밀번호
SEED_USER_PASSWORD=12자이상의새로운시연비밀번호
```

인증 기관 CA를 별도로 요구하는 서비스는 DB_SSL_CA에 PEM 인증서를 설정한다. 인증서 검증을 끄지 않는다. Node 22 이상 터미널에서 실행한다.

```powershell
node --env-file=.env.cloud scripts/seed.js
```

이 명령은 **온라인 DB에 테이블과 시연 계정을 생성**한다. 기존 신고를 가져오지는 않으며 로컬 DB는 변경하지 않는다. 기존 시연 계정이 있으면 비밀번호를 덮어쓰지 않는다. production에서는 알려진 기본 비밀번호 대신 별도 12자 이상 비밀번호가 필요하다.

## 3. Vercel 연결

1. GitHub의 최신 FixOn 커밋을 Import한다.
2. Framework Preset: Express, Root Directory: 프로젝트 루트.
3. Install Command는 기본값, 별도 프런트엔드 Build Command·Output Directory를 지정하지 않는다.
4. Environment Variables에 DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL=true, SECRET을 등록한다. Preview와 Production DB를 분리할 경우 각각 별도 값을 넣는다.
5. Deploy 후 `.vercel.app` 주소로 확인한다.

Vercel은 NODE_ENV=production을 사용한다. 초기화용 SEED 비밀번호는 DB에 해시로 저장되므로 사이트 실행용 Vercel 환경 변수에는 필요하지 않다. 서버의 SECRET은 로컬 기본 예시 문자열 대신 새 무작위 값으로 설정한다.

## 4. 실제 확인

- /healthz: 함수 프로세스 상태만 확인하며 DB 정상 여부를 보장하지 않는다.
- /login에서 스타일·스크립트·폼 표시 확인
- 회원 가입·로그인·페이지 이동 후 세션 유지
- 신고 등록·목록·상세 조회
- 관리자 작업 생성·담당자 배정·진행·완료와 신고 상태 동기화
- 로그아웃 후 접근 차단

`npm test`는 계속 **로컬 fixon_test만** 사용한다. 온라인 서비스 DB에서 테스트용 force 초기화를 하지 않는다. 만료 세션을 가끔 정리하려면 온라인 환경 변수를 지정해 `node --env-file=.env.cloud scripts/cleanup-sessions.js`를 실행한다.

## 오류 확인

- 503: 온라인 DB 호스트·비밀번호·TLS·접속 허용 정책 확인
- sessions 테이블 없음: 온라인 seed가 실행됐는지 확인
- 401: 온라인 seed 시 정한 사이트 비밀번호 사용 (로컬 계정 DB와 별개)
- 로그인 반복 풀림: SECRET 일치·HTTPS·SQL 세션 확인
- 화면 500: Vercel Runtime Logs 확인, views 포함 여부 확인

클라우드 서비스 계정 생성·약관 동의·결제는 사용자가 직접 진행한다. 배포 URL이 생겼다는 것만으로 검증 완료라고 간주하지 않는다.
