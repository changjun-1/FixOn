(() => {
    const f = FixOn;
    const esc = (v) => f.escape(v),
        button = (action, id, label, danger = false) =>
            `<button type="button" data-action="${action}" data-id="${esc(id)}" class="${danger ? "danger" : "secondary"}">${label}</button>`;
    const options = (rows, valueKey = "id", labelKey = "name") =>
        rows.map((r) => [r[valueKey], r[labelKey]]);
    const statuses = (values) => values.map((v) => [v, f.labels[v]]);
    function select(name, label, values, blank = true) {
        return `<select name="${name}" aria-label="${label}">${blank ? `<option value="">${label}</option>` : ""}${values.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("")}</select>`;
    }
    function field(name, label, type = "text", values = null, required = true) {
        let input = values
            ? select(name, "선택하세요", values, true).replace(' aria-label="선택하세요"', "")
            : type === "textarea"
              ? `<textarea name="${name}" maxlength="10000"></textarea>`
              : `<input name="${name}" type="${type}" ${type === "number" ? 'min="1" step="1"' : ""}>`;
        if (required) input = input.replace(/<(input|select|textarea)/, "<$1 required");
        return `<label class="${type === "textarea" ? "wide" : ""}">${label}${required ? " *" : ""}${input}</label>`;
    }
    window.FixOnManagement = { esc, button, options, statuses, select, field };
})();
