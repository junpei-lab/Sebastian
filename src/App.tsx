import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Alarm, NewAlarmPayload } from "./types/alarm";
import AlarmList from "./components/AlarmList";
import AlarmDialog from "./components/AlarmDialog";
import AddAlarmModal from "./components/AddAlarmModal";
import ImportAlarmsModal from "./components/ImportAlarmsModal";

const App = () => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [activeAlarm, setActiveAlarm] = useState<Alarm | null>(null);
  const [editingAlarm, setEditingAlarm] = useState<Alarm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);

  const refresh = useCallback(async () => {
    try {
      const data = await invoke<Alarm[]>("list_alarms");
      setAlarms(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("アラーム一覧の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const unlistenPromise = listen<Alarm>("alarm_triggered", (event) => {
      setActiveAlarm(event.payload);
      startTone();
    });
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
      stopTone();
    };
  }, [refresh]);

  const cleanupTone = () => {
    oscillatorsRef.current = [];
    const ctx = audioCtxRef.current;
    audioCtxRef.current = null;
    if (ctx) {
      void ctx.close();
    }
  };

  const startTone = () => {
    // 卓上ベルのような金属的な減衰音を生成する
    if (audioCtxRef.current) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.18, now);
    masterGain.connect(ctx.destination);

    const partials = [
      { freq: 1980, decay: 3, level: 1 },
      { freq: 990, decay: 3.4, level: 0.55 },
      { freq: 2960, decay: 2.1, level: 0.4 },
      { freq: 4050, decay: 1.2, level: 0.3 },
    ];

    let remaining = partials.length;
    const handleEnded = () => {
      remaining -= 1;
      if (remaining === 0) {
        cleanupTone();
      }
    };

    const activeOscillators: OscillatorNode[] = [];
    partials.forEach(({ freq, decay, level }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.3 * level, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(gain).connect(masterGain);
      osc.start(now);
      osc.stop(now + decay);
      osc.onended = handleEnded;
      activeOscillators.push(osc);
    });

    audioCtxRef.current = ctx;
    oscillatorsRef.current = activeOscillators;
  };

  const stopTone = () => {
    if (!audioCtxRef.current) return;
    oscillatorsRef.current.forEach((osc) => {
      osc.onended = null;
      try {
        osc.stop();
      } catch {
        // stop は終了後に呼ぶと例外になるため握りつぶす
      }
    });
    cleanupTone();
  };

  const handleCreate = async (payload: NewAlarmPayload) => {
    const updated = await invoke<Alarm[]>("create_alarm", { payload });
    setAlarms(updated);
  };

  const handleDelete = async (id: string) => {
    const updated = await invoke<Alarm[]>("delete_alarm", { id });
    setAlarms(updated);
  };

  const handleOpenUrl = useCallback(async (url: string) => {
    try {
      await openUrl(url);
    } catch (err) {
      console.error("URL の起動に失敗しました:", err);
    }
  }, []);

  const handleSelectAlarm = (alarm: Alarm) => {
    setEditingAlarm(alarm);
    setIsEditOpen(true);
  };

  const editingInitialValues = useMemo(() => {
    if (!editingAlarm) return undefined;
    return {
      title: editingAlarm.title,
      timeLabel: editingAlarm.timeLabel,
      url: editingAlarm.url,
      repeatEnabled: editingAlarm.repeatEnabled,
      repeatDays: editingAlarm.repeatDays,
      leadMinutes: editingAlarm.leadMinutes ?? 3,
    };
  }, [editingAlarm]);

  const handleUpdate = async (payload: NewAlarmPayload) => {
    if (!editingAlarm) return;
    const updated = await invoke<Alarm[]>("update_alarm", {
      id: editingAlarm.id,
      payload,
    });
    setAlarms(updated);
  };

  const handleImportSubmit = async (
    payloads: NewAlarmPayload[],
    replaceExisting: boolean,
  ) => {
    const updated = await invoke<Alarm[]>("import_alarms", {
      payloads,
      replace_existing: replaceExisting,
    });
    setAlarms(updated);
  };

  const handleStop = async () => {
    if (!activeAlarm) return;
    try {
      const updated = await invoke<Alarm[]>("acknowledge_alarm", {
        id: activeAlarm.id,
      });
      setAlarms(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setActiveAlarm(null);
      stopTone();
    }
  };

  return (
    <main className="container">
      <header>
        <h1>Sebastian</h1>
        <p className="subtitle">Midnight feathers chase quiet echoes.</p>
      </header>
      <div className="toolbar">
        <button
          type="button"
          className="import-button"
          onClick={() => setIsImportOpen(true)}
        >
          JSON からインポート
        </button>
      </div>
      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <AlarmList
          alarms={alarms}
          onDelete={handleDelete}
          onOpenUrl={handleOpenUrl}
          onSelect={handleSelectAlarm}
        />
      )}
      <button
        type="button"
        className="add-button floating-add"
        onClick={() => setIsFormOpen(true)}
        aria-label="アラームを追加"
      >
        ＋ アラーム追加
      </button>
      <AlarmDialog
        alarm={activeAlarm}
        onStop={handleStop}
        onOpenUrl={handleOpenUrl}
      />
      <AddAlarmModal
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreate}
      />
      <AddAlarmModal
        open={isEditOpen && !!editingAlarm}
        onClose={() => {
          setIsEditOpen(false);
          setEditingAlarm(null);
        }}
        onSubmit={handleUpdate}
        initialValues={editingInitialValues}
        heading="アラーム編集"
        submitLabel="保存する"
        submittingLabel="保存中..."
      />
      <ImportAlarmsModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSubmit={handleImportSubmit}
      />
    </main>
  );
};

export default App;
