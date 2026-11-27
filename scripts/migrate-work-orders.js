async function migrateWorkOrders(sequelize) {
    const query = sequelize.getQueryInterface();
    const table = "work_orders";
    const columns = await query.describeTable(table);
    if (columns.status.type.toLowerCase().startsWith("enum")) {
        const { DataTypes } = require("sequelize");
        await query.changeColumn(table, "status", {
            type: DataTypes.STRING(20), allowNull: false, defaultValue: "OPEN",
        });
    }
    const indexes = await query.showIndex(table);
    const isReportIndex = (index) =>
        index.fields.length === 1 && index.fields[0].attribute === "reportId";

    // Keep the foreign key indexed before dropping the old one-to-one constraint.
    if (!indexes.some((index) => !index.unique && isReportIndex(index)))
        await query.addIndex(table, ["reportId"], { name: "work_orders_report_lookup" });
    for (const index of indexes.filter((item) => item.unique && isReportIndex(item)))
        await query.removeIndex(table, index.name);
}

module.exports = migrateWorkOrders;
