# 교수님 step5와 FixOn 구조 비교

비교 자료: 사용자가 제공한 `step5 (1).zip`. 원본의 비밀번호·환경변수·데이터는 복사하지 않았습니다.

| 구분 | 교수님 step5 | 변경한 FixOn |
|---|---|---|
| 실행 진입점 | app.js | app.js. npm start와 dev도 이 파일 실행 |
| 앱 내보내기 | module.exports = app | 동일. createApp은 테스트 DB 분리용 추가 기능 |
| DB 기본 설정 | config/config.json | 동일 경로. 실제 접속 비밀값은 config.js에서 .env 결합 |
| 모델 선언 | class extends Sequelize.Model | 동일한 클래스 모델 방식 |
| 모델 필드 | static init(sequelize) | 동일 |
| 모델 관계 | 각 모델의 static associate(db) | 동일 |
| 모델 조립 | models/index.js에서 init → associate | 동일. 테스트 연결별 하위 클래스로 모델 공유 방지 |
| 인증 등록 | passport/index.js | 동일. serializeUser·deserializeUser 사용 |
| 로컬 인증 | passport/local.js | 동일. bcrypt 비밀번호 검증 |
| 카카오 인증 | passport/kakao.js | 동일. passport-kakao 전략 사용 |
| Google 인증 | 없음 | passport/google.js로 확장 |
| 인증 라우터 | routes/auth.js | 동일. 일반·소셜 인증과 로그아웃 처리 |
| 업무 라우터 | routes/user.js, comment.js | user.js와 report/facility/category/workOrder.js |
| Router 내보내기 | module.exports = router | 동일. createRouter는 테스트용 확장 |
| 화면 | views/ + Nunjucks | 동일. 공통 레이아웃·기능별 화면 확장 |
| 테스트 폴더 | test/ | 동일. 기존 API 검증과 단위·인증 검증 유지 |

## FixOn 기능에 필요한 확장

- `public/`: 관리 화면 스타일과 브라우저 API 호출·입력 폼·표 표시.
- `middleware/`: 관리자 권한, CSRF, SQL 세션 저장소, 로그인 세션 마무리.
- `services/`: 신고·정비·처리 이력을 하나의 트랜잭션으로 처리하는 업무 로직.
- `scripts/`: MySQL 준비와 시연 데이터 생성.
- `docs/`: 설계·검증 결과와 시연 안내.

교수님의 comment 예제를 시설 관리에 그대로 추가하지는 않았습니다. 그 자리에 실제 신고·정비 모델과 라우터를 연결했습니다.
폴더의 역할과 연결 방식은 교수님 구조를 따르되 앱 기능에 맞는 모델과 화면을 유지했습니다.

## 유지한 안전장치

1. 과거 소셜 회원 ID 생성 규칙을 유지하므로 기존 users와 신고 관계는 그대로 사용합니다.
2. 기존 테이블명·필드·키·관계·타임스탬프 설정은 유지합니다. 데이터 초기화나 alter는 하지 않습니다.
3. Passport 세션에 회원 ID만 저장하고 매 요청에서 권한을 다시 조회합니다.
4. 로그인 시 세션과 CSRF 토큰을 갱신하고 로그아웃은 CSRF가 필요한 POST로 처리합니다.
5. 소셜 인증은 일회용 state·10분 만료를 적용하고 Google은 PKCE도 사용합니다.
6. 외부 인증 토큰·비밀번호를 이력이나 응답에 저장하지 않습니다.
7. app.js를 테스트에서 가져올 때는 포트를 열거나 테이블을 동기화하지 않습니다.
8. SQL 세션·실제 MySQL 테스트·정비 트랜잭션과 처리 이력은 계속 제공합니다.

## 적용 방법

`npm ci` 후 기존 서버를 종료하고 `npm start`로 실행합니다. 기존 .env와 업무 데이터는 유지합니다.
이전 방식의 로그인 세션은 Passport 세션 형식과 달라 한 번 다시 로그인해야 합니다.
카카오·Google Redirect URI는 기존 `/auth/kakao/callback`, `/auth/google/callback` 그대로입니다.
