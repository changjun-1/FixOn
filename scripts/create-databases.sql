-- MySQL Workbench의 관리자 연결에서 실행하세요.
-- 기존 DB의 데이터는 삭제하지 않습니다.
CREATE DATABASE IF NOT EXISTS fixon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS fixon_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- 아래 비밀번호를 본인 값으로 바꾸고 .env에도 같은 값을 입력하세요.
CREATE USER IF NOT EXISTS 'fixon_user'@'localhost' IDENTIFIED BY 'change-this-password';
GRANT ALL PRIVILEGES ON fixon.* TO 'fixon_user'@'localhost';
GRANT ALL PRIVILEGES ON fixon_test.* TO 'fixon_user'@'localhost';
