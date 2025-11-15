import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import AlarmList from "./components/AlarmList";
import AlarmDialog from "./components/AlarmDialog";
import AddAlarmModal from "./components/AddAlarmModal";
import ImportAlarmsModal from "./components/ImportAlarmsModal";
const App = () => {
    const [alarms, setAlarms] = useState([]);
    const [activeAlarm, setActiveAlarm] = useState(null);
    const [editingAlarm, setEditingAlarm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const audioCtxRef = useRef(null);
    const oscillatorsRef = useRef([]);
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
        // 卓上ベルのような金属的な減衰音を生成する
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
                // stop は終了後に呼ぶと例外になるため握りつぶす
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
    const editingInitialValues = useMemo(() => {
        if (!editingAlarm)
            return undefined;
        return {
            title: editingAlarm.title,
            timeLabel: editingAlarm.timeLabel,
            url: editingAlarm.url,
            repeatEnabled: editingAlarm.repeatEnabled,
            repeatDays: editingAlarm.repeatDays,
            leadMinutes: editingAlarm.leadMinutes ?? 3,
        };
    }, [editingAlarm]);
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
            replace_existing: replaceExisting,
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
    return (_jsxs("main", { className: "container", children: [_jsxs("header", { children: [_jsx("h1", { children: "Sebastian" }), _jsx("p", { className: "subtitle", children: "Midnight feathers chase quiet echoes." })] }), _jsx("div", { className: "toolbar", children: _jsx("button", { type: "button", className: "import-button", onClick: () => setIsImportOpen(true), children: "JSON \u304B\u3089\u30A4\u30F3\u30DD\u30FC\u30C8" }) }), error && _jsx("p", { className: "error-text", children: error }), loading ? (_jsx("p", { children: "\u8AAD\u307F\u8FBC\u307F\u4E2D..." })) : (_jsx(AlarmList, { alarms: alarms, onDelete: handleDelete, onOpenUrl: handleOpenUrl, onSelect: handleSelectAlarm })), _jsx("button", { type: "button", className: "add-button floating-add", onClick: () => setIsFormOpen(true), "aria-label": "\u30A2\u30E9\u30FC\u30E0\u3092\u8FFD\u52A0", children: "\uFF0B \u30A2\u30E9\u30FC\u30E0\u8FFD\u52A0" }), _jsx(AlarmDialog, { alarm: activeAlarm, onStop: handleStop, onOpenUrl: handleOpenUrl }), _jsx(AddAlarmModal, { open: isFormOpen, onClose: () => setIsFormOpen(false), onSubmit: handleCreate }), _jsx(AddAlarmModal, { open: isEditOpen && !!editingAlarm, onClose: () => {
                    setIsEditOpen(false);
                    setEditingAlarm(null);
                }, onSubmit: handleUpdate, initialValues: editingInitialValues, heading: "\u30A2\u30E9\u30FC\u30E0\u7DE8\u96C6", submitLabel: "\u4FDD\u5B58\u3059\u308B", submittingLabel: "\u4FDD\u5B58\u4E2D..." }), _jsx(ImportAlarmsModal, { open: isImportOpen, onClose: () => setIsImportOpen(false), onSubmit: handleImportSubmit })] }));
};
export default App;
