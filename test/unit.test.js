const { Model } = require("sequelize");
const { createDatabase } = require("../models");

test("교수님 방식의 모델 클래스는 연결별로 분리되고 기존 관계를 유지한다", async () => {
    const first = createDatabase("test");
    const second = createDatabase("test");
    try {
        expect(require("../models").User).toBe(require("../models/user"));
        expect(require("../models/user").prototype instanceof Model).toBe(true);
        expect(first.User).not.toBe(second.User);
        expect(first.User.sequelize).toBe(first.sequelize);
        expect(second.User.sequelize).toBe(second.sequelize);
        expect(first.Report.getTableName()).toBe("reports");
        expect(first.Report.associations.WorkOrder.target).toBe(first.WorkOrder);
        expect(first.Report.associations.ReportHistories.target).toBe(first.ReportHistory);
        expect(first.WorkOrder.rawAttributes.reportId.unique).toBe(true);
        expect(first.ReportHistory.rawAttributes.reportId.onDelete).toBe("CASCADE");
    } finally {
        await Promise.all([first.sequelize.close(), second.sequelize.close()]);
    }
});

test("app.js와 라우터는 직접 가져올 수 있고 앱 생성 함수도 제공한다", () => {
    const app = require("../app");
    expect(typeof app).toBe("function");
    expect(typeof app.createApp).toBe("function");
    expect(typeof app.get("port")).toBe("number");
    expect(Array.isArray(require("../routes/auth").stack)).toBe(true);
    expect(Array.isArray(require("../routes/user").stack)).toBe(true);
});
