const bcrypt = require("bcrypt");
const { createDatabase } = require("../models");
async function seed() {
  const db = createDatabase();
  try {
    await db.sequelize.sync({ force: false });
    for (const [id, name, role, password] of [
      [
        "admin",
        "시설 관리자",
        "ADMIN",
        process.env.SEED_ADMIN_PASSWORD || "Admin123!",
      ],
      [
        "student",
        "김학생",
        "USER",
        process.env.SEED_USER_PASSWORD || "Student123!",
      ],
    ])
      await db.User.findOrCreate({
        where: { id },
        defaults: { name, role, password: await bcrypt.hash(password, 12) },
      });
    for (const [code, name] of [
      ["ELECTRICAL", "전기 및 조명"],
      ["HVAC", "냉난방"],
      ["COMPUTER", "컴퓨터"],
      ["AV_EQUIPMENT", "영상 장비"],
      ["FURNITURE", "가구"],
      ["PLUMBING", "배관"],
      ["OTHER", "기타"],
    ])
      await db.Category.findOrCreate({ where: { code }, defaults: { name } });
    const [facility] = await db.Facility.findOrCreate({
      where: { name: "빔프로젝터", building: "본관", room: "301호" },
      defaults: {
        facilityType: "AV_EQUIPMENT",
        description: "강의실 천장 설치형",
      },
    });
    const category = await db.Category.findOne({
      where: { code: "AV_EQUIPMENT" },
    });
    await db.Report.findOrCreate({
      where: {
        title: "빔프로젝터 전원이 켜지지 않습니다.",
        userId: "student",
        facilityId: facility.id,
        categoryId: category.id,
      },
      defaults: {
        description: "전원 버튼을 눌러도 반응이 없습니다.",
        priority: "NORMAL",
      },
    });
    console.log(
      "시연 데이터 준비 완료: admin / student (비밀번호는 README 참고)",
    );
  } finally {
    await db.sequelize.close();
  }
}
seed().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
