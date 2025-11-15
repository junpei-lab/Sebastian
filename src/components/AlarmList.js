import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
const weekdayOrder = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
];
const weekdayLabelMap = {
    Sun: "日",
    Mon: "月",
    Tue: "火",
    Wed: "水",
    Thu: "木",
    Fri: "金",
    Sat: "土",
};
const formatRelative = (nextFireTime, reference) => {
    const target = dayjs(nextFireTime);
    if (!target.isValid())
        return "時刻不明";
    const diffMinutes = Math.max(target.diff(reference, "minute"), 0);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    if (hours <= 0) {
        return `${minutes} 分後`;
    }
    return `${hours} 時間 ${minutes} 分後`;
};
const highlightedDays = (alarm) => {
    if (alarm.repeatEnabled && alarm.repeatDays.length > 0) {
        return new Set(alarm.repeatDays);
    }
    const fallbackIndex = dayjs(alarm.nextFireTime).day();
    const fallbackDay = weekdayOrder[fallbackIndex] ?? "Mon";
    return new Set([fallbackDay]);
};
const AlarmList = ({ alarms, onDelete, onOpenUrl, onSelect, }) => {
    const [relativeNow, setRelativeNow] = useState(dayjs());
    useEffect(() => {
        setRelativeNow(dayjs());
        const interval = window.setInterval(() => {
            setRelativeNow(dayjs());
        }, 60000);
        return () => {
            window.clearInterval(interval);
        };
    }, []);
    const sorted = useMemo(() => [...alarms].sort((a, b) => a.nextFireTime.localeCompare(b.nextFireTime)), [alarms]);
    if (sorted.length === 0) {
        return _jsx("p", { className: "empty", children: "\u30A2\u30E9\u30FC\u30E0\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002" });
    }
    return (_jsx("div", { className: "alarm-list", children: sorted.map((alarm) => {
            const activeDays = highlightedDays(alarm);
            return (_jsx("article", { className: "card alarm-card", onClick: () => onSelect(alarm), role: "button", tabIndex: 0, onKeyDown: (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(alarm);
                    }
                }, children: _jsxs("div", { className: "alarm-card-inner", children: [_jsx("div", { className: "alarm-time-row", children: _jsxs("div", { children: [_jsx("p", { className: "alarm-time", children: alarm.timeLabel }), _jsxs("p", { className: "alarm-relative", title: dayjs(alarm.nextFireTime).format("YYYY/MM/DD HH:mm"), children: [_jsx("span", { className: "bell-icon", "aria-hidden": "true", children: "\uD83D\uDD14" }), formatRelative(alarm.nextFireTime, relativeNow)] })] }) }), _jsxs("div", { className: "alarm-title-row", children: [_jsx("span", { className: "alarm-section-label", children: "\u30A2\u30E9\u30FC\u30E0" }), _jsxs("span", { className: "alarm-count", children: ["(", alarm.repeatEnabled && alarm.repeatDays.length > 0
                                            ? alarm.repeatDays.length
                                            : 1, ")"] })] }), _jsx("p", { className: "alarm-title-text", children: alarm.title.trim() || "タイトル未設定" }), _jsxs("div", { className: "alarm-repeat-row", children: [_jsx("span", { className: "alarm-repeat-label", children: "\u7E70\u308A\u8FD4\u3057" }), _jsx("div", { className: alarm.repeatEnabled ? "alarm-switch active" : "alarm-switch", "aria-label": alarm.repeatEnabled ? "繰り返し ON" : "繰り返し OFF" })] }), _jsx("div", { className: "weekday-ribbon", children: weekdayOrder.map((day) => {
                                const isActive = activeDays.has(day);
                                return (_jsx("span", { className: isActive ? "weekday-chip active" : "weekday-chip", children: weekdayLabelMap[day] }, day));
                            }) }), _jsxs("div", { className: "alarm-actions compact", children: [alarm.url && (_jsx("button", { type: "button", onClick: (event) => {
                                        event.stopPropagation();
                                        void onOpenUrl(alarm.url);
                                    }, className: "ghost", children: "\u30EA\u30F3\u30AF\u3092\u958B\u304F" })), _jsx("button", { type: "button", onClick: (event) => {
                                        event.stopPropagation();
                                        void onDelete(alarm.id);
                                    }, className: "danger", children: "\u524A\u9664" })] })] }) }, alarm.id));
        }) }));
};
export default AlarmList;
