import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { NewAlarmPayload, Weekday } from "../types/alarm";

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
};

const defaultTime = (): string => dayjs().add(10, "minute").format("HH:mm");

const AlarmForm = ({ onSubmit }: AlarmFormProps) => {
  const [title, setTitle] = useState("");
  const [timeLabel, setTimeLabel] = useState(defaultTime());
  const [url, setUrl] = useState("");
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatDays, setRepeatDays] = useState<Weekday[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disableSubmit = useMemo(() => {
    if (!title.trim()) return true;
    if (!timeLabel) return true;
    if (repeatEnabled && repeatDays.length === 0) return true;
    return submitting;
  }, [repeatEnabled, repeatDays.length, submitting, timeLabel, title]);

  const toggleDay = (day: Weekday) => {
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
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
        url: trimmedUrl || undefined,
        repeatEnabled,
        repeatDays
      });
      setTitle("");
      setTimeLabel(defaultTime());
      setUrl("");
      setRepeatEnabled(false);
      setRepeatDays(["Mon", "Tue", "Wed", "Thu", "Fri"]);
    } catch (err) {
      console.error(err);
      setError("アラームの追加に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>新規アラーム追加</h2>
      <label className="form-row">
        <span>タイトル</span>
        <input
          type="text"
          value={title}
          placeholder="例：朝会"
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="form-row">
        <span>時刻</span>
        <input
          type="time"
          value={timeLabel}
          onChange={(e) => setTimeLabel(e.target.value)}
          required
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
      <label className="form-row checkbox-row">
        <input
          type="checkbox"
          checked={repeatEnabled}
          onChange={(e) => setRepeatEnabled(e.target.checked)}
        />
        <span>繰り返しを有効にする</span>
      </label>
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
      <button type="submit" disabled={disableSubmit}>
        {submitting ? "追加中..." : "アラームを追加"}
      </button>
    </form>
  );
};

export default AlarmForm;
