import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const AlarmDialog = ({ alarm, onStop, onOpenUrl }) => {
    if (!alarm)
        return null;
    const dialogTitle = alarm.title.trim() ? alarm.title : "タイトル未設定";
    return (_jsx("div", { className: "alarm-dialog-backdrop", children: _jsxs("div", { className: "alarm-dialog card", children: [_jsx("p", { className: "dialog-label", children: "\u30A2\u30E9\u30FC\u30E0\u304C\u9CF4\u3063\u3066\u3044\u307E\u3059\uFF01" }), _jsx("h2", { className: "dialog-title", children: dialogTitle }), _jsx("p", { className: "dialog-time", children: alarm.timeLabel }), _jsxs("div", { className: "dialog-actions", children: [alarm.url && (_jsx("button", { type: "button", className: "ghost", onClick: () => {
                                void onOpenUrl(alarm.url);
                            }, children: "\u30EA\u30F3\u30AF\u3092\u958B\u304F" })), _jsx("button", { type: "button", className: "danger", onClick: () => {
                                void onStop();
                            }, children: "\u505C\u6B62" })] })] }) }));
};
export default AlarmDialog;
