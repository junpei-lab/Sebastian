import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Alarm, NewAlarmPayload } from "./types/alarm";
import AlarmForm from "./components/AlarmForm";
import AlarmList from "./components/AlarmList";
import AlarmDialog from "./components/AlarmDialog";

const App = () => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [activeAlarm, setActiveAlarm] = useState<Alarm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

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

  const startTone = () => {
    // Web Audio API でシンプルなビープ音を生成してループする
    if (audioCtxRef.current) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.1;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    audioCtxRef.current = ctx;
    oscillatorRef.current = osc;
  };

  const stopTone = () => {
    oscillatorRef.current?.stop();
    oscillatorRef.current?.disconnect();
    audioCtxRef.current?.close();
    oscillatorRef.current = null;
    audioCtxRef.current = null;
  };

  const handleCreate = async (payload: NewAlarmPayload) => {
    const updated = await invoke<Alarm[]>("create_alarm", { payload });
    setAlarms(updated);
  };

  const handleDelete = async (id: string) => {
    const updated = await invoke<Alarm[]>("delete_alarm", { id });
    setAlarms(updated);
  };

  const handleTitleChange = async (id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const updated = await invoke<Alarm[]>("update_alarm_title", { id, title: trimmed });
    setAlarms(updated);
  };

  const handleOpenUrl = useCallback(async (url: string) => {
    try {
      await openUrl(url);
    } catch (err) {
      console.error("URL の起動に失敗しました:", err);
    }
  }, []);

  const handleStop = async () => {
    if (!activeAlarm) return;
    try {
      const updated = await invoke<Alarm[]>("acknowledge_alarm", { id: activeAlarm.id });
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
        <p className="subtitle">軽量な Tauri 製アラームツール</p>
      </header>
      {error && <p className="error-text">{error}</p>}
      <AlarmForm onSubmit={handleCreate} />
      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <AlarmList
          alarms={alarms}
          onDelete={handleDelete}
          onTitleChange={handleTitleChange}
          onOpenUrl={handleOpenUrl}
        />
      )}
      <AlarmDialog alarm={activeAlarm} onStop={handleStop} onOpenUrl={handleOpenUrl} />
    </main>
  );
};

export default App;
