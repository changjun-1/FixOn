(async () => {
  const f = FixOn;
  try {
    const stats = await f.api("/api/reports/stats");
    document.getElementById("stats").innerHTML = [
      ["전체 신고", stats.total],
      ["접수·확인", stats.REPORTED + stats.CONFIRMED],
      ["처리 중", stats.IN_PROGRESS],
      ["해결 완료", stats.RESOLVED],
    ]
      .map(
        ([label, count]) =>
          `<div class="stat"><span>${label}</span><strong>${count}<small>건</small></strong></div>`,
      )
      .join("");
    const reports = await f.api("/api/reports?size=5");
    document.getElementById("recent").innerHTML = f.table(
      ["신고 제목", "시설", "처리 상태", "등록일"],
      reports.data.map((r) => [
        `<a href="/reports/${r.id}">${f.escape(r.title)}</a>`,
        f.escape(r.Facility?.name),
        f.badge(r.status),
        f.date(r.createdAt),
      ]),
    );
  } catch (e) {
    f.notice(e.message, true);
    document.getElementById("stats").textContent =
      "현황을 불러오지 못했습니다.";
    document.getElementById("recent").textContent = "조회 실패";
  }
})();
