(async () => {
  const f = FixOn;
  try {
    const r = await f.api(
      "/api/reports/" + encodeURIComponent(location.pathname.split("/").pop()),
    );
    const w = r.WorkOrder;
    document.getElementById("detail").innerHTML =
      `<h2>${f.escape(r.title)}</h2><p>${f.badge(r.status)} ${f.badge(r.priority)}</p><dl><dt>시설</dt><dd>${f.escape(r.Facility?.building)} ${f.escape(r.Facility?.room)} · ${f.escape(r.Facility?.name)}</dd><dt>고장 분류</dt><dd>${f.escape(r.Category?.name)}</dd><dt>등록일</dt><dd>${f.date(r.createdAt)}</dd><dt>상세 내용</dt><dd class="description">${f.escape(r.description)}</dd></dl>${r.imageUrl ? `<img class="report-image" src="${f.escape(r.imageUrl)}" alt="신고 참고 이미지" referrerpolicy="no-referrer">` : ""}<hr><h2>정비 처리 현황</h2>${w ? `<dl><dt>상태</dt><dd>${f.badge(w.status)}</dd><dt>담당자</dt><dd>${f.escape(w.assigneeId || "미배정")}</dd><dt>처리 기한</dt><dd>${f.date(w.dueAt)}</dd><dt>처리 결과</dt><dd class="description">${f.escape(w.resolutionNote || "아직 기록되지 않았습니다.")}</dd></dl>` : '<p class="muted">아직 정비 작업이 생성되지 않았습니다.</p>'}`;
  } catch (e) {
    document.getElementById("detail").textContent = e.message;
    f.notice(e.message, true);
  }
})();
