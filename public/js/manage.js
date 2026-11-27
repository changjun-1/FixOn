(async () => {
    const f = FixOn,
        root = document.getElementById("manager"),
        kind = root.dataset.page,
        admin = root.dataset.role === "ADMIN";
    const path = {
        reports: "reports",
        facilities: "facilities",
        categories: "categories",
        workOrders: "work-orders",
        users: "users",
    }[kind];
    const base = "/api/" + path,
        editor = document.getElementById("editor"),
        panel = document.getElementById("editor-panel");
    let page = 0,
        records = [],
        filters = {},
        facilities = [],
        categories = [],
        users = [],
        editing = null,
        suffix = "",
        mode = "";
    const { esc, options, statuses, select, field } = FixOnManagement;
    const reportStates = ["REPORTED", "CONFIRMED", "IN_PROGRESS", "RESOLVED", "REJECTED"],
        workStates = ["OPEN", "ASSIGNED", "IN_PROGRESS", "SUBMITTED", "COMPLETED", "CANCELLED"];
    function open(title, html, actionMode, record = null, endpoint = "") {
        mode = actionMode;
        editing = record;
        suffix = endpoint;
        editor.innerHTML = html + '<div class="wide"><button type="submit">저장</button></div>';
        document.getElementById("editor-title").textContent = title;
        panel.hidden = false;
        if (record)
            for (const element of editor.elements) {
                if (
                    !element.name ||
                    record[element.name] === undefined ||
                    record[element.name] === null
                )
                    continue;
                let value = record[element.name];
                if (element.type === "datetime-local") {
                    const d = new Date(value);
                    value = new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                }
                element.value = String(value);
            }
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    async function references() {
        if (kind === "reports")
            [facilities, categories] = await Promise.all([
                f.all("/api/facilities"),
                f.all("/api/categories"),
            ]);
        if (kind === "workOrders" && admin) users = (await f.api("/api/users")).data;
    }
    function form(record = null) {
        FixOnManagement.form({ kind, facilities, categories, open, editor }, record);
    }
    function table(rows) {
        return FixOnManagement.table(kind, admin, rows);
    }
    async function load() {
        document.getElementById("table").textContent = "불러오는 중…";
        try {
            const data = await f.api(
                base + "?" + new URLSearchParams({ ...filters, page, size: 10 }),
            );
            records = data.data;
            document.getElementById("table").innerHTML = table(records);
            const p = data.pagination;
            document.getElementById("pagination").innerHTML = p
                ? `<button id="prev" class="secondary" ${page === 0 ? "disabled" : ""}>이전</button><span>${page + 1} / ${Math.max(1, p.totalPages)} · 전체 ${p.total}건</span><button id="next" class="secondary" ${page + 1 >= p.totalPages ? "disabled" : ""}>다음</button>`
                : "";
            document.getElementById("prev")?.addEventListener("click", () => {
                page--;
                load();
            });
            document.getElementById("next")?.addEventListener("click", () => {
                page++;
                load();
            });
            if (kind === "workOrders") {
                const s = await f.api(base + "/summary");
                let summary = document.getElementById("work-summary");
                if (!summary) {
                    summary = document.createElement("p");
                    summary.id = "work-summary";
                    summary.className = "muted";
                    document.querySelector(".heading").append(summary);
                }
                let inventory = document.getElementById("work-inventory");
                if (!inventory) {
                    inventory = document.createElement("p");
                    inventory.id = "work-inventory";
                    inventory.className = "muted";
                    summary.after(inventory);
                }
                inventory.textContent = s.parts.length
                    ? "부품 재고 · " + s.parts.map((part) => `#${part.id} ${part.name} ${part.stock}개`).join(" · ")
                    : "등록된 부품이 없습니다.";
                summary.textContent = `전체 ${s.total}건 · 진행 중 ${s.IN_PROGRESS}건 · 완료 ${s.COMPLETED}건 · 기한 초과 ${s.overdue}건`;
            }
        } catch (e) {
            document.getElementById("table").textContent = "데이터를 불러오지 못했습니다.";
            f.notice(e.message, true);
        }
    }
    async function related(url, title, work = false) {
        const rows = await f.all(url);
        document.getElementById("related-title").textContent = title;
        document.getElementById("related-content").innerHTML = work
            ? f.table(
                  ["작업 번호", "신고 번호", "상태", "기한", "처리 결과"],
                  rows.map((r) => [
                      esc(r.id),
                      esc(r.reportId),
                      f.badge(r.status),
                      f.date(r.dueAt),
                      esc(r.resolutionNote || "—"),
                  ]),
              )
            : f.table(
                  ["신고 번호", "제목", "상태"],
                  rows.map((r) => [
                      esc(r.id),
                      `<a href="/reports/${r.id}">${esc(r.title)}</a>`,
                      f.badge(r.status),
                  ]),
              );
        document.getElementById("related").hidden = false;
        document.getElementById("related").scrollIntoView({ behavior: "smooth" });
    }
    document.getElementById("table").addEventListener("click", async (e) => {
        const b = e.target.closest("[data-action]");
        if (!b) return;
        const action = b.dataset.action,
            record = records.find((x) => String(x.id) === b.dataset.id);
        b.disabled = true;
        try {
            if (action === "edit") {
                await references();
                form(record);
            }
            if (action === "delete") {
                if (!confirm("삭제할까요? 연결된 기록이 있으면 삭제할 수 없습니다.")) return;
                await f.api(base + "/" + record.id, { method: "DELETE" });
                f.notice("삭제했습니다.");
                await load();
            }
            if (action === "toggle") {
                await f.api(base + "/" + record.id + "/active", {
                    method: "PATCH",
                    body: JSON.stringify({ active: !record.active }),
                });
                f.notice("활성 여부를 변경했습니다.");
                await load();
            }
            if (action === "priority")
                open(
                    "우선순위 변경",
                    field(
                        "priority",
                        "우선순위",
                        "select",
                        statuses(["LOW", "NORMAL", "HIGH", "URGENT"]),
                    ),
                    "save",
                    record,
                    "/priority",
                );
            if (action === "status") {
                let values;
                if (kind === "reports")
                    values =
                        { REPORTED: ["CONFIRMED", "REJECTED"], CONFIRMED: ["REJECTED"] }[
                            record.status
                        ] || [];
                else
                    values =
                        {
                            OPEN: ["CANCELLED"],
                            ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
                            IN_PROGRESS: ["SUBMITTED", "CANCELLED"],
                            SUBMITTED: ["COMPLETED", "IN_PROGRESS"],
                            CANCELLED: ["OPEN"],
                        }[record.status] || [];
                if (kind === "workOrders" && !admin)
                    values = values.filter((value) => ["IN_PROGRESS", "SUBMITTED"].includes(value) && record.status !== "SUBMITTED");
                if (!values.length)
                    throw new Error(
                        "직접 변경할 수 있는 상태가 없습니다. 정비 작업에서 진행하세요.",
                    );
                open(
                    record.status === "SUBMITTED" ? "작업 검수" : "상태 변경",
                    field("status", record.status === "SUBMITTED" ? "검수 결과" : "변경할 상태", "select",
                        record.status === "SUBMITTED"
                            ? [["COMPLETED", "승인"], ["IN_PROGRESS", "반려 · 재작업"]]
                            : statuses(values)) +
                        (kind === "workOrders"
                            ? field(
                                  "resolutionNote",
                                  "처리 결과 (제출 시 필수)",
                                  "textarea",
                                  null,
                                  false,
                              ) + (record.status === "SUBMITTED"
                                  ? field("comment", "검수 의견 (반려 시 필수)", "textarea", null, false)
                                  : record.status === "IN_PROGRESS"
                                      ? field("partsInput", "사용 부품 (번호:수량, 쉼표로 구분)", "text", null, false)
                                      : "")
                            : ""),
                    "save",
                    record,
                    "/status",
                );
            }
            if (action === "assignee") {
                await references();
                open(
                    "담당자와 지원 인력 배정",
                    field(
                        "assigneeId",
                        "담당자",
                        "select",
                        users.map((u) => [u.id, u.name]),
                    ) + field("supportInput", "지원 인력 ID (쉼표로 구분)", "text", null, false),
                    "save",
                    record,
                    "/assignee",
                );
                editor.elements.supportInput.value = (record.assignments || [])
                    .filter((item) => item.role === "SUPPORT").map((item) => item.userId).join(", ");
            }
            if (action === "dependencies") {
                open("선행 작업 지정",
                    field("dependenciesInput", "같은 신고의 선행 작업 번호 (쉼표로 구분)", "text", null, false),
                    "save", record);
                editor.elements.dependenciesInput.value = (record.dependencies || [])
                    .map((item) => item.prerequisiteId).join(", ");
            }
            if (action === "stock") {
                open("부품 입고",
                    field("stockCode", "부품 코드") + field("stockName", "부품 이름") +
                    field("stockQuantity", "수량", "number"), "save", record);
            }
            if (action === "related-reports")
                await related(base + "/" + record.id + "/reports", "관련 신고");
            if (action === "history")
                await related(
                    base + "/" + record.id + "/maintenance-history",
                    "시설 정비 이력",
                    true,
                );
            if (action === "create-work") {
                open(
                    "이 신고로 정비 작업 생성",
                    field("reportId", "신고 번호", "number") +
                        field("dueAt", "처리 기한", "datetime-local"),
                    "create-work",
                );
                editor.elements.reportId.value = record.id;
                editor.elements.reportId.readOnly = true;
            }
            if (action === "work-detail") {
                const r = await f.api(base + "/" + record.id);
                document.getElementById("related-title").textContent = `정비 작업 #${r.id}`;
                document.getElementById("related-content").innerHTML =
                    `<dl><dt>신고</dt><dd>${esc(r.Report?.title)}</dd><dt>상태</dt><dd>${f.badge(r.status)}</dd><dt>담당자</dt><dd>${esc(r.assignee?.name || "미배정")}</dd><dt>기한</dt><dd>${f.date(r.dueAt)}</dd><dt>처리 결과</dt><dd class="description">${esc(r.resolutionNote || "미기록")}</dd><dt>완료 일시</dt><dd>${f.date(r.completedAt)}</dd></dl>${f.workRelations(r)}`;
                document.getElementById("related").hidden = false;
            }
        } catch (error) {
            f.notice(error.message, true);
        } finally {
            b.disabled = false;
        }
    });
    editor.addEventListener("submit", async (e) => {
        e.preventDefault();
        const b = editor.querySelector("button[type=submit]");
        b.disabled = true;
        try {
            const data = Object.fromEntries(new FormData(editor));
            const split = (value) => value.split(",").map((item) => item.trim()).filter(Boolean);
            if (data.supportInput !== undefined) {
                data.supportIds = split(data.supportInput);
                delete data.supportInput;
            }
            if (data.dependenciesInput !== undefined) {
                data.prerequisiteIds = split(data.dependenciesInput);
                delete data.dependenciesInput;
            }
            if (data.partsInput !== undefined) {
                if (data.status === "SUBMITTED") data.parts = split(data.partsInput).map((item) => {
                    const [partId, quantity, extra] = item.split(":").map((value) => value.trim());
                    if (extra !== undefined || !partId || !quantity) throw new Error("부품은 번호:수량 형식으로 입력하세요.");
                    return { partId, quantity };
                });
                delete data.partsInput;
            }
            if (data.stockCode !== undefined) {
                data.stockReceipt = { code: data.stockCode, name: data.stockName, quantity: data.stockQuantity };
                for (const key of ["stockCode", "stockName", "stockQuantity"]) delete data[key];
            }
            for (const k of ["facilityId", "categoryId", "reportId"])
                if (data[k]) data[k] = Number(data[k]);
            if (data.active !== undefined) data.active = data.active === "true";
            if (data.dueAt) data.dueAt = new Date(data.dueAt).toISOString();
            for (const key of ["description", "resolutionNote"])
                if (data[key] === "") delete data[key];
            const url =
                mode === "create-work"
                    ? "/api/work-orders"
                    : base + (editing ? "/" + editing.id + suffix : "");
            const saved = await f.api(url, {
                method: editing ? "PATCH" : "POST",
                body: JSON.stringify(data),
            });
            if (kind === "reports" && !editing && mode !== "create-work") {
                location.href = "/reports/" + encodeURIComponent(saved.id);
                return;
            }
            panel.hidden = true;
            f.notice("저장했습니다.");
            await load();
        } catch (error) {
            f.notice(error.message, true);
        } finally {
            b.disabled = false;
        }
    });
    document.getElementById("close-editor").onclick = () => {
        panel.hidden = true;
    };
    document.getElementById("close-related").onclick = () => {
        document.getElementById("related").hidden = true;
    };
    document.getElementById("new-button").hidden = !(
        kind === "reports" ||
        (admin && kind !== "users")
    );
    document.getElementById("new-button").onclick = async () => {
        try {
            await references();
            form();
        } catch (e) {
            f.notice(e.message, true);
        }
    };
    const filterForm = document.getElementById("filters");
    const query = new URLSearchParams(location.search);
    const linkedReport = kind === "workOrders" && admin ? query.get("reportId") : null;
    if (linkedReport && /^[1-9][0-9]*$/.test(linkedReport)) {
        const heading = document.querySelector(".panel-heading p");
        const back = document.createElement("a");
        back.href = "/reports/" + linkedReport;
        back.textContent = "신고 #" + linkedReport + " 상세로 돌아가기";
        heading.replaceChildren(back);
    }
    if (kind !== "users") {
        try {
            await references();
            let html =
                kind === "categories"
                    ? ""
                    : '<input name="keyword" placeholder="검색어를 입력하세요" aria-label="검색어">';
            if (kind === "reports")
                html +=
                    select("status", "전체 상태", statuses(reportStates)) +
                    select(
                        "priority",
                        "전체 우선순위",
                        statuses(["LOW", "NORMAL", "HIGH", "URGENT"]),
                    ) +
                    select("facilityId", "전체 시설", options(facilities)) +
                    select("categoryId", "전체 분류", options(categories));
            if (kind === "facilities")
                html +=
                    '<input name="building" placeholder="건물" aria-label="건물"><input name="room" placeholder="호실" aria-label="호실">' +
                    select("active", "전체 활성 상태", [
                        ["true", "활성"],
                        ["false", "비활성"],
                    ]);
            if (kind === "categories")
                html += select("active", "전체 활성 상태", [
                    ["true", "활성"],
                    ["false", "비활성"],
                ]);
            if (kind === "workOrders")
                html +=
                    select("status", "전체 상태", statuses(workStates)) +
                    (admin ? select("assigneeId", "전체 담당자", options(users)) : "");
            filterForm.innerHTML =
                html +
                '<button>조회</button><button type="reset" class="secondary">초기화</button>' +
                (kind === "workOrders"
                    ? '<a class="button" href="/work-orders?overdue=true">기한 초과만 보기</a>'
                    : "");
            if (linkedReport && /^[1-9][0-9]*$/.test(linkedReport)) {
                const field = document.createElement("input");
                field.type = "hidden";
                field.name = "reportId";
                field.defaultValue = linkedReport;
                filterForm.append(field);
                filters.reportId = linkedReport;
            }
        } catch (e) {
            f.notice(e.message, true);
        }
    }
    filterForm.addEventListener("submit", (e) => {
        e.preventDefault();
        filters = Object.fromEntries([...new FormData(filterForm)].filter(([, v]) => v));
        page = 0;
        load();
    });
    filterForm.addEventListener("reset", () => {
        filters = filterForm.elements.reportId ? { reportId: filterForm.elements.reportId.value } : {};
        page = 0;
        load();
    });
    if (kind === "workOrders" && new URLSearchParams(location.search).get("overdue")) {
        try {
            await related(base + "/overdue", "기한 초과 미완료 작업", true);
        } catch (e) {
            f.notice(e.message, true);
        }
    }
    await load();
    if (kind === "reports" && query.get("new") === "1")
        document.getElementById("new-button").click();
})();
