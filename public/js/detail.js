(async () => {
    const f = FixOn;
    const reportId = encodeURIComponent(location.pathname.split("/").pop());
    const history = document.getElementById("report-history");
    const more = document.getElementById("history-more");
    let page = 0;
    const actions = {
        REPORT_CREATED: "신고 접수", REPORT_UPDATED: "신고 내용 수정",
        REPORT_STATUS_CHANGED: "신고 상태 변경", REPORT_PRIORITY_CHANGED: "우선순위 변경",
        WORK_CREATED: "정비 작업 생성", WORK_UPDATED: "정비 내용 수정",
        WORK_ASSIGNED: "담당자 배정", WORK_STATUS_CHANGED: "정비 상태 변경",
    };
    async function loadHistory() {
        more.disabled = true;
        try {
            const result = await f.api(`/api/reports/${reportId}/history?page=${page}&size=20`);
            const html = result.data.map((entry) => {
                const before = entry.before || {}, after = entry.after;
                const transition = before.status !== after.status && after.status
                    ? `<p>${before.status ? f.badge(before.status) + " → " : ""}${f.badge(after.status)}</p>` : "";
                const priority = entry.action === "REPORT_PRIORITY_CHANGED"
                    ? `<p>${f.badge(before.priority)} → ${f.badge(after.priority)}</p>` : "";
                const assignee = entry.action === "WORK_ASSIGNED"
                    ? `<p>정비 담당자: ${f.escape(after.assigneeName || "미배정")}</p>` : "";
                return `<li><strong>${f.escape(actions[entry.action] || entry.action)}</strong><small>${f.escape(entry.actorName)} · ${f.date(entry.createdAt)}</small>${transition}${priority}${assignee}${after.resolutionNote ? `<p class="description">${f.escape(after.resolutionNote)}</p>` : ""}</li>`;
            }).join("");
            if (!page) history.innerHTML = html || '<li class="muted">아직 기록된 처리 이력이 없습니다.</li>';
            else history.insertAdjacentHTML("beforeend", html);
            page++;
            more.hidden = page >= result.pagination.totalPages;
        } catch (error) {
            if (!page) history.textContent = "처리 이력을 불러오지 못했습니다.";
            f.notice(error.message, true);
            more.hidden = false;
        } finally {
            more.disabled = false;
        }
    }
    more.addEventListener("click", loadHistory);
    try {
        const r = await f.api(
            "/api/reports/" + reportId,
        );
        const w = r.WorkOrder;
        document.getElementById("detail").innerHTML =
            `<h2>${f.escape(r.title)}</h2><p>${f.badge(r.status)} ${f.badge(r.priority)}</p><dl><dt>시설</dt><dd>${f.escape(r.Facility?.building)} ${f.escape(r.Facility?.room)} · ${f.escape(r.Facility?.name)}</dd><dt>고장 분류</dt><dd>${f.escape(r.Category?.name)}</dd><dt>등록일</dt><dd>${f.date(r.createdAt)}</dd><dt>상세 내용</dt><dd class="description">${f.escape(r.description)}</dd></dl>${r.imageUrl ? `<img class="report-image" src="${f.escape(r.imageUrl)}" alt="신고 참고 이미지" referrerpolicy="no-referrer">` : ""}<hr><h2>정비 처리 현황</h2>${w ? `<dl><dt>상태</dt><dd>${f.badge(w.status)}</dd><dt>담당자</dt><dd>${f.escape(w.assignee?.name || "미배정")}</dd><dt>처리 기한</dt><dd>${f.date(w.dueAt)}</dd><dt>처리 결과</dt><dd class="description">${f.escape(w.resolutionNote || "아직 기록되지 않았습니다.")}</dd></dl>` : '<p class="muted">아직 정비 작업이 생성되지 않았습니다.</p>'}`;
        await loadHistory();
    } catch (e) {
        history.textContent = "조회 권한이 있는 신고의 처리 이력만 확인할 수 있습니다.";
        document.getElementById("detail").textContent = e.message;
        f.notice(e.message, true);
    }
})();
