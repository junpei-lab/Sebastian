import { FormEvent, useEffect, useState } from "react";
import { NewAlarmPayload, Weekday } from "../types/alarm";

const allowedWeekdays: Weekday[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type ImportAlarmsModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payloads: NewAlarmPayload[], replaceExisting: boolean) => Promise<void>;
};

const ImportAlarmsModal = ({ open, onClose, onSubmit }: ImportAlarmsModalProps) => {
  const [jsonText, setJsonText] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setJsonText("");
      setError(null);
      setReplaceExisting(false);
      setIsSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    let payloads: NewAlarmPayload[];
    try {
      payloads = parseToPayloads(jsonText);
    } catch (err) {
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
    } catch (err) {
      setError(toErrorMessage(err, "インポートに失敗しました。"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <button
          type="button"
          className="icon-button modal-close"
          aria-label="閉じる"
          onClick={onClose}
        >
          ×
        </button>
        <form className="card import-card" onSubmit={handleSubmit}>
          <div className="form-row">
            <span>JSON からインポート</span>
            <p className="import-hint">
              Sebastian の <code>alarms.json</code> もしくは{" "}
              <code>[&#123; ... &#125;]</code> 形式で貼り付けてください。
            </p>
          </div>
          <textarea
            className="json-textarea"
            placeholder={`[
  {
    "title": "朝のストレッチ",
    "timeLabel": "07:30",
    "repeatEnabled": true,
    "repeatDays": ["Mon", "Wed", "Fri"],
    "url": "https://example.com",
    "leadMinutes": 5
  }
]`}
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            aria-label="アラーム JSON"
          />
          <label className="import-checkbox">
            <input
              type="checkbox"
              checked={replaceExisting}
              onChange={(event) => setReplaceExisting(event.target.checked)}
            />
            既存のアラームを全て削除してから取り込む
          </label>
          {error && <p className="error-text">{error}</p>}
          <div className="dialog-actions">
            <button
              type="button"
              className="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "取り込み中..." : "インポートする"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const parseToPayloads = (rawText: string): NewAlarmPayload[] => {
  if (!rawText.trim()) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("JSON の構文を確認してください。");
  }
  const records = extractRecordArray(parsed);
  return records.map((item, index) => normalizePayload(item, index));
};

const extractRecordArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const maybeArray = (value as Record<string, unknown>).alarms;
    if (Array.isArray(maybeArray)) {
      return maybeArray;
    }
  }
  throw new Error(
    "ルートは配列、もしくは { \"alarms\": [...] } 形式で指定してください。"
  );
};

const normalizePayload = (value: unknown, index: number): NewAlarmPayload => {
  if (!value || typeof value !== "object") {
    throw new Error(`${index + 1} 件目: オブジェクトではありません。`);
  }
  const record = value as Record<string, unknown>;
  const title = pickString(record, ["title"], index, "title");
  const timeLabel = pickString(record, ["timeLabel", "time_label"], index, "timeLabel");
  const url = pickOptionalString(record, ["url"]);
  const repeatDaysValue = pickOptional(record, ["repeatDays", "repeat_days"]);
  const repeatDays = normalizeRepeatDays(repeatDaysValue, index);
  const repeatEnabledValue = pickOptional(record, ["repeatEnabled", "repeat_enabled"]);
  const repeatEnabled =
    (typeof repeatEnabledValue === "boolean" ? repeatEnabledValue : !!repeatEnabledValue) &&
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

const pickOptional = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }
  return undefined;
};

const pickString = (
  record: Record<string, unknown>,
  keys: string[],
  index: number,
  field: string
): string => {
  const value = pickOptional(record, keys);
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  throw new Error(`${index + 1} 件目: ${field} が見つからないか文字列ではありません。`);
};

const pickOptionalString = (record: Record<string, unknown>, keys: string[]): string | undefined => {
  const value = pickOptional(record, keys);
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return undefined;
};

const normalizeRepeatDays = (value: unknown, index: number): Weekday[] => {
  if (!value) {
    return [];
  }
  const values: string[] = Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
    : typeof value === "string"
      ? value
          .split(/[, ]+/)
          .map((day) => day.trim())
          .filter(Boolean)
      : [];
  const normalized = values
    .map((day) => (day.length ? (day[0].toUpperCase() + day.slice(1, 3).toLowerCase()) : day))
    .filter((day): day is Weekday => allowedWeekdays.includes(day as Weekday));
  if (values.length > 0 && normalized.length === 0) {
    throw new Error(`${index + 1} ??: repeatDays ????????????????`);
  }
  return Array.from(new Set(normalized));
};

const normalizeLeadMinutes = (value: unknown): number => {
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

const toErrorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : typeof err === "string" ? err : fallback;

export default ImportAlarmsModal;
