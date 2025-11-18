import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
const allowedWeekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ImportAlarmsModal = ({ open, onClose, onSubmit }) => {
    const [jsonText, setJsonText] = useState("");
    const [replaceExisting, setReplaceExisting] = useState(false);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    useEffect(() => {
        if (!open) {
            setJsonText("");
            setError(null);
            setReplaceExisting(false);
            setIsSubmitting(false);
        }
    }, [open]);
    if (!open)
        return null;
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        let payloads;
        try {
            payloads = parseToPayloads(jsonText);
        }
        catch (err) {
            setError(toErrorMessage(err, "JSON の解析に失敗しました。"));
            return;
        }
        if (payloads.length === 0) {
            setError("インポート対象が見つかりません。");
            return;
        }
        setIsSubmitting(true);
        try {
            await onSubmit(payloads, replaceExisting);
            onClose();
        }
        catch (err) {
            setError(toErrorMessage(err, "インポートに失敗しました。"));
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsx("div", { className: "modal-backdrop", children: _jsxs("div", { className: "modal-panel", children: [_jsx("button", { type: "button", className: "icon-button modal-close", "aria-label": "\u9589\u3058\u308B", onClick: onClose, children: "\u00D7" }), _jsxs("form", { className: "card import-card", onSubmit: handleSubmit, children: [_jsxs("div", { className: "form-row", children: [_jsx("span", { children: "JSON \u304B\u3089\u30A4\u30F3\u30DD\u30FC\u30C8" }), _jsxs("p", { className: "import-hint", children: ["Sebastian \u306E ", _jsx("code", { children: "alarms.json" }), " \u3082\u3057\u304F\u306F", " ", _jsx("code", { children: "[{ ... }]" }), " \u5F62\u5F0F\u3067\u8CBC\u308A\u4ED8\u3051\u3066\u304F\u3060\u3055\u3044\u3002"] })] }), _jsx("textarea", { className: "json-textarea", placeholder: `[
  {
    "title": "朝のストレッチ",
    "timeLabel": "07:30",
    "repeatEnabled": true,
    "repeatDays": ["Mon", "Wed", "Fri"],
    "url": "https://example.com",
    "leadMinutes": 5
  }
]`, value: jsonText, onChange: (event) => setJsonText(event.target.value), "aria-label": "\u30A2\u30E9\u30FC\u30E0 JSON" }), _jsxs("label", { className: "import-checkbox", children: [_jsx("input", { type: "checkbox", checked: replaceExisting, onChange: (event) => setReplaceExisting(event.target.checked) }), "\u65E2\u5B58\u306E\u30A2\u30E9\u30FC\u30E0\u3092\u5168\u3066\u524A\u9664\u3057\u3066\u304B\u3089\u53D6\u308A\u8FBC\u3080"] }), error && _jsx("p", { className: "error-text", children: error }), _jsxs("div", { className: "dialog-actions", children: [_jsx("button", { type: "button", className: "ghost", onClick: onClose, disabled: isSubmitting, children: "\u30AD\u30E3\u30F3\u30BB\u30EB" }), _jsx("button", { type: "submit", disabled: isSubmitting, children: isSubmitting ? "取り込み中..." : "インポートする" })] })] })] }) }));
};
const parseToPayloads = (rawText) => {
    if (!rawText.trim()) {
        return [];
    }
    let parsed;
    try {
        parsed = JSON.parse(rawText);
    }
    catch {
        throw new Error("JSON の構文を確認してください。");
    }
    const records = extractRecordArray(parsed);
    return records.map((item, index) => normalizePayload(item, index));
};
const extractRecordArray = (value) => {
    if (Array.isArray(value))
        return value;
    if (value && typeof value === "object") {
        const maybeArray = value.alarms;
        if (Array.isArray(maybeArray)) {
            return maybeArray;
        }
    }
    throw new Error("ルートは配列、もしくは { \"alarms\": [...] } 形式で指定してください。");
};
const normalizePayload = (value, index) => {
    if (!value || typeof value !== "object") {
        throw new Error(`${index + 1} 件目: オブジェクトではありません。`);
    }
    const record = value;
    const title = pickString(record, ["title"], index, "title");
    const timeLabel = pickString(record, ["timeLabel", "time_label"], index, "timeLabel");
    const url = pickOptionalString(record, ["url"]);
    const repeatDaysValue = pickOptional(record, ["repeatDays", "repeat_days"]);
    const repeatDays = normalizeRepeatDays(repeatDaysValue, index);
    const repeatEnabledValue = pickOptional(record, ["repeatEnabled", "repeat_enabled"]);
    const repeatEnabled = (typeof repeatEnabledValue === "boolean" ? repeatEnabledValue : !!repeatEnabledValue) &&
        repeatDays.length > 0;
    const leadMinutesValue = pickOptional(record, ["leadMinutes", "lead_minutes"]);
    const leadMinutes = normalizeLeadMinutes(leadMinutesValue);
    return {
        title: title.trim(),
        timeLabel: timeLabel.trim(),
        url,
        repeatEnabled,
        repeatDays,
        leadMinutes,
    };
};
const pickOptional = (record, keys) => {
    for (const key of keys) {
        if (key in record) {
            return record[key];
        }
    }
    return undefined;
};
const pickString = (record, keys, index, field) => {
    const value = pickOptional(record, keys);
    if (typeof value === "string" && value.trim()) {
        return value;
    }
    throw new Error(`${index + 1} 件目: ${field} が見つからないか文字列ではありません。`);
};
const pickOptionalString = (record, keys) => {
    const value = pickOptional(record, keys);
    if (typeof value === "string" && value.trim()) {
        return value.trim();
    }
    return undefined;
};
const normalizeRepeatDays = (value, index) => {
    if (!value) {
        return [];
    }
    const values = Array.isArray(value)
        ? value
            .filter((item) => typeof item === "string")
            .map((item) => item.trim())
        : typeof value === "string"
            ? value
                .split(/[, ]+/)
                .map((day) => day.trim())
                .filter(Boolean)
            : [];
    const normalized = values
        .map((day) => (day.length ? (day[0].toUpperCase() + day.slice(1, 3).toLowerCase()) : day))
        .filter((day) => allowedWeekdays.includes(day));
    if (values.length > 0 && normalized.length === 0) {
        throw new Error(`${index + 1} ??: repeatDays ????????????????`);
    }
    return Array.from(new Set(normalized));
};
const normalizeLeadMinutes = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string" && value.trim()) {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }
    return 3;
};
const toErrorMessage = (err, fallback) => err instanceof Error ? err.message : typeof err === "string" ? err : fallback;
export default ImportAlarmsModal;
