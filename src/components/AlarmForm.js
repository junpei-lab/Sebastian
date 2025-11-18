import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import TimePicker from "./TimePicker";
const weekdayOptions = [
    { key: "Mon", label: "月" },
    { key: "Tue", label: "火" },
    { key: "Wed", label: "水" },
    { key: "Thu", label: "木" },
    { key: "Fri", label: "金" },
    { key: "Sat", label: "土" },
    { key: "Sun", label: "日" }
];
const defaultTime = () => dayjs().add(10, "minute").format("HH:mm");
const defaultWeekdays = () => ["Mon", "Tue", "Wed", "Thu", "Fri"];
const DEFAULT_LEAD_MINUTES = 3;
const clampLeadMinutesValue = (value) => Math.max(0, Math.min(720, Math.floor(value)));
const AlarmForm = ({ onSubmit, onSuccess, initialValues, defaultLeadMinutes, heading, submitLabel, submittingLabel }) => {
    const sanitizedDefaultLeadMinutes = clampLeadMinutesValue(Number.isFinite(defaultLeadMinutes) ? defaultLeadMinutes : DEFAULT_LEAD_MINUTES);
    const [title, setTitle] = useState(initialValues?.title ?? "");
    const [timeLabel, setTimeLabel] = useState(initialValues?.timeLabel ?? defaultTime());
    const [url, setUrl] = useState(initialValues?.url ?? "");
    const [repeatEnabled, setRepeatEnabled] = useState(initialValues?.repeatEnabled ?? false);
    const [repeatDays, setRepeatDays] = useState(initialValues?.repeatDays && initialValues.repeatDays.length > 0
        ? [...initialValues.repeatDays]
        : defaultWeekdays());
    const [leadMinutes, setLeadMinutes] = useState(initialValues?.leadMinutes ?? sanitizedDefaultLeadMinutes);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!initialValues)
            return;
        setTitle(initialValues.title ?? "");
        setTimeLabel(initialValues.timeLabel ?? defaultTime());
        setUrl(initialValues.url ?? "");
        setRepeatEnabled(initialValues.repeatEnabled ?? false);
        setRepeatDays(initialValues.repeatDays && initialValues.repeatDays.length > 0
            ? [...initialValues.repeatDays]
            : defaultWeekdays());
        setLeadMinutes(initialValues.leadMinutes ?? sanitizedDefaultLeadMinutes);
    }, [initialValues, sanitizedDefaultLeadMinutes]);
    const disableSubmit = useMemo(() => {
        if (!timeLabel)
            return true;
        if (repeatEnabled && repeatDays.length === 0)
            return true;
        return submitting;
    }, [repeatEnabled, repeatDays.length, submitting, timeLabel]);
    const toggleDay = (day) => {
        setRepeatDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
    };
    const toggleRepeat = () => {
        setRepeatEnabled((prev) => !prev);
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (disableSubmit)
            return;
        setSubmitting(true);
        setError(null);
        try {
            // URL は http/https のみ許可する
            const trimmedUrl = url.trim();
            if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
                setError("URL は http もしくは https で始めてください。");
                setSubmitting(false);
                return;
            }
            await onSubmit({
                title: title.trim(),
                timeLabel,
                url: trimmedUrl || undefined,
                repeatEnabled,
                repeatDays,
                leadMinutes
            });
            setTitle("");
            setTimeLabel(defaultTime());
            setUrl("");
            setRepeatEnabled(false);
            setRepeatDays(defaultWeekdays());
            setLeadMinutes(sanitizedDefaultLeadMinutes);
            onSuccess?.();
        }
        catch (err) {
            console.error(err);
            setError("アラームの追加に失敗しました。");
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("form", { className: "card", onSubmit: handleSubmit, children: [_jsx("h2", { children: heading ?? "新規アラーム追加" }), _jsxs("div", { className: "form-row", children: [_jsx("span", { children: "\u6642\u523B" }), _jsx(TimePicker, { value: timeLabel, onChange: setTimeLabel })] }), _jsxs("label", { className: "form-row", children: [_jsx("span", { children: "\u4F55\u5206\u524D\u306B\u9CF4\u3089\u3059\u304B" }), _jsx("input", { type: "number", min: 0, max: 720, step: 1, value: leadMinutes, onChange: (event) => {
                            const parsed = Number(event.target.value);
                            const clamped = clampLeadMinutesValue(Number.isFinite(parsed) ? parsed : 0);
                            setLeadMinutes(clamped);
                        } })] }), _jsxs("label", { className: "form-row", children: [_jsx("span", { children: "\u30BF\u30A4\u30C8\u30EB\uFF08\u4EFB\u610F\uFF09" }), _jsx("input", { type: "text", value: title, placeholder: "\u4F8B\uFF1A\u671D\u4F1A\uFF08\u7A7A\u6B04\u3067\u3082\u53EF\uFF09", onChange: (e) => setTitle(e.target.value) })] }), _jsxs("label", { className: "form-row", children: [_jsx("span", { children: "URL\uFF08\u4EFB\u610F\uFF09" }), _jsx("input", { type: "url", value: url, placeholder: "https://example.com", onChange: (e) => setUrl(e.target.value) })] }), _jsx("div", { className: "form-row", children: _jsxs("div", { className: "alarm-repeat-row form-repeat-row", children: [_jsx("span", { className: "alarm-repeat-label", children: "\u7E70\u308A\u8FD4\u3057\u3092\u6709\u52B9\u306B\u3059\u308B" }), _jsx("div", { className: repeatEnabled
                                ? "alarm-switch repeat-toggle-switch active"
                                : "alarm-switch repeat-toggle-switch", role: "switch", "aria-checked": repeatEnabled, "aria-label": "\u7E70\u308A\u8FD4\u3057\u3092\u6709\u52B9\u306B\u3059\u308B", tabIndex: 0, onClick: toggleRepeat, onKeyDown: (event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    toggleRepeat();
                                }
                            } })] }) }), repeatEnabled && (_jsx("div", { className: "weekday-grid", children: weekdayOptions.map((option) => (_jsx("button", { type: "button", className: repeatDays.includes(option.key) ? "weekday active" : "weekday", onClick: () => toggleDay(option.key), children: option.label }, option.key))) })), repeatEnabled && repeatDays.length === 0 && (_jsx("p", { className: "error-text", children: "\u7E70\u308A\u8FD4\u3057\u304C ON \u306E\u5834\u5408\u306F\u66DC\u65E5\u3092 1 \u3064\u4EE5\u4E0A\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002" })), error && _jsx("p", { className: "error-text", children: error }), _jsx("button", { type: "submit", className: "form-submit-btn", disabled: disableSubmit, children: submitting ? submittingLabel ?? "追加中..." : submitLabel ?? "アラームを追加" })] }));
};
export default AlarmForm;
