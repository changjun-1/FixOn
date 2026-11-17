(() => {
    const f = FixOn;
    const { esc, button } = FixOnManagement;
    function table(kind, admin, rows) {
        if (kind === "reports")
            return f.table(
                ["번호", "신고 제목", "시설", "상태", "우선순위", "등록일", "관리"],
                rows.map((r) => [
                    esc(r.id),
                    `<a href="/reports/${r.id}">${esc(r.title)}</a>`,
                    esc(r.Facility?.name),
                    f.badge(r.status),
                    f.badge(r.priority),
                    f.date(r.createdAt),
                    (admin || r.status === "REPORTED"
                        ? button("edit", r.id, "수정") + button("delete", r.id, "삭제", true)
                        : "") +
                        (admin
                            ? button("status", r.id, "상태") +
                              button("priority", r.id, "우선순위") +
                              button("create-work", r.id, "작업 생성")
                            : ""),
                ]),
            );
        if (kind === "facilities")
            return f.table(
                ["번호", "시설명", "위치", "유형", "활성", "관리"],
                rows.map((r) => [
                    esc(r.id),
                    esc(r.name),
                    esc(r.building + " " + r.room),
                    esc(r.facilityType),
                    r.active ? "활성" : "비활성",
                    button("related-reports", r.id, "신고") +
                        button("history", r.id, "정비 이력") +
                        (admin
                            ? button("edit", r.id, "수정") + button("delete", r.id, "삭제", true)
                            : ""),
                ]),
            );
        if (kind === "categories")
            return f.table(
                ["번호", "코드", "분류명", "설명", "활성", "관리"],
                rows.map((r) => [
                    esc(r.id),
                    esc(r.code),
                    esc(r.name),
                    esc(r.description),
                    r.active ? "활성" : "비활성",
                    button("related-reports", r.id, "신고") +
                        (admin
                            ? button("edit", r.id, "수정") +
                              button("toggle", r.id, r.active ? "비활성화" : "활성화") +
                              button("delete", r.id, "삭제", true)
                            : ""),
                ]),
            );
        if (kind === "workOrders")
            return f.table(
                ["번호", "신고", "상태", "담당자", "처리 기한", "관리"],
                rows.map((r) => [
                    esc(r.id),
                    `<a href="/reports/${r.reportId}">#${esc(r.reportId)} ${esc(r.Report?.title)}</a>`,
                    f.badge(r.status),
                    esc(r.assignee?.name || "미배정"),
                    f.date(r.dueAt) +
                        (!["COMPLETED", "CANCELLED"].includes(r.status) &&
                        new Date(r.dueAt) < new Date()
                            ? ' <span class="badge URGENT">기한 초과</span>'
                            : ""),
                    button("work-detail", r.id, "상세") +
                        (!["COMPLETED", "CANCELLED"].includes(r.status)
                            ? button("edit", r.id, "수정")
                            : "") +
                        (["OPEN", "ASSIGNED"].includes(r.status)
                            ? button("assignee", r.id, "배정")
                            : "") +
                        (r.status !== "COMPLETED" ? button("status", r.id, "상태") : ""),
                ]),
            );
        return f.table(
            ["아이디", "이름", "역할"],
            rows.map((r) => [esc(r.id), esc(r.name), f.badge(r.role)]),
        );
    }
    FixOnManagement.table = table;
})();
