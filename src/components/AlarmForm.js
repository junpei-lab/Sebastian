import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
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
const AlarmForm = ({ onSubmit }) => {
    const [title, setTitle] = useState("");
    const [timeLabel, setTimeLabel] = useState(defaultTime());
    const [url, setUrl] = useState("");
    const [repeatEnabled, setRepeatEnabled] = useState(false);
    const [repeatDays, setRepeatDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri"]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const disableSubmit = useMemo(() => {
        if (!title.trim())
            return true;
        if (!timeLabel)
            return true;
        if (repeatEnabled && repeatDays.length === 0)
            return true;
        return submitting;
    }, [repeatEnabled, repeatDays.length, submitting, timeLabel, title]);
    const toggleDay = (day) => {
        setRepeatDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
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
                repeatDays
            });
            setTitle("");
            setTimeLabel(defaultTime());
            setUrl("");
            setRepeatEnabled(false);
            setRepeatDays(["Mon", "Tue", "Wed", "Thu", "Fri"]);
        }
        catch (err) {
            console.error(err);
            setError("アラームの追加に失敗しました。");
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("form", { className: "card", onSubmit: handleSubmit, children: [_jsx("h2", { children: "\u65B0\u898F\u30A2\u30E9\u30FC\u30E0\u8FFD\u52A0" }), _jsxs("label", { className: "form-row", children: [_jsx("span", { children: "\u30BF\u30A4\u30C8\u30EB" }), _jsx("input", { type: "text", value: title, placeholder: "\u4F8B\uFF1A\u671D\u4F1A", onChange: (e) => setTitle(e.target.value) })] }), _jsxs("label", { className: "form-row", children: [_jsx("span", { children: "\u6642\u523B" }), _jsx("input", { type: "time", value: timeLabel, onChange: (e) => setTimeLabel(e.target.value), required: true })] }), _jsxs("label", { className: "form-row", children: [_jsx("span", { children: "URL\uFF08\u4EFB\u610F\uFF09" }), _jsx("input", { type: "url", value: url, placeholder: "https://example.com", onChange: (e) => setUrl(e.target.value) })] }), _jsxs("label", { className: "form-row checkbox-row", children: [_jsx("input", { type: "checkbox", checked: repeatEnabled, onChange: (e) => setRepeatEnabled(e.target.checked) }), _jsx("span", { children: "\u7E70\u308A\u8FD4\u3057\u3092\u6709\u52B9\u306B\u3059\u308B" })] }), repeatEnabled && (_jsx("div", { className: "weekday-grid", children: weekdayOptions.map((option) => (_jsx("button", { type: "button", className: repeatDays.includes(option.key) ? "weekday active" : "weekday", onClick: () => toggleDay(option.key), children: option.label }, option.key))) })), repeatEnabled && repeatDays.length === 0 && (_jsx("p", { className: "error-text", children: "\u7E70\u308A\u8FD4\u3057\u304C ON \u306E\u5834\u5408\u306F\u66DC\u65E5\u3092 1 \u3064\u4EE5\u4E0A\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044\u3002" })), error && _jsx("p", { className: "error-text", children: error }), _jsx("button", { type: "submit", disabled: disableSubmit, children: submitting ? "追加中..." : "アラームを追加" })] }));
};
export default AlarmForm;
