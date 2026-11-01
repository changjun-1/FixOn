document
  .getElementById("auth-form")
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget,
      button = form.querySelector("button");
    button.disabled = true;
    try {
      await FixOn.api("/api/users/" + form.dataset.action, {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      if (form.dataset.action === "register") {
        FixOn.notice("가입했습니다. 로그인 화면으로 이동합니다.");
        location.href = "/login";
      } else location.href = "/";
    } catch (e) {
      FixOn.notice(e.message, true);
    } finally {
      button.disabled = false;
    }
  });
