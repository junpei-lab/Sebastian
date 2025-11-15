import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
const clampPart = (value, max) => {
    const remainder = value % max;
    return remainder < 0 ? remainder + max : remainder;
};
const parseTime = (value) => {
    const [hours = "0", minutes = "0"] = value.split(":");
    const parsedHours = Number.parseInt(hours, 10);
    const parsedMinutes = Number.parseInt(minutes, 10);
    return {
        hours: Number.isFinite(parsedHours) ? clampPart(parsedHours, 24) : 0,
        minutes: Number.isFinite(parsedMinutes) ? clampPart(parsedMinutes, 60) : 0
    };
};
const pad = (value) => value.toString().padStart(2, "0");
const sanitizeDigits = (input) => input.replace(/[^0-9]/g, "");
const TimePicker = ({ value, onChange }) => {
    const { hours, minutes } = parseTime(value);
    const [hourInput, setHourInput] = useState(() => pad(hours));
    const [minuteInput, setMinuteInput] = useState(() => pad(minutes));
    useEffect(() => {
        setHourInput(pad(hours));
    }, [hours]);
    useEffect(() => {
        setMinuteInput(pad(minutes));
    }, [minutes]);
    const updateTime = useCallback((nextHours, nextMinutes) => {
        const safeHours = clampPart(nextHours, 24);
        const safeMinutes = clampPart(nextMinutes, 60);
        onChange(`${pad(safeHours)}:${pad(safeMinutes)}`);
    }, [onChange]);
    const changeHours = useCallback((delta) => {
        updateTime(hours + delta, minutes);
    }, [hours, minutes, updateTime]);
    const changeMinutes = useCallback((delta) => {
        updateTime(hours, minutes + delta);
    }, [hours, minutes, updateTime]);
    const commitHourInput = useCallback(() => {
        const parsed = Number.parseInt(hourInput, 10);
        if (Number.isFinite(parsed)) {
            const safeHours = clampPart(parsed, 24);
            updateTime(safeHours, minutes);
            setHourInput(pad(safeHours));
        }
        else {
            setHourInput(pad(hours));
        }
    }, [hourInput, hours, minutes, updateTime]);
    const commitMinuteInput = useCallback(() => {
        const parsed = Number.parseInt(minuteInput, 10);
        if (Number.isFinite(parsed)) {
            const safeMinutes = clampPart(parsed, 60);
            updateTime(hours, safeMinutes);
            setMinuteInput(pad(safeMinutes));
        }
        else {
            setMinuteInput(pad(minutes));
        }
    }, [minuteInput, hours, minutes, updateTime]);
    const handleHourKeyDown = (event) => {
        if (event.key === "ArrowUp") {
            event.preventDefault();
            changeHours(1);
        }
        else if (event.key === "ArrowDown") {
            event.preventDefault();
            changeHours(-1);
        }
        else if (event.key === "Enter") {
            event.preventDefault();
            commitHourInput();
        }
    };
    const handleMinuteKeyDown = (event) => {
        if (event.key === "ArrowUp") {
            event.preventDefault();
            changeMinutes(1);
        }
        else if (event.key === "ArrowDown") {
            event.preventDefault();
            changeMinutes(-1);
        }
        else if (event.key === "Enter") {
            event.preventDefault();
            commitMinuteInput();
        }
    };
    const handleNumericInput = (event, setter) => {
        const sanitized = sanitizeDigits(event.target.value);
        if (sanitized.length <= 2) {
            setter(sanitized);
        }
    };
    return (_jsxs("div", { className: "time-picker", "aria-label": "\u6642\u523B", children: [_jsxs("div", { className: "time-column", children: [_jsx("button", { type: "button", className: "time-arrow", onClick: () => changeHours(1), "aria-label": "\u6642\u9593\u3092\u5897\u3084\u3059", children: "\u25B2" }), _jsx("input", { className: "time-value hour", tabIndex: 0, role: "spinbutton", "aria-label": "\u6642", "aria-valuemin": 0, "aria-valuemax": 23, "aria-valuenow": hours, onKeyDown: handleHourKeyDown, inputMode: "numeric", pattern: "[0-9]*", value: hourInput, onChange: (event) => handleNumericInput(event, setHourInput), onBlur: commitHourInput }), _jsx("button", { type: "button", className: "time-arrow", onClick: () => changeHours(-1), "aria-label": "\u6642\u9593\u3092\u6E1B\u3089\u3059", children: "\u25BC" })] }), _jsx("span", { className: "time-separator", children: ":" }), _jsxs("div", { className: "time-column", children: [_jsx("button", { type: "button", className: "time-arrow", onClick: () => changeMinutes(1), "aria-label": "\u5206\u3092\u5897\u3084\u3059", children: "\u25B2" }), _jsx("input", { className: "time-value minute", tabIndex: 0, role: "spinbutton", "aria-label": "\u5206", "aria-valuemin": 0, "aria-valuemax": 59, "aria-valuenow": minutes, onKeyDown: handleMinuteKeyDown, inputMode: "numeric", pattern: "[0-9]*", value: minuteInput, onChange: (event) => handleNumericInput(event, setMinuteInput), onBlur: commitMinuteInput }), _jsx("button", { type: "button", className: "time-arrow", onClick: () => changeMinutes(-1), "aria-label": "\u5206\u3092\u6E1B\u3089\u3059", children: "\u25BC" })] })] }));
};
export default TimePicker;
