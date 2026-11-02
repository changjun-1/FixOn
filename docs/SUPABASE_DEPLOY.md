# FixOn 현재 운영 배포

- 앱: https://fixon-omega.vercel.app
- Vercel 프로젝트: dd-9702/fixon
- 실제 소스 폴더: FixOn (step4가 아님)
- DB: Supabase PostgreSQL, fixon 스키마
- 테이블: users, facilities, categories, reports, work_orders, sessions
- DATABASE_URL과 DB_SCHEMA=fixon을 사용한다. 값은 .env와 Vercel 환경변수에만 보관한다.
- SECRET은 32자 이상이며 모든 인스턴스에서 같아야 한다.
- Supabase CA 인증서를 config/supabase-ca.crt에 보관하고 TLS 검증을 유지한다.
- 로컬 자동 테스트는 기존 MySQL fixon_test를 사용하고 운영 데이터는 초기화하지 않는다.
- DATABASE_URL이 없으면 기존 MySQL 설정으로 동작한다.
- 기존 MySQL 데이터는 자동 이전하지 않았다. 운영 계정은 새 무작위 비밀번호로 준비했다.
- 배포 파일에 .env나 node_modules를 직접 포함하지 않는다.
- 현재 배포는 CLI로 진행했다. GitHub 자동 배포 연결은 별도 계정 연결이 필요하다.

## 검증

JavaScript 구문 검사와 기존 MySQL 테스트 39개 통과. 실제 배포에서 관리자/학생 로그인, 공유 세션, 신고 생성, 정비 배정, 진행/완료 트랜잭션, 신고 해결 상태 동기화, 인증 페이지, 로그아웃을 확인했다. 검증용 임시 신고 및 작업은 정리했다.
