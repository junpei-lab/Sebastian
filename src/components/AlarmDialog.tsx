import { Alarm } from "../types/alarm";

type AlarmDialogProps = {
  alarm: Alarm | null;
  onStop: () => Promise<void>;
  onOpenUrl: (url: string) => Promise<void>;
};

const AlarmDialog = ({ alarm, onStop, onOpenUrl }: AlarmDialogProps) => {
  if (!alarm) return null;

  return (
    <div className="alarm-dialog-backdrop">
      <div className="alarm-dialog card">
        <p className="dialog-label">アラームが鳴っています！</p>
        <h2 className="dialog-title">{alarm.title}</h2>
        <p className="dialog-time">{alarm.timeLabel}</p>
        <div className="dialog-actions">
          {alarm.url && (
            <button
              type="button"
              className="ghost"
              onClick={() => {
                void onOpenUrl(alarm.url!);
              }}
            >
              リンクを開く
            </button>
          )}
          <button
            type="button"
            className="danger"
            onClick={() => {
              void onStop();
            }}
          >
            停止
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlarmDialog;
