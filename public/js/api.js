window.FixOn = {
  labels: {
    REPORTED: "접수",
    CONFIRMED: "확인",
    IN_PROGRESS: "진행 중",
    RESOLVED: "해결 완료",
    REJECTED: "반려",
    OPEN: "작업 대기",
    ASSIGNED: "담당자 배정",
    COMPLETED: "작업 완료",
    CANCELLED: "취소",
    LOW: "낮음",
    NORMAL: "보통",
    HIGH: "높음",
    URGENT: "긴급",
    USER: "일반 사용자",
    ADMIN: "관리자",
  },
  escape(v) {
    return String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  },
  badge(v) {
    return `<span class="badge ${this.escape(v)}">${this.escape(this.labels[v] || v)}</span>`;
  },
  notice(message, error = false) {
    const el = document.getElementById("notice");
    el.textContent = message;
    el.className = error ? "error" : "";
  },
  async api(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')
          .content,
        ...options.headers,
      },
    });
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok) {
      if (response.status === 401 && !url.endsWith("/login"))
        this.notice(
          "세션이 만료되었습니다. 로그인 화면에서 다시 로그인하세요.",
          true,
        );
      throw new Error(data?.error || "요청을 처리할 수 없습니다.");
    }
    if (data?.csrfToken)
      document.querySelector('meta[name="csrf-token"]').content =
        data.csrfToken;
    return data;
  },
  async all(url) {
    let result = [],
      page = 0,
      pages;
    do {
      const data = await this.api(
        url + (url.includes("?") ? "&" : "?") + `size=100&page=${page}`,
      );
      result.push(...data.data);
      pages = data.pagination.totalPages;
      page++;
    } while (page < pages);
    return result;
  },
  date(value) {
    return value ? new Date(value).toLocaleString("ko-KR") : "—";
  },
  table(headers, rows) {
    return rows.length
      ? `<table><thead><tr>${headers.map((h) => `<th>${this.escape(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((v) => `<td>${v}</td>`).join("")}</tr>`).join("")}</tbody></table>`
      : '<div class="empty">등록된 데이터가 없습니다.</div>';
  },
};
document.addEventListener("DOMContentLoaded", () => {
  for (const a of document.querySelectorAll("nav a"))
    if (a.pathname === location.pathname) a.classList.add("active");
  document.getElementById("logout")?.addEventListener("click", async () => {
    try {
      await FixOn.api("/api/users/logout", { method: "POST", body: "{}" });
      location.href = "/login";
    } catch (e) {
      FixOn.notice(e.message, true);
    }
  });
});
