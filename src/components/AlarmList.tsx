import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { Alarm } from "../types/alarm";

type AlarmListProps = {
  alarms: Alarm[];
  onDelete: (id: string) => Promise<void>;
  onTitleChange: (id: string, title: string) => Promise<void>;
  onOpenUrl: (url: string) => Promise<void>;
};

const weekdayLabel = (days: Alarm["repeatDays"]) => {
  if (days.length === 0) return "曜日未設定";
  const mapping: Record<string, string> = {
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

const AlarmList = ({ alarms, onDelete, onTitleChange, onOpenUrl }: AlarmListProps) => {
  const [editing, setEditing] = useState<Record<string, string>>({});
  const sorted = useMemo(
    () => [...alarms].sort((a, b) => a.nextFireTime.localeCompare(b.nextFireTime)),
    [alarms]
  );

  const handleBlur = async (alarm: Alarm) => {
    const draft = editing[alarm.id];
    if (draft === undefined || draft === alarm.title) return;
    await onTitleChange(alarm.id, draft);
  };

  if (sorted.length === 0) {
    return <p className="empty">アラームはまだありません。</p>;
  }

  return (
    <div className="alarm-list">
      {sorted.map((alarm) => (
        <article key={alarm.id} className="card alarm-card">
          <div className="alarm-header">
            <input
              className="title-input"
              value={editing[alarm.id] ?? alarm.title}
              onChange={(e) =>
                setEditing((prev) => ({
                  ...prev,
                  [alarm.id]: e.target.value
                }))
              }
              onBlur={() => handleBlur(alarm)}
            />
            <span className="time-label">{alarm.timeLabel}</span>
          </div>
          <p className="next-fire">
            次回: {dayjs(alarm.nextFireTime).format("YYYY/MM/DD HH:mm")}
          </p>
          <div className="tag-row">
            {alarm.repeatEnabled ? (
              <span className="tag tag-green">繰り返し: {weekdayLabel(alarm.repeatDays)}</span>
            ) : (
              <span className="tag tag-blue">単発</span>
            )}
          </div>
          <div className="alarm-actions">
            {alarm.url && (
              <button
                type="button"
                onClick={() => {
                  void onOpenUrl(alarm.url!);
                }}
                className="ghost"
              >
                リンクを開く
              </button>
            )}
            <button type="button" onClick={() => onDelete(alarm.id)} className="danger">
              削除
            </button>
          </div>
        </article>
      ))}
    </div>
  );
};

export default AlarmList;
