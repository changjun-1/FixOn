# 카카오·Google 로그인 설정

기존 MySQL과 세션을 그대로 사용합니다. Passport와 local·kakao·Google 전략 패키지를 사용합니다. 기존 DB 스키마는 유지합니다.
Node.js 18 이상이 필요합니다.

## 환경변수

기존 `.env`에 아래 설정을 추가합니다. 실제 키는 저장소에 올리지 않습니다.

```dotenv
APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
```

`APP_URL`은 브라우저에서 여는 사이트 주소입니다. localhost와 127.0.0.1을 혼용하지 않습니다.
배포할 때는 실제 HTTPS 주소로 바꿉니다. 설정 후 서버를 재시작합니다.
키가 없는 서비스는 버튼 클릭 시 준비 중 안내를 표시합니다.

## Google

Google Cloud / Google Auth Platform에서 OAuth 동의 화면과 웹 애플리케이션 클라이언트를 설정합니다.
클라이언트 ID와 보안 비밀번호를 각각 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`에 입력합니다.
승인된 리디렉션 URI에 다음 값을 등록합니다.

```text
http://localhost:3000/auth/google/callback
```

테스트 모드에서는 테스트 사용자도 등록합니다. 요청 권한은 `openid profile`이며 이메일은 요청하지 않습니다.

## 카카오

Kakao Developers에서 앱을 만들고 카카오 로그인을 활성화합니다.
REST API 키를 `KAKAO_CLIENT_ID`, 클라이언트 시크릿을 `KAKAO_CLIENT_SECRET`에 입력합니다.
닉네임을 사용하려면 프로필 정보(닉네임) 동의 항목을 설정합니다. 제공되지 않으면 기본 이름을 사용합니다.
Redirect URI에 다음 값을 등록합니다.

```text
http://localhost:3000/auth/kakao/callback
```

배포 시 두 서비스 모두 실제 사이트 주소의 `/auth/google/callback`, `/auth/kakao/callback`을 등록합니다.

## 계정과 보안

- 최초 로그인 시 일반 사용자 계정을 생성하고, 재로그인 시 동일 계정을 사용합니다.
- 기존 아이디 계정과 카카오·Google 계정은 각각 별개입니다. 기존 신고 기록도 자동으로 합치지 않습니다.
- 제공자 사용자 ID를 해시한 예약된 `oauth:` 아이디를 사용하므로 일반 회원가입으로 같은 계정을 만들 수 없습니다.
- 소셜 계정에는 무작위 비밀번호의 해시를 저장하며 별도 비밀번호를 발급하거나 표시하지 않습니다.
- 제공자 토큰은 사용자 조회에만 사용하고 DB나 브라우저에 저장하지 않습니다.
- 세션에 저장한 일회용 state는 10분 동안 유효합니다. Google에는 PKCE도 적용합니다.
- 로그인 성공 시 세션 ID와 CSRF 토큰을 교체합니다. 로그아웃은 FixOn 세션을 종료합니다.

## 검증

`npx jest test/social.test.js --runInBand`로 외부 API를 모의한 인증 흐름을 검사합니다.
실제 로그인은 각 서비스의 키와 Redirect URI를 등록한 뒤 브라우저에서 확인해야 합니다.

공식 문서:
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.kakao.com/docs/ko/kakaologin/rest-api

교수님 구조에 따라 인증 요청은 routes/auth.js에서 받고, 전략은 passport/에 분리했습니다. 로그인 ID는 Passport가 세션에 직렬화하며 기존 수동 세션은 재로그인해야 합니다.
