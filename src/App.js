import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
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
];
const DEFAULT_LEAD_MINUTES = 3;
const DEFAULT_LEAD_KEY = "sebastian:defaultLeadMinutes";
const clampLeadMinutes = (value) => Math.max(0, Math.min(720, Math.floor(value)));
const loadDefaultLeadMinutes = () => {
    if (typeof window === "undefined")
        return DEFAULT_LEAD_MINUTES;
    const stored = window.localStorage.getItem(DEFAULT_LEAD_KEY);
    if (stored === null)
        return DEFAULT_LEAD_MINUTES;
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? clampLeadMinutes(parsed) : DEFAULT_LEAD_MINUTES;
};
const App = () => {
    const [alarms, setAlarms] = useState([]);
    const [activeAlarm, setActiveAlarm] = useState(null);
    const [editingAlarm, setEditingAlarm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [defaultLeadMinutes, setDefaultLeadMinutes] = useState(() => loadDefaultLeadMinutes());
    const audioCtxRef = useRef(null);
    const oscillatorsRef = useRef([]);
    const subtitleText = useMemo(() => {
        const index = Math.floor(Math.random() * SUBTITLE_OPTIONS.length);
        return SUBTITLE_OPTIONS[index];
    }, []);
    const refresh = useCallback(async () => {
        try {
            const data = await invoke("list_alarms");
            setAlarms(data);
            setError(null);
        }
        catch (err) {
            console.error(err);
            setError("アラーム一覧の取得に失敗しました。");
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        refresh();
        const unlistenPromise = listen("alarm_triggered", (event) => {
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
        if (audioCtxRef.current)
            return;
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
        const activeOscillators = [];
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
        if (!audioCtxRef.current)
            return;
        oscillatorsRef.current.forEach((osc) => {
            osc.onended = null;
            try {
                osc.stop();
            }
            catch {
                // stop は終了間際に呼ぶと例外になるため握りつぶす
            }
        });
        cleanupTone();
    };
    const handleCreate = async (payload) => {
        const updated = await invoke("create_alarm", { payload });
        setAlarms(updated);
    };
    const handleDelete = async (id) => {
        const updated = await invoke("delete_alarm", { id });
        setAlarms(updated);
    };
    const handleOpenUrl = useCallback(async (url) => {
        try {
            await openUrl(url);
        }
        catch (err) {
            console.error("URL の起動に失敗しました:", err);
        }
    }, []);
    const handleSelectAlarm = (alarm) => {
        setEditingAlarm(alarm);
        setIsEditOpen(true);
    };
    const handleDefaultLeadInput = (event) => {
        const parsed = Number(event.target.value);
        const normalized = Number.isFinite(parsed) ? parsed : 0;
        const clamped = clampLeadMinutes(normalized);
        setDefaultLeadMinutes(clamped);
        if (typeof window !== "undefined") {
            window.localStorage.setItem(DEFAULT_LEAD_KEY, clamped.toString());
        }
    };
    const editingInitialValues = useMemo(() => {
        if (!editingAlarm)
            return undefined;
        return {
            title: editingAlarm.title,
            timeLabel: editingAlarm.timeLabel,
            url: editingAlarm.url,
            repeatEnabled: editingAlarm.repeatEnabled,
            repeatDays: editingAlarm.repeatDays,
            leadMinutes: editingAlarm.leadMinutes ?? defaultLeadMinutes,
        };
    }, [editingAlarm, defaultLeadMinutes]);
    const handleUpdate = async (payload) => {
        if (!editingAlarm)
            return;
        const updated = await invoke("update_alarm", {
            id: editingAlarm.id,
            payload,
        });
        setAlarms(updated);
    };
    const handleImportSubmit = async (payloads, replaceExisting) => {
        const updated = await invoke("import_alarms", {
            payloads,
            replaceExisting,
        });
        setAlarms(updated);
    };
    const handleStop = async () => {
        if (!activeAlarm)
            return;
        try {
            const updated = await invoke("acknowledge_alarm", {
                id: activeAlarm.id,
            });
            setAlarms(updated);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setActiveAlarm(null);
            stopTone();
        }
    };
    return (_jsxs("main", { className: "container", children: [_jsxs("header", { children: [_jsx("h1", { children: "Sebastian" }), _jsx("p", { className: "subtitle", children: subtitleText })] }), _jsxs("div", { className: "toolbar", children: [_jsxs("label", { className: "default-lead-control", children: [_jsx("span", { children: "\u30C7\u30D5\u30A9\u30EB\u30C8\u30EA\u30FC\u30C9 (\u5206)" }), _jsx("input", { type: "number", min: 0, max: 720, step: 1, value: defaultLeadMinutes, onChange: handleDefaultLeadInput, "aria-label": "\u30C7\u30D5\u30A9\u30EB\u30C8 leadMinutes" })] }), _jsx("button", { type: "button", className: "import-button", onClick: () => setIsImportOpen(true), children: "JSON \u304B\u3089\u30A4\u30F3\u30DD\u30FC\u30C8" })] }), error && _jsx("p", { className: "error-text", children: error }), loading ? (_jsx("p", { children: "\u8AAD\u307F\u8FBC\u307F\u4E2D..." })) : (_jsx(AlarmList, { alarms: alarms, onDelete: handleDelete, onOpenUrl: handleOpenUrl, onSelect: handleSelectAlarm })), _jsx("button", { type: "button", className: "add-button floating-add", onClick: () => setIsFormOpen(true), "aria-label": "\u30A2\u30E9\u30FC\u30E0\u3092\u8FFD\u52A0", children: "\uFF0B \u30A2\u30E9\u30FC\u30E0\u8FFD\u52A0" }), _jsx(AlarmDialog, { alarm: activeAlarm, onStop: handleStop, onOpenUrl: handleOpenUrl }), _jsx(AddAlarmModal, { open: isFormOpen, onClose: () => setIsFormOpen(false), onSubmit: handleCreate, defaultLeadMinutes: defaultLeadMinutes }), _jsx(AddAlarmModal, { open: isEditOpen && !!editingAlarm, onClose: () => {
                    setIsEditOpen(false);
                    setEditingAlarm(null);
                }, onSubmit: handleUpdate, initialValues: editingInitialValues, defaultLeadMinutes: defaultLeadMinutes, heading: "\u30A2\u30E9\u30FC\u30E0\u7DE8\u96C6", submitLabel: "\u4FDD\u5B58\u3059\u308B", submittingLabel: "\u4FDD\u5B58\u4E2D..." }), _jsx(ImportAlarmsModal, { open: isImportOpen, onClose: () => setIsImportOpen(false), onSubmit: handleImportSubmit })] }));
};
export default App;
