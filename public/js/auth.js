const socialMessages = {
    unavailable: "이 소셜 로그인은 아직 준비 중입니다. 아이디로 로그인해 주세요.",
    cancelled: "소셜 로그인이 취소되었습니다.",
    invalid: "로그인 요청이 만료되었거나 유효하지 않습니다. 다시 시도해 주세요.",
    failed: "소셜 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.",
};
const socialError = new URLSearchParams(location.search).get("social");
if (Object.hasOwn(socialMessages, socialError)) FixOn.notice(socialMessages[socialError], true);

document.getElementById("auth-form").addEventListener("submit", async (event) => {
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
