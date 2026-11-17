(() => {
    const { field, options, statuses } = FixOnManagement;
    function form(context, record = null) {
        const { kind, facilities, categories, open, editor } = context;
        if (kind === "reports") {
            const fs = facilities
                    .filter((x) => x.active || x.id === record?.facilityId)
                    .map((x) => [x.id, `${x.building} ${x.room} · ${x.name}`]),
                cs = options(categories.filter((x) => x.active || x.id === record?.categoryId));
            open(
                record ? "신고 수정" : "새 고장 신고",
                field("title", "신고 제목") +
                    field("facilityId", "시설", "select", fs) +
                    field("categoryId", "고장 분류", "select", cs) +
                    (!record
                        ? field(
                              "priority",
                              "우선순위",
                              "select",
                              statuses(["LOW", "NORMAL", "HIGH", "URGENT"]),
                          )
                        : "") +
                    field("description", "고장 내용", "textarea") +
                    field("imageUrl", "참고 이미지 URL", "url", null, false),
                "save",
                record,
            );
            if (!record) editor.elements.priority.value = "NORMAL";
        }
        if (kind === "facilities")
            open(
                record ? "시설 수정" : "시설 등록",
                field("name", "시설명") +
                    field("building", "건물") +
                    field("room", "호실") +
                    field(
                        "facilityType",
                        "시설 유형",
                        "select",
                        [
                            "ELECTRICAL",
                            "HVAC",
                            "COMPUTER",
                            "AV_EQUIPMENT",
                            "FURNITURE",
                            "PLUMBING",
                            "OTHER",
                        ].map((v) => [v, v]),
                    ) +
                    field("description", "설명", "textarea", null, false) +
                    (record
                        ? field("active", "활성 여부", "select", [
                              ["true", "활성"],
                              ["false", "비활성"],
                          ])
                        : ""),
                "save",
                record,
            );
        if (kind === "categories")
            open(
                record ? "분류 수정" : "분류 등록",
                (!record ? field("code", "고유 코드 (영문 대문자)") : "") +
                    field("name", "분류명") +
                    field("description", "설명", "textarea", null, false),
                "save",
                record,
            );
        if (kind === "workOrders")
            open(
                record ? "정비 작업 수정" : "정비 작업 생성",
                (!record ? field("reportId", "연결할 신고 번호", "number") : "") +
                    field("dueAt", "처리 기한", "datetime-local") +
                    field("resolutionNote", "처리 결과", "textarea", null, false),
                "save",
                record,
            );
    }
    FixOnManagement.form = form;
})();
