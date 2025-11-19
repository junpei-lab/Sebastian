import { useCallback, useEffect, useMemo, useRef, useState, ChangeEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Alarm, NewAlarmPayload } from "./types/alarm";
import AlarmList from "./components/AlarmList";
import AlarmDialog from "./components/AlarmDialog";
import AddAlarmModal from "./components/AddAlarmModal";
import ImportAlarmsModal from "./components/ImportAlarmsModal";

const SUBTITLE_OPTIONS = [
  "Midnight feathers chase quiet echoes.",
  "Neon embers waltz through painted fog.",
  "Paper stars drift across velvet tides.",
  "Clockwork fireflies trace forgotten maps.",
  "Silver lanterns guard the sleepless harbor.",
  "Echoing footfalls stitch together dawn.",
  "Glass comets hum above the empty square.",
  "Ancient ravens translate cooling embers.",
  "Hidden rivers murmur beneath the rails.",
  "Frosted violets memorize the skyline.",
  "Lantern-lit moths rehearse for solstice.",
  "Satellite petals orbit borrowed dreams.",
  "Crimson quills sketch ultraviolet rain.",
  "Opal whispers anchor restless balloons.",
  "Moonlit ciphers cradle patient ghosts.",
  "Transient zephyrs tune the distant bells.",
  "Velvet lighthouses pulse beneath the waves.",
  "Magnetic snowflakes choreograph the rooftops.",
  "Steam-born sparrows catalog the skyline.",
  "Twilight circuits echo through hollow trees.",
  "Saffron halos crown the quiet avenue.",
  "Paper zeppelins ferry half-remembered songs.",
  "Suspended violins sip from silent wells.",
  "Azure embers navigate the sleepless pier.",
  "Collapsing halos frame the wandering choir.",
  "Celestial bridges braid the cinder clouds.",
  "Mercury gulls patrol the lantern lakes.",
  "Harmonic raindrops polish weathered runes.",
  "Obsidian swallows ferry the postal moon.",
  "Serenade sparks bloom inside winter engines."
] as const;

const DEFAULT_LEAD_MINUTES = 3;
const DEFAULT_LEAD_KEY = "sebastian:defaultLeadMinutes";

const clampLeadMinutes = (value: number) =>
  Math.max(0, Math.min(720, Math.floor(value)));

const loadDefaultLeadMinutes = (): number => {
  if (typeof window === "undefined") return DEFAULT_LEAD_MINUTES;
  const stored = window.localStorage.getItem(DEFAULT_LEAD_KEY);
  if (stored === null) return DEFAULT_LEAD_MINUTES;
  const parsed = Number(stored);
  return Number.isFinite(parsed) ? clampLeadMinutes(parsed) : DEFAULT_LEAD_MINUTES;
};

const App = () => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [alarmQueue, setAlarmQueue] = useState<Alarm[]>([]);
  const [editingAlarm, setEditingAlarm] = useState<Alarm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [defaultLeadMinutes, setDefaultLeadMinutes] = useState<number>(() =>
    loadDefaultLeadMinutes(),
  );
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const currentAlarm = alarmQueue[0] ?? null;
  const subtitleText = useMemo(() => {
    const index = Math.floor(Math.random() * SUBTITLE_OPTIONS.length);
    return SUBTITLE_OPTIONS[index];
  }, []);

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

  const cleanupTone = useCallback(() => {
    oscillatorsRef.current = [];
    const ctx = audioCtxRef.current;
    audioCtxRef.current = null;
    if (ctx) {
      void ctx.close();
    }
  }, []);

  const startTone = useCallback(() => {
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
  }, [cleanupTone]);

  const stopTone = useCallback(() => {
    if (!audioCtxRef.current) return;
    oscillatorsRef.current.forEach((osc) => {
      osc.onended = null;
      try {
        osc.stop();
      } catch {
        // stop は終了間際に呼ぶと例外になるため握りつぶす
      }
    });
    cleanupTone();
  }, [cleanupTone]);

  useEffect(() => {
    refresh();
    const unlistenPromise = listen<Alarm>("alarm_triggered", (event) => {
      setAlarmQueue((prev) => {
        if (prev.some((alarm) => alarm.id === event.payload.id)) {
          return prev;
        }
        if (prev.length === 0) {
          startTone();
        }
        return [...prev, event.payload];
      });
    });
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
      setAlarmQueue([]);
      stopTone();
    };
  }, [refresh, startTone, stopTone]);

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

  const handleDefaultLeadInput = (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = Number(event.target.value);
    const normalized = Number.isFinite(parsed) ? parsed : 0;
    const clamped = clampLeadMinutes(normalized);
    setDefaultLeadMinutes(clamped);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DEFAULT_LEAD_KEY, clamped.toString());
    }
  };

  const editingInitialValues = useMemo(() => {
    if (!editingAlarm) return undefined;
    return {
      title: editingAlarm.title,
      timeLabel: editingAlarm.timeLabel,
      url: editingAlarm.url,
      repeatEnabled: editingAlarm.repeatEnabled,
      repeatDays: editingAlarm.repeatDays,
      leadMinutes: editingAlarm.leadMinutes ?? defaultLeadMinutes,
    };
  }, [editingAlarm, defaultLeadMinutes]);

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
      replaceExisting,
    });
    setAlarms(updated);
  };

  const handleStop = async () => {
    const alarmToStop = currentAlarm;
    if (!alarmToStop) return;
    try {
      const updated = await invoke<Alarm[]>("acknowledge_alarm", {
        id: alarmToStop.id,
      });
      setAlarms(updated);
      let queueEmptied = false;
      setAlarmQueue((prev) => {
        if (prev.length === 0) {
          return prev;
        }
        const [, ...rest] = prev;
        if (rest.length === 0) {
          queueEmptied = true;
        }
        return rest;
      });
      if (queueEmptied) {
        stopTone();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="container">
      <header>
        <h1>Sebastian</h1>
        <p className="subtitle">{subtitleText}</p>
      </header>
      <div className="toolbar">
        <label className="default-lead-control">
          <span>デフォルトリード (分)</span>
          <input
            type="number"
            min={0}
            max={720}
            step={1}
            value={defaultLeadMinutes}
            onChange={handleDefaultLeadInput}
            aria-label="デフォルト leadMinutes"
          />
        </label>
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
        alarm={currentAlarm}
        onStop={handleStop}
        onOpenUrl={handleOpenUrl}
      />
      <AddAlarmModal
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreate}
        defaultLeadMinutes={defaultLeadMinutes}
      />
      <AddAlarmModal
        open={isEditOpen && !!editingAlarm}
        onClose={() => {
          setIsEditOpen(false);
          setEditingAlarm(null);
        }}
        onSubmit={handleUpdate}
        initialValues={editingInitialValues}
        defaultLeadMinutes={defaultLeadMinutes}
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
