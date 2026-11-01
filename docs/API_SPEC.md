# FixOn API 명세

## 공통 규칙

- 기본 URL: http://localhost:3000
- JSON 요청·응답, UTF-8. 로그인은 express-session 쿠키(fixon.sid).
- 변경 요청은 X-CSRF-Token 필수. GET /api/users/csrf로 얻고 로그인 성공 후 새 토큰으로 교체한다.
- 모든 업무 API는 로그인 필요. 관리자 API는 현재 회원 역할이 ADMIN이어야 한다.
- 단일 데이터 응답은 객체, 목록은 아래 구조다. 회원 목록만 페이지네이션 없는 {data:[]}다.
- page 기본 0, size 기본 10·최대 100, sort=newest(기본) 또는 oldest.
- Path의 :id는 1 이상 정수. 회원·담당자 ID는 문자열이다.
- *는 필수, ?는 선택. 수정 요청은 최소 하나의 허용 필드를 전달한다. 서버는 허용 필드만 저장한다.
- 400 입력 오류, 401 미로그인·로그인 실패, 403 권한·CSRF 오류, 404 대상 없음, 409 중복·참조·상태 충돌, 500 내부 오류.
- 204는 응답 본문이 없고, 오류 본문은 {"error":"설명"}이다. 비밀번호·해시·세션 비밀값은 응답하지 않는다.

```json
{"data":[{"id":1}],"pagination":{"page":0,"size":10,"total":1,"totalPages":1}}
```

## 입력값

| 필드 | 규칙 |
|---|---|
| title | 공백 제외 1~150자 |
| 신고 description | 공백 제외 1~10000자 |
| 시설 name/building/room | 각각 1~100자 |
| facilityType | 1~40자 문자열 |
| 분류 code | 1~40자, 대문자로 시작, 대문자·숫자·밑줄, UNIQUE |
| 분류 name | 1~100자 |
| 시설·분류 description | 제공 시 1~5000자 |
| active | JSON Boolean |
| priority | LOW, NORMAL, HIGH, URGENT |
| imageUrl | null·빈 문자열 또는 1000자 이하 HTTP/HTTPS URL |
| facilityId/categoryId | 존재하고 활성인 항목 |
| reportId | 존재하는 신고, 정비 작업 중복 불가 |
| dueAt | 날짜 문자열, 화면은 ISO 8601 UTC 전송 권장 |
| resolutionNote | 제공 시 1~10000자, 완료 시 필수 |
| assigneeId | 존재하는 회원 ID |

신규 신고의 userId·status·id·시각은 서버에서 정한다. 상태·참조 제한과 트랜잭션 상세는 ERD.md를 따른다.

## 신고 관리 — 8개

| Method | Endpoint | 기능 | 권한 | 성공 |
|---|---|---|---|---|
| GET | /api/reports | 신고 목록·검색 | 로그인, 일반 회원은 본인 데이터 | 200 목록 |
| POST | /api/reports | 신고 등록 | 로그인 | 201 신고 |
| GET | /api/reports/stats | 신고 통계 | 로그인, 일반 회원은 본인 데이터 | 200 통계 |
| GET | /api/reports/:id | 신고 상세 | 본인 또는 관리자 | 200 신고 + Facility + Category + WorkOrder |
| PATCH | /api/reports/:id | 신고 수정 | 본인(REPORTED) 또는 관리자 | 200 수정 신고 |
| DELETE | /api/reports/:id | 신고 삭제 | 본인(REPORTED) 또는 관리자 | 204 본문 없음 |
| PATCH | /api/reports/:id/status | 신고 상태 | 관리자 | 200 수정 신고 |
| PATCH | /api/reports/:id/priority | 우선순위 변경 | 관리자 | 200 수정 신고 |

### GET /api/reports

신고 목록·검색. 인증·권한: 로그인, 일반 회원은 본인 데이터.

- Path: 없음
- Query: keyword, facilityId, categoryId, status, priority, page, size, sort
- Body: 없음
- 성공: 200 목록
- 오류: 400(쿼리·ID), 401, 403, 대상 지정 시 404

### POST /api/reports

신고 등록. 인증·권한: 로그인.

- Path: 없음
- Query: 없음
- Body: facilityId*, categoryId*, title*, description*, priority?, imageUrl?
- 성공: 201 신고
- 오류: 400(입력), 401, 403, 참조·대상 없음 시 404, 중복·상태·참조 충돌 시 409

### GET /api/reports/stats

신고 통계. 인증·권한: 로그인, 일반 회원은 본인 데이터.

- Path: 없음
- Query: 없음
- Body: 없음
- 성공: 200 통계
- 오류: 400(쿼리·ID), 401, 403, 대상 지정 시 404

### GET /api/reports/:id

신고 상세. 인증·권한: 본인 또는 관리자.

- Path: id (양의 정수)
- Query: 없음
- Body: 없음
- 성공: 200 신고 + Facility + Category + WorkOrder
- 오류: 400(쿼리·ID), 401, 403, 대상 지정 시 404

### PATCH /api/reports/:id

신고 수정. 인증·권한: 본인(REPORTED) 또는 관리자.

- Path: id (양의 정수)
- Query: 없음
- Body: title?, description?, facilityId?, categoryId?, imageUrl?
- 성공: 200 수정 신고
- 오류: 400(입력), 401, 403, 참조·대상 없음 시 404, 중복·상태·참조 충돌 시 409

### DELETE /api/reports/:id

신고 삭제. 인증·권한: 본인(REPORTED) 또는 관리자.

- Path: id (양의 정수)
- Query: 없음
- Body: 없음
- 성공: 204 본문 없음
- 오류: 400(입력), 401, 403, 참조·대상 없음 시 404, 중복·상태·참조 충돌 시 409

### PATCH /api/reports/:id/status

신고 상태. 인증·권한: 관리자.

- Path: id (양의 정수)
- Query: 없음
- Body: status*
- 성공: 200 수정 신고
- 오류: 400(입력), 401, 403, 참조·대상 없음 시 404, 중복·상태·참조 충돌 시 409

### PATCH /api/reports/:id/priority

우선순위 변경. 인증·권한: 관리자.

- Path: id (양의 정수)
- Query: 없음
- Body: priority*
- 성공: 200 수정 신고
- 오류: 400(입력), 401, 403, 참조·대상 없음 시 404, 중복·상태·참조 충돌 시 409

## 시설 관리 — 7개

| Method | Endpoint | 기능 | 권한 | 성공 |
|---|---|---|---|---|
| GET | /api/facilities | 시설 목록 | 로그인 | 200 목록 |
| POST | /api/facilities | 시설 등록 | 관리자 | 201 시설 |
| GET | /api/facilities/:id | 시설 상세 | 로그인 | 200 시설 |
| PATCH | /api/facilities/:id | 시설 수정 | 관리자 | 200 수정 시설 |
| DELETE | /api/facilities/:id | 시설 삭제 | 관리자 | 204 본문 없음 |
| GET | /api/facilities/:id/reports | 시설별 신고 | 로그인, 일반 회원은 본인 신고 | 200 신고 목록 |
| GET | /api/facilities/:id/maintenance-history | 시설 정비 이력 | 로그인, 일반 회원은 본인 신고의 작업 | 200 작업 목록 + Report |

### GET /api/facilities

시설 목록. 인증·권한: 로그인.

- Path: 없음
- Query: keyword 또는 name, building, room, facilityType, active, page, size, sort
- Body: 없음
- 성공: 200 목록
- 오류: 400(쿼리·ID), 401, 403, 대상 지정 시 404

### POST /api/facilities

시설 등록. 인증·권한: 관리자.

- Path: 없음
- Query: 없음
- Body: name*, building*, room*, facilityType*, description?, active?
- 성공: 201 시설
- 오류: 400(입력), 401, 403, 참조·대상 없음 시 404, 중복·상태·참조 충돌 시 409

### GET /api/facilities/:id

시설 상세. 인증·권한: 로그인.

- Path: id (양의 정수)
- Query: 없음
- Body: 없음
- 성공: 200 시설
- 오류: 400(쿼리·ID), 401, 403, 대상 지정 시 404

### PATCH /api/facilities/:id

시설 수정. 인증·권한: 관리자.

- Path: id (양의 정수)
- Query: 없음
- Body: name?, building?, room?, facilityType?, description?, active?
- 성공: 200 수정 시설
- 오류: 400(입력), 401, 403, 참조·대상 없음 시 404, 중복·상태·참조 충돌 시 409

### DELETE /api/facilities/:id

시설 삭제. 인증·권한: 관리자.

- Path: id (양의 정수)
- Query: 없음
- Body: 없음
- 성공: 204 본문 없음
- 오류: 400(입력), 401, 403, 참조·대상 없음 시 404, 중복·상태·참조 충돌 시 409

### GET /api/facilities/:id/reports

시설별 신고. 인증·권한: 로그인, 일반 회원은 본인 신고.

- Path: id (양의 정수)
- Query: page, size, sort
- Body: 없음
- 성공: 200 신고 목록
- 오류: 400(쿼리·ID), 401, 403, 대상 지정 시 404

### GET /api/facilities/:id/maintenance-history

시설 정비 이력. 인증·권한: 로그인, 일반 회원은 본인 신고의 작업.

- Path: id (양의 정수)
- Query: page, size, sort
- Body: 없음
- 성공: 200 작업 목록 + Report
- 오류: 400(쿼리·ID), 401, 403, 대상 지정 시 404

## 고장 분류 관리 — 7개

| Method | Endpoint | 기능 | 권한 | 성공 |
|---|---|---|---|---|
| GET | /api/categories | 분류 목록 | 로그인 | 200 목록 |
| POST | /api/categories | 분류 등록 | 관리자 | 201 분류 |
| GET | /api/categories/:id | 분류 상세 | 로그인 | 200 분류 |
| PATCH | /api/categories/:id | 분류 수정 | 관리자 | 200 수정 분류 |
| DELETE | /api/categories/:id | 분류 삭제 | 관리자 | 204 본문 없음 |
| GET | /api/categories/:id/reports | 분류별 신고 | 로그인, 일반 회원은 본인 신고 | 200 신고 목록 |
| PATCH | /api/categories/:id/active | 분류 활성 변경 | 관리자 | 200 수정 분류 |

### GET /api/categories

분류 목록. 인증·권한: 로그인.

- Path: 없음
- Query: active, page, size, sort
- Body: 없음
- 성공: 200 목록
- 오류: 400(쿼리·ID), 401, 403, 대상 지정 시 404

### POST /api/categories

분류 등록. 인증·권한: 관리자.

- Path: 없음
- Query: 없음
- Body: code*, name*, description?
- 성공: 201 분류
- 오류: 400(입력), 401, 403, 참조·대상 없음 시 404, 중복·상태·참조 충돌 시 409

### GET /api/categories/:id

분류 상세. 인증·권한: 로그인.

- Path: id (양의 정수)
- Query: 없음
- Body: 없음
- 성공: 200 분류
- 오류: 400(쿼리·ID), 401, 403, 대상 지정 시 404

### PATCH /api/categories/:id

분류 수정. 인증·권한: 관리자.

- Path: id (양의 정수)
- Query: 없음
- Body: name?, description?
- 성공: 200 수정 분류
- 오류: 400(입력), 401, 403, 참조·대상 없음 시 404, 중복·상태·참조 충돌 시 409

### DELETE /api/categories/:id

분류 삭제. 인증·권한: 관리자.

- Path: id (양의 정수)
- Query: 없음
- Body: 없음
- 성공: 204 본문 없음
- 오류: 400(입력), 401, 403, 참조·대상 없음 시 404, 중복·상태·참조 충돌 시 409

### GET /api/categories/:id/reports

분류별 신고. 인증·권한: 로그인, 일반 회원은 본인 신고.

- Path: id (양의 정수)
- Query: page, size, sort
- Body: 없음
- 성공: 200 신고 목록
- 오류: 400(쿼리·ID), 401, 403, 대상 지정 시 404

### PATCH /api/categories/:id/active

분류 활성 변경. 인증·권한: 관리자.

- Path: id (양의 정수)
- Query: 없음
- Body: active*
- 성공: 200 수정 분류
- 오류: 400(입력), 401, 403, 참조·대상 없음 시 404, 중복·상태·참조 충돌 시 409

## 정비 작업 관리 — 8개

| Method | Endpoint | 기능 | 권한 | 성공 |
|---|---|---|---|---|
| GET | /api/work-orders | 작업 목록 | 관리자 | 200 목록 + Report/Facility + assignee |
| POST | /api/work-orders | 작업 생성 | 관리자 | 201 작업 |
| GET | /api/work-orders/overdue | 기한 초과 미완료 작업 | 관리자 | 200 목록 + Report/Facility + assignee |
| GET | /api/work-orders/summary | 작업 통계 | 관리자 | 200 통계 |
| GET | /api/work-orders/:id | 작업 상세 | 관리자 | 200 작업 + Report/Facility + assignee |
| PATCH | /api/work-orders/:id | 작업 정보 수정 | 관리자 | 200 수정 작업 |
| PATCH | /api/work-orders/:id/status | 작업 상태 변경 | 관리자 | 200 수정 작업 |
| PATCH | /api/work-orders/:id/assignee | 담당자 배정 | 관리자 | 200 수정 작업 |

### GET /api/work-orders

작업 목록. 인증·권한: 관리자.

- Path: 없음
- Query: keyword(신고 제목), status, assigneeId, page, size, sort
- Body: 없음
- 성공: 200 목록 + Report/Facility + assignee
- 오류: 400(쿼리·ID), 401, 403, 대상 지정 시 404

### POST /api/work-orders

작업 생성. 인증·권한: 관리자.

- Path: 없음
- Query: 없음
- Body: reportId*, dueAt*, resolutionNote?
- 성공: 201 작업
- 오류: 400(입력), 401, 403, 참조·대상 없음 시 404, 중복·상태·참조 충돌 시 409

### GET /api/work-orders/overdue

기한 초과 미완료 작업. 인증·권한: 관리자.

- Path: 없음
- Query: page, size, sort
- Body: 없음
- 성공: 200 목록 + Report/Facility + assignee
- 오류: 400(쿼리·ID), 401, 403, 대상 지정 시 404

### GET /api/work-orders/summary

작업 통계. 인증·권한: 관리자.

- Path: 없음
- Query: 없음
- Body: 없음
- 성공: 200 통계
- 오류: 400(쿼리·ID), 401, 403, 대상 지정 시 404

### GET /api/work-orders/:id

작업 상세. 인증·권한: 관리자.

- Path: id (양의 정수)
- Query: 없음
- Body: 없음
- 성공: 200 작업 + Report/Facility + assignee
- 오류: 400(쿼리·ID), 401, 403, 대상 지정 시 404

### PATCH /api/work-orders/:id

작업 정보 수정. 인증·권한: 관리자.

- Path: id (양의 정수)
- Query: 없음
- Body: dueAt?, resolutionNote?
- 성공: 200 수정 작업
- 오류: 400(입력), 401, 403, 참조·대상 없음 시 404, 중복·상태·참조 충돌 시 409

### PATCH /api/work-orders/:id/status

작업 상태 변경. 인증·권한: 관리자.

- Path: id (양의 정수)
- Query: 없음
- Body: status*, resolutionNote?(완료 시 필수)
- 성공: 200 수정 작업
- 오류: 400(입력), 401, 403, 참조·대상 없음 시 404, 중복·상태·참조 충돌 시 409

### PATCH /api/work-orders/:id/assignee

담당자 배정. 인증·권한: 관리자.

- Path: id (양의 정수)
- Query: 없음
- Body: assigneeId*
- 성공: 200 수정 작업
- 오류: 400(입력), 401, 403, 참조·대상 없음 시 404, 중복·상태·참조 충돌 시 409

## 회원 API — 업무 라우터 집계 제외

| Method | Endpoint | Body | 권한 | 성공 |
|---|---|---|---|---|
| POST | /api/users/register | id, name, password | 비로그인 가능, CSRF 필수 | 201 {id,name,role} |
| POST | /api/users/login | id, password | 비로그인 가능, CSRF 필수 | 200 {id,name,role,csrfToken} |
| POST | /api/users/logout | 없음 | 로그인·CSRF | 200 {message} |
| GET | /api/users/me | 없음 | 로그인 | 200 {id,name,role} |
| GET | /api/users | 없음 | 관리자 | 200 {data:[{id,name,role}]} |

추가 보조 API GET /api/users/csrf는 인증 없이 200 {csrfToken}을 반환한다. 회원 업무 API 5개와 별개인 보안 토큰 발급 API다. 따라서 업무 30개 + 회원 기능 5개 + 보조 1개 = 전체 등록 API 36개다.

회원 가입 id는 영문·숫자·밑줄·점·@·하이픈으로 3~100자, name은 1~40자다. 비밀번호는 8자 이상, 문자열 72자 및 UTF-8 72바이트 이하로 검증한다. 요청의 ADMIN 역할은 무시하고 USER로 가입한다. 중복 ID는 409, 잘못된 로그인은 401이다.

## 요청·응답 예시

### 신고 등록

```http
POST /api/reports
Content-Type: application/json
X-CSRF-Token: (현재 세션 토큰)
Cookie: fixon.sid=(로그인 쿠키)

{"facilityId":1,"categoryId":1,"title":"조명 고장","description":"불이 켜지지 않습니다.","priority":"NORMAL"}
```

201 응답 예시 (ID와 시각은 실제 DB에서 생성):

```json
{"id":2,"facilityId":1,"categoryId":1,"userId":"student","title":"조명 고장","description":"불이 켜지지 않습니다.","priority":"NORMAL","status":"REPORTED","imageUrl":null,"createdAt":"2026-10-31T05:00:00.000Z","updatedAt":"2026-10-31T05:00:00.000Z"}
```

### 작업 완료

```json
{"status":"COMPLETED","resolutionNote":"전원 케이블 교체 후 정상 작동 확인"}
```

PATCH /api/work-orders/1/status에 전송한다. 작업 상태는 COMPLETED, 연결 신고는 RESOLVED로 함께 저장한다. 배정·진행을 거치지 않으면 409다.

### 통계 응답

신고: {total, REPORTED, CONFIRMED, IN_PROGRESS, RESOLVED, REJECTED, urgent}

작업: {total, OPEN, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED, overdue}

통계 값은 DB 조회 결과로 계산하며 하드코딩하지 않는다. 기한 초과는 현재 시각보다 dueAt이 빠르고 COMPLETED·CANCELLED가 아닌 작업이다.

### 관계 포함 응답

- 신고 목록: 신고 필드 + Facility(시설 객체) + Category(분류 객체)
- 신고 상세: 위 필드 + WorkOrder(작업 객체 또는 null)
- 정비 목록·상세: 작업 필드 + Report(신고와 Facility) + assignee({id,name} 또는 null)
- 시설 정비 이력: 작업 필드 + 해당 시설의 Report

API 주소의 숫자는 실제 생성된 ID로 바꿔 사용한다. 예시 응답은 형태 설명이며 실제 테스트 결과를 대신하지 않는다.
