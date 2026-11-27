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
    const detail = document.getElementById("detail");
    const editor = document.getElementById("report-work-form");
    const statusText = {
        REPORTED: "관리자가 신고를 확인할 예정입니다.",
        CONFIRMED: "정비 작업을 준비하고 있습니다.",
        IN_PROGRESS: "정비 또는 결과 검수가 진행 중입니다.",
        RESOLVED: "정비가 완료되었습니다. 아래에서 처리 결과를 확인하세요.",
        REJECTED: "신고가 반려되었습니다. 아래 처리 이력을 확인하세요.",
    };

    function renderWork(work) {
        return `<details class="report-work-card">
            <summary><strong>작업 #${f.escape(work.id)}</strong> ${f.badge(work.status)}
            <span>기한 ${f.date(work.dueAt)}</span></summary>
            <p class="description">${f.escape(work.resolutionNote || "아직 등록된 처리 결과가 없습니다.")}</p>
            <p class="muted">주 담당자 · ${f.escape(work.assignee?.name || "미배정")}</p>
            ${f.workRelations(work)}
        </details>`;
    }

    async function loadReport() {
        const report = await f.api("/api/reports/" + reportId);
        const work = report.WorkOrders || [];
        const active = work.filter((item) => item.status !== "CANCELLED");
        const stages = ["REPORTED", "CONFIRMED", "IN_PROGRESS", "RESOLVED"];
        const stageLabels = ["접수", "확인", "정비·검수", "해결 완료"];
        const current = stages.indexOf(report.status);
        detail.innerHTML = `
            <div class="panel-heading"><h2>${f.escape(report.title)}</h2>${f.badge(report.status)}</div>
            <p>${f.escape(statusText[report.status])}</p>
            ${current < 0 ? "" : `<ol class="report-progress" aria-label="신고 진행 단계">${stageLabels.map((label, index) =>
                `<li class="${index < current ? "passed" : ""}" ${index === current ? 'aria-current="step"' : ""}>${label}</li>`).join("")}</ol>`}
            <dl><dt>시설</dt><dd>${f.escape(report.Facility?.building)} ${f.escape(report.Facility?.room)} · ${f.escape(report.Facility?.name)}</dd>
            <dt>분류</dt><dd>${f.escape(report.Category?.name)}</dd>
            <dt>우선순위</dt><dd>${f.badge(report.priority)}</dd>
            <dt>등록일</dt><dd>${f.date(report.createdAt)}</dd>
            <dt>신고 내용</dt><dd class="description">${f.escape(report.description)}</dd></dl>
            ${report.imageUrl ? `<img class="report-image" src="${f.escape(report.imageUrl)}" alt="신고 참고 이미지" referrerpolicy="no-referrer">` : ""}
            <div class="report-work-heading"><h3>정비 작업</h3>
            <span>완료 ${active.filter((item) => item.status === "COMPLETED").length} / ${active.length}건</span></div>
            ${work.length ? work.map(renderWork).join("") : '<p class="muted">아직 등록된 정비 작업이 없습니다.</p>'}`;
        if (editor) {
            editor.hidden = !["REPORTED", "CONFIRMED", "IN_PROGRESS"].includes(report.status);
            const link = document.getElementById("report-work-link");
            const next = document.getElementById("report-work-next");
            link.href = "/work-orders?reportId=" + encodeURIComponent(report.id);
            link.hidden = !work.length;
            const unassigned = active.filter((item) => item.status === "OPEN").length;
            const submitted = active.filter((item) => item.status === "SUBMITTED").length;
            const pending = [];
            if (unassigned) pending.push(`담당자 배정 ${unassigned}건`);
            if (submitted) pending.push(`결과 검수 ${submitted}건`);
            next.textContent = pending.join(" · ");
            next.hidden = pending.length === 0;
        }
    }

    editor?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const button = editor.querySelector("button[type=submit]");
        button.disabled = true;
        try {
            const { dueAt } = Object.fromEntries(new FormData(editor));
            await f.api("/api/work-orders", {
                method: "POST", body: JSON.stringify({ reportId, dueAt: new Date(dueAt).toISOString() }),
            });
            editor.reset();
            f.notice("정비 작업을 등록했습니다.");
            await loadReport();
            page = 0;
            await loadHistory();
        } catch (error) {
            f.notice(error.message, true);
        } finally {
            button.disabled = false;
        }
    });

    try {
        await loadReport();
        await loadHistory();
    } catch (error) {
        history.textContent = "처리 이력을 표시할 수 없습니다.";
        detail.textContent = error.message;
        f.notice(error.message, true);
    }
})();
