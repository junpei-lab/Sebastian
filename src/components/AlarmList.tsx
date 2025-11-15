import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { Alarm, Weekday } from "../types/alarm";

type AlarmListProps = {
  alarms: Alarm[];
  onDelete: (id: string) => Promise<void>;
  onOpenUrl: (url: string) => Promise<void>;
  onSelect: (alarm: Alarm) => void;
};

const weekdayOrder: Weekday[] = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];
const weekdayLabelMap: Record<Weekday, string> = {
  Sun: "日",
  Mon: "月",
  Tue: "火",
  Wed: "水",
  Thu: "木",
  Fri: "金",
  Sat: "土",
};

const formatRelative = (nextFireTime: string, reference: dayjs.Dayjs) => {
  const target = dayjs(nextFireTime);
  if (!target.isValid()) return "時刻不明";
  const diffMinutes = Math.max(target.diff(reference, "minute"), 0);
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours <= 0) {
    return `${minutes} 分後`;
  }
  return `${hours} 時間 ${minutes} 分後`;
};

const highlightedDays = (alarm: Alarm): Set<Weekday> => {
  if (alarm.repeatEnabled && alarm.repeatDays.length > 0) {
    return new Set(alarm.repeatDays);
  }
  const fallbackIndex = dayjs(alarm.nextFireTime).day();
  const fallbackDay = weekdayOrder[fallbackIndex] ?? "Mon";
  return new Set<Weekday>([fallbackDay]);
};

const AlarmList = ({
  alarms,
  onDelete,
  onOpenUrl,
  onSelect,
}: AlarmListProps) => {
  const [relativeNow, setRelativeNow] = useState(dayjs());

  useEffect(() => {
    setRelativeNow(dayjs());
    const interval = window.setInterval(() => {
      setRelativeNow(dayjs());
    }, 60_000);
    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const sorted = useMemo(
    () =>
      [...alarms].sort((a, b) => a.nextFireTime.localeCompare(b.nextFireTime)),
    [alarms]
  );

  if (sorted.length === 0) {
    return <p className="empty">アラームはまだありません。</p>;
  }

  return (
    <div className="alarm-list">
      {sorted.map((alarm) => {
        const activeDays = highlightedDays(alarm);
        return (
          <article
            key={alarm.id}
            className="card alarm-card"
            onClick={() => onSelect(alarm)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(alarm);
              }
            }}
          >
            <div className="alarm-card-inner">
              <div className="alarm-time-row">
                <div>
                  <p className="alarm-time">{alarm.timeLabel}</p>
                  <p
                    className="alarm-relative"
                    title={dayjs(alarm.nextFireTime).format("YYYY/MM/DD HH:mm")}
                  >
                    <span className="bell-icon" aria-hidden="true">
                      🔔
                    </span>
                    {formatRelative(alarm.nextFireTime, relativeNow)}
                  </p>
                </div>
              </div>
              <div className="alarm-title-row">
                <span className="alarm-section-label">アラーム</span>
                <span className="alarm-count">
                  (
                  {alarm.repeatEnabled && alarm.repeatDays.length > 0
                    ? alarm.repeatDays.length
                    : 1}
                  )
                </span>
              </div>
              <p className="alarm-title-text">
                {alarm.title.trim() || "タイトル未設定"}
              </p>
              <div className="alarm-repeat-row">
                <span className="alarm-repeat-label">繰り返し</span>
                <div
                  className={
                    alarm.repeatEnabled ? "alarm-switch active" : "alarm-switch"
                  }
                  aria-label={
                    alarm.repeatEnabled ? "繰り返し ON" : "繰り返し OFF"
                  }
                />
              </div>
              <div className="weekday-ribbon">
                {weekdayOrder.map((day) => {
                  const isActive = activeDays.has(day);
                  return (
                    <span
                      key={day}
                      className={
                        isActive ? "weekday-chip active" : "weekday-chip"
                      }
                    >
                      {weekdayLabelMap[day]}
                    </span>
                  );
                })}
              </div>
              <div className="alarm-actions compact">
                {alarm.url && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void onOpenUrl(alarm.url!);
                    }}
                    className="ghost"
                  >
                    リンクを開く
                  </button>
                )}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void onDelete(alarm.id);
                  }}
                  className="danger"
                >
                  削除
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default AlarmList;
