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
  const esc = (v) => f.escape(v),
    button = (action, id, label, danger = false) =>
      `<button type="button" data-action="${action}" data-id="${esc(id)}" class="${danger ? "danger" : "secondary"}">${label}</button>`;
  const options = (rows, valueKey = "id", labelKey = "name") =>
    rows.map((r) => [r[valueKey], r[labelKey]]);
  const statuses = (values) => values.map((v) => [v, f.labels[v]]);
  const reportStates = [
      "REPORTED",
      "CONFIRMED",
      "IN_PROGRESS",
      "RESOLVED",
      "REJECTED",
    ],
    workStates = ["OPEN", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
  function select(name, label, values, blank = true) {
    return `<select name="${name}" aria-label="${label}">${blank ? `<option value="">${label}</option>` : ""}${values.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("")}</select>`;
  }
  function field(name, label, type = "text", values = null, required = true) {
    let input = values
      ? select(name, "선택하세요", values, true).replace(
          ' aria-label="선택하세요"',
          "",
        )
      : type === "textarea"
        ? `<textarea name="${name}" maxlength="10000"></textarea>`
        : `<input name="${name}" type="${type}" ${type === "number" ? 'min="1" step="1"' : ""}>`;
    if (required)
      input = input.replace(/<(input|select|textarea)/, "<$1 required");
    return `<label class="${type === "textarea" ? "wide" : ""}">${label}${required ? " *" : ""}${input}</label>`;
  }
  function open(title, html, actionMode, record = null, endpoint = "") {
    mode = actionMode;
    editing = record;
    suffix = endpoint;
    editor.innerHTML =
      html + '<div class="wide"><button type="submit">저장</button></div>';
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
          value = new Date(d - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
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
    if (kind === "workOrders") users = (await f.api("/api/users")).data;
  }
  function form(record = null) {
    if (kind === "reports") {
      const fs = facilities
          .filter((x) => x.active || x.id === record?.facilityId)
          .map((x) => [x.id, `${x.building} ${x.room} · ${x.name}`]),
        cs = options(
          categories.filter((x) => x.active || x.id === record?.categoryId),
        );
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
  function table(rows) {
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
            ? button("edit", r.id, "수정") +
              button("delete", r.id, "삭제", true)
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
              ? button("edit", r.id, "수정") +
                button("delete", r.id, "삭제", true)
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
        summary.textContent = `전체 ${s.total}건 · 진행 중 ${s.IN_PROGRESS}건 · 완료 ${s.COMPLETED}건 · 기한 초과 ${s.overdue}건`;
      }
    } catch (e) {
      document.getElementById("table").textContent =
        "데이터를 불러오지 못했습니다.";
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
        if (!confirm("삭제할까요? 연결된 기록이 있으면 삭제할 수 없습니다."))
          return;
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
              IN_PROGRESS: ["COMPLETED", "CANCELLED"],
              CANCELLED: ["OPEN"],
            }[record.status] || [];
        if (!values.length)
          throw new Error(
            "직접 변경할 수 있는 상태가 없습니다. 정비 작업에서 진행하세요.",
          );
        open(
          "상태 변경",
          field("status", "변경할 상태", "select", statuses(values)) +
            (kind === "workOrders"
              ? field(
                  "resolutionNote",
                  "처리 결과 (완료 시 필수)",
                  "textarea",
                  null,
                  false,
                )
              : ""),
          "save",
          record,
          "/status",
        );
      }
      if (action === "assignee") {
        await references();
        open(
          "담당자 지정",
          field(
            "assigneeId",
            "담당자",
            "select",
            users.map((u) => [u.id, `${u.name} (${u.id})`]),
          ),
          "save",
          record,
          "/assignee",
        );
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
        document.getElementById("related-title").textContent =
          `정비 작업 #${r.id}`;
        document.getElementById("related-content").innerHTML =
          `<dl><dt>신고</dt><dd>${esc(r.Report?.title)}</dd><dt>상태</dt><dd>${f.badge(r.status)}</dd><dt>담당자</dt><dd>${esc(r.assignee?.name || "미배정")}</dd><dt>기한</dt><dd>${f.date(r.dueAt)}</dd><dt>처리 결과</dt><dd class="description">${esc(r.resolutionNote || "미기록")}</dd><dt>완료 일시</dt><dd>${f.date(r.completedAt)}</dd></dl>`;
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
      await f.api(url, {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(data),
      });
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
          select("assigneeId", "전체 담당자", options(users));
      filterForm.innerHTML =
        html +
        '<button>조회</button><button type="reset" class="secondary">초기화</button>' +
        (kind === "workOrders"
          ? '<a class="button" href="/work-orders?overdue=true">기한 초과만 보기</a>'
          : "");
    } catch (e) {
      f.notice(e.message, true);
    }
  }
  filterForm.addEventListener("submit", (e) => {
    e.preventDefault();
    filters = Object.fromEntries(
      [...new FormData(filterForm)].filter(([, v]) => v),
    );
    page = 0;
    load();
  });
  filterForm.addEventListener("reset", () => {
    filters = {};
    page = 0;
    load();
  });
  if (
    kind === "workOrders" &&
    new URLSearchParams(location.search).get("overdue")
  ) {
    try {
      await related(base + "/overdue", "기한 초과 미완료 작업", true);
    } catch (e) {
      f.notice(e.message, true);
    }
  }
  await load();
})();
