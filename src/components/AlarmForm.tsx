import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { NewAlarmPayload, Weekday } from "../types/alarm";
import TimePicker from "./TimePicker";

const weekdayOptions: { key: Weekday; label: string }[] = [
  { key: "Mon", label: "月" },
  { key: "Tue", label: "火" },
  { key: "Wed", label: "水" },
  { key: "Thu", label: "木" },
  { key: "Fri", label: "金" },
  { key: "Sat", label: "土" },
  { key: "Sun", label: "日" }
];

type AlarmFormProps = {
  onSubmit: (payload: NewAlarmPayload) => Promise<void>;
  onSuccess?: () => void;
  initialValues?: Partial<NewAlarmPayload>;
  defaultLeadMinutes: number;
  heading?: string;
  submitLabel?: string;
  submittingLabel?: string;
};

const defaultTime = (): string => dayjs().add(10, "minute").format("HH:mm");
const defaultWeekdays = (): Weekday[] => ["Mon", "Tue", "Wed", "Thu", "Fri"];

const DEFAULT_LEAD_MINUTES = 3;
const clampLeadMinutesValue = (value: number): number =>
  Math.max(0, Math.min(720, Math.floor(value)));

const parseTimeLabel = (value: string): { hours: number; minutes: number } => {
  const [hours = "0", minutes = "0"] = value.split(":");
  const parsedHours = Number.parseInt(hours, 10);
  const parsedMinutes = Number.parseInt(minutes, 10);
  return {
    hours: Number.isFinite(parsedHours) ? Math.min(Math.max(parsedHours, 0), 23) : 0,
    minutes: Number.isFinite(parsedMinutes) ? Math.min(Math.max(parsedMinutes, 0), 59) : 0
  };
};

const computeAutoDateLabel = (timeLabel: string, leadMinutes: number): string => {
  const safeLeadMinutes = clampLeadMinutesValue(leadMinutes);
  const adjustedBase = dayjs().add(safeLeadMinutes, "minute");
  const { hours, minutes } = parseTimeLabel(timeLabel);
  let candidate = adjustedBase.hour(hours).minute(minutes).second(0).millisecond(0);
  if (candidate.diff(adjustedBase) <= 0) {
    candidate = candidate.add(1, "day");
  }
  return candidate.format("YYYY-MM-DD");
};

const AlarmForm = ({
  onSubmit,
  onSuccess,
  initialValues,
  defaultLeadMinutes,
  heading,
  submitLabel,
  submittingLabel
}: AlarmFormProps) => {
  const sanitizedDefaultLeadMinutes = clampLeadMinutesValue(
    Number.isFinite(defaultLeadMinutes) ? defaultLeadMinutes : DEFAULT_LEAD_MINUTES
  );
  const initialLeadMinutes = initialValues?.leadMinutes ?? sanitizedDefaultLeadMinutes;
  const initialTimeLabel = initialValues?.timeLabel ?? defaultTime();
  const initialDateLabel =
    initialValues?.dateLabel ?? computeAutoDateLabel(initialTimeLabel, initialLeadMinutes);
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [timeLabel, setTimeLabel] = useState(initialTimeLabel);
  const [dateLabel, setDateLabel] = useState(initialDateLabel);
  const [url, setUrl] = useState(initialValues?.url ?? "");
  const [repeatEnabled, setRepeatEnabled] = useState(initialValues?.repeatEnabled ?? false);
  const [repeatDays, setRepeatDays] = useState<Weekday[]>(
    initialValues?.repeatDays && initialValues.repeatDays.length > 0
      ? [...initialValues.repeatDays]
      : defaultWeekdays()
  );
  const [leadMinutes, setLeadMinutes] = useState(initialLeadMinutes);
  const [dateTouched, setDateTouched] = useState(() => Boolean(initialValues));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialValues) return;
    setTitle(initialValues.title ?? "");
    const nextLeadMinutes = initialValues.leadMinutes ?? sanitizedDefaultLeadMinutes;
    const nextTimeLabel = initialValues.timeLabel ?? defaultTime();
    setTimeLabel(nextTimeLabel);
    setDateLabel(initialValues.dateLabel ?? computeAutoDateLabel(nextTimeLabel, nextLeadMinutes));
    setUrl(initialValues.url ?? "");
    setRepeatEnabled(initialValues.repeatEnabled ?? false);
    setRepeatDays(
      initialValues.repeatDays && initialValues.repeatDays.length > 0
        ? [...initialValues.repeatDays]
        : defaultWeekdays()
    );
    setLeadMinutes(nextLeadMinutes);
    setDateTouched(true);
  }, [initialValues, sanitizedDefaultLeadMinutes]);

  useEffect(() => {
    if (repeatEnabled) return;
    if (dateTouched) return;
    const next = computeAutoDateLabel(timeLabel, leadMinutes);
    setDateLabel((prev) => (prev === next ? prev : next));
  }, [dateTouched, leadMinutes, repeatEnabled, timeLabel]);

  const disableSubmit = useMemo(() => {
    if (!timeLabel) return true;
    if (repeatEnabled && repeatDays.length === 0) return true;
    return submitting;
  }, [repeatEnabled, repeatDays.length, submitting, timeLabel]);

  const toggleDay = (day: Weekday) => {
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleRepeat = () => {
    setRepeatEnabled((prev) => !prev);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disableSubmit) return;
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
        dateLabel: repeatEnabled ? undefined : dateLabel.trim() || undefined,
        url: trimmedUrl || undefined,
        repeatEnabled,
        repeatDays,
        leadMinutes
      });
      setTitle("");
      const nextTimeLabel = defaultTime();
      setTimeLabel(nextTimeLabel);
      setDateLabel(computeAutoDateLabel(nextTimeLabel, sanitizedDefaultLeadMinutes));
      setDateTouched(false);
      setUrl("");
      setRepeatEnabled(false);
      setRepeatDays(defaultWeekdays());
      setLeadMinutes(sanitizedDefaultLeadMinutes);
      onSuccess?.();
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : typeof err === "string" ? err : null;
      setError(message ?? "アラームの保存に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>{heading ?? "新規アラーム追加"}</h2>
      <div className="form-row">
        <span>時刻</span>
        <TimePicker value={timeLabel} onChange={setTimeLabel} />
      </div>
      {!repeatEnabled && (
        <label className="form-row">
          <span>日付</span>
          <input
            type="date"
            value={dateLabel}
            onChange={(event) => {
              setDateTouched(true);
              setDateLabel(event.target.value);
            }}
          />
        </label>
      )}
      <label className="form-row">
        <span>何分前に鳴らすか</span>
        <input
          type="number"
          min={0}
          max={720}
          step={1}
          value={leadMinutes}
          onChange={(event) => {
            const parsed = Number(event.target.value);
            const clamped = clampLeadMinutesValue(Number.isFinite(parsed) ? parsed : 0);
            setLeadMinutes(clamped);
          }}
        />
      </label>
      <label className="form-row">
        <span>タイトル（任意）</span>
        <input
          type="text"
          value={title}
          placeholder="例：朝会（空欄でも可）"
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="form-row">
        <span>URL（任意）</span>
        <input
          type="url"
          value={url}
          placeholder="https://example.com"
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      <div className="form-row">
        <div className="alarm-repeat-row form-repeat-row">
          <span className="alarm-repeat-label">繰り返しを有効にする</span>
          <div
            className={
              repeatEnabled
                ? "alarm-switch repeat-toggle-switch active"
                : "alarm-switch repeat-toggle-switch"
            }
            role="switch"
            aria-checked={repeatEnabled}
            aria-label="繰り返しを有効にする"
            tabIndex={0}
            onClick={toggleRepeat}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleRepeat();
              }
            }}
          />
        </div>
      </div>
      {repeatEnabled && (
        <div className="weekday-grid">
          {weekdayOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={repeatDays.includes(option.key) ? "weekday active" : "weekday"}
              onClick={() => toggleDay(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      {repeatEnabled && repeatDays.length === 0 && (
        <p className="error-text">繰り返しが ON の場合は曜日を 1 つ以上選択してください。</p>
      )}
      {error && <p className="error-text">{error}</p>}
      <button type="submit" className="form-submit-btn" disabled={disableSubmit}>
        {submitting ? submittingLabel ?? "追加中..." : submitLabel ?? "アラームを追加"}
      </button>
    </form>
  );
};

export default AlarmForm;
