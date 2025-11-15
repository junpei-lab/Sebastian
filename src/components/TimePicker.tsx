import { useCallback, useEffect, useState } from "react";

type TimePickerProps = {
  value: string;
  onChange: (value: string) => void;
};

const clampPart = (value: number, max: number) => {
  const remainder = value % max;
  return remainder < 0 ? remainder + max : remainder;
};

const parseTime = (value: string): { hours: number; minutes: number } => {
  const [hours = "0", minutes = "0"] = value.split(":");
  const parsedHours = Number.parseInt(hours, 10);
  const parsedMinutes = Number.parseInt(minutes, 10);
  return {
    hours: Number.isFinite(parsedHours) ? clampPart(parsedHours, 24) : 0,
    minutes: Number.isFinite(parsedMinutes) ? clampPart(parsedMinutes, 60) : 0
  };
};

const pad = (value: number) => value.toString().padStart(2, "0");

const sanitizeDigits = (input: string) => input.replace(/[^0-9]/g, "");

const TimePicker = ({ value, onChange }: TimePickerProps) => {
  const { hours, minutes } = parseTime(value);
  const [hourInput, setHourInput] = useState(() => pad(hours));
  const [minuteInput, setMinuteInput] = useState(() => pad(minutes));

  useEffect(() => {
    setHourInput(pad(hours));
  }, [hours]);

  useEffect(() => {
    setMinuteInput(pad(minutes));
  }, [minutes]);

  const updateTime = useCallback(
    (nextHours: number, nextMinutes: number) => {
      const safeHours = clampPart(nextHours, 24);
      const safeMinutes = clampPart(nextMinutes, 60);
      onChange(`${pad(safeHours)}:${pad(safeMinutes)}`);
    },
    [onChange]
  );

  const changeHours = useCallback(
    (delta: number) => {
      updateTime(hours + delta, minutes);
    },
    [hours, minutes, updateTime]
  );

  const changeMinutes = useCallback(
    (delta: number) => {
      updateTime(hours, minutes + delta);
    },
    [hours, minutes, updateTime]
  );

  const commitHourInput = useCallback(() => {
    const parsed = Number.parseInt(hourInput, 10);
    if (Number.isFinite(parsed)) {
      const safeHours = clampPart(parsed, 24);
      updateTime(safeHours, minutes);
      setHourInput(pad(safeHours));
    } else {
      setHourInput(pad(hours));
    }
  }, [hourInput, hours, minutes, updateTime]);

  const commitMinuteInput = useCallback(() => {
    const parsed = Number.parseInt(minuteInput, 10);
    if (Number.isFinite(parsed)) {
      const safeMinutes = clampPart(parsed, 60);
      updateTime(hours, safeMinutes);
      setMinuteInput(pad(safeMinutes));
    } else {
      setMinuteInput(pad(minutes));
    }
  }, [minuteInput, hours, minutes, updateTime]);

  const handleHourKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      changeHours(1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      changeHours(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      commitHourInput();
    }
  };

  const handleMinuteKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      changeMinutes(1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      changeMinutes(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      commitMinuteInput();
    }
  };

  const handleNumericInput = (event: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const sanitized = sanitizeDigits(event.target.value);
    if (sanitized.length <= 2) {
      setter(sanitized);
    }
  };

  return (
    <div className="time-picker" aria-label="時刻">
      <div className="time-column">
        <button
          type="button"
          className="time-arrow"
          onClick={() => changeHours(1)}
          aria-label="時間を増やす"
        >
          ▲
        </button>
        <input
          className="time-value hour"
          tabIndex={0}
          role="spinbutton"
          aria-label="時"
          aria-valuemin={0}
          aria-valuemax={23}
          aria-valuenow={hours}
          onKeyDown={handleHourKeyDown}
          inputMode="numeric"
          pattern="[0-9]*"
          value={hourInput}
          onChange={(event) => handleNumericInput(event, setHourInput)}
          onBlur={commitHourInput}
        />
        <button
          type="button"
          className="time-arrow"
          onClick={() => changeHours(-1)}
          aria-label="時間を減らす"
        >
          ▼
        </button>
      </div>
      <span className="time-separator">:</span>
      <div className="time-column">
        <button
          type="button"
          className="time-arrow"
          onClick={() => changeMinutes(1)}
          aria-label="分を増やす"
        >
          ▲
        </button>
        <input
          className="time-value minute"
          tabIndex={0}
          role="spinbutton"
          aria-label="分"
          aria-valuemin={0}
          aria-valuemax={59}
          aria-valuenow={minutes}
          onKeyDown={handleMinuteKeyDown}
          inputMode="numeric"
          pattern="[0-9]*"
          value={minuteInput}
          onChange={(event) => handleNumericInput(event, setMinuteInput)}
          onBlur={commitMinuteInput}
        />
        <button
          type="button"
          className="time-arrow"
          onClick={() => changeMinutes(-1)}
          aria-label="分を減らす"
        >
          ▼
        </button>
      </div>
    </div>
  );
};

export default TimePicker;
