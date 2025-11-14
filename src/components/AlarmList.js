import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
const weekdayLabel = (days) => {
    if (days.length === 0)
        return "曜日未設定";
    const mapping = {
        Mon: "月",
        Tue: "火",
        Wed: "水",
        Thu: "木",
        Fri: "金",
        Sat: "土",
        Sun: "日"
    };
    return days.map((day) => mapping[day]).join(" / ");
};
const AlarmList = ({ alarms, onDelete, onTitleChange, onOpenUrl }) => {
    const [editing, setEditing] = useState({});
    const sorted = useMemo(() => [...alarms].sort((a, b) => a.nextFireTime.localeCompare(b.nextFireTime)), [alarms]);
    const handleBlur = async (alarm) => {
        const draft = editing[alarm.id];
        if (draft === undefined || draft === alarm.title)
            return;
        await onTitleChange(alarm.id, draft);
    };
    if (sorted.length === 0) {
        return _jsx("p", { className: "empty", children: "\u30A2\u30E9\u30FC\u30E0\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002" });
    }
    return (_jsx("div", { className: "alarm-list", children: sorted.map((alarm) => (_jsxs("article", { className: "card alarm-card", children: [_jsxs("div", { className: "alarm-header", children: [_jsx("input", { className: "title-input", value: editing[alarm.id] ?? alarm.title, onChange: (e) => setEditing((prev) => ({
                                ...prev,
                                [alarm.id]: e.target.value
                            })), onBlur: () => handleBlur(alarm) }), _jsx("span", { className: "time-label", children: alarm.timeLabel })] }), _jsxs("p", { className: "next-fire", children: ["\u6B21\u56DE: ", dayjs(alarm.nextFireTime).format("YYYY/MM/DD HH:mm")] }), _jsx("div", { className: "tag-row", children: alarm.repeatEnabled ? (_jsxs("span", { className: "tag tag-green", children: ["\u7E70\u308A\u8FD4\u3057: ", weekdayLabel(alarm.repeatDays)] })) : (_jsx("span", { className: "tag tag-blue", children: "\u5358\u767A" })) }), _jsxs("div", { className: "alarm-actions", children: [alarm.url && (_jsx("button", { type: "button", onClick: () => {
                                void onOpenUrl(alarm.url);
                            }, className: "ghost", children: "\u30EA\u30F3\u30AF\u3092\u958B\u304F" })), _jsx("button", { type: "button", onClick: () => onDelete(alarm.id), className: "danger", children: "\u524A\u9664" })] })] }, alarm.id))) }));
};
export default AlarmList;
