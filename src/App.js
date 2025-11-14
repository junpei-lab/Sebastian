import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import AlarmForm from "./components/AlarmForm";
import AlarmList from "./components/AlarmList";
import AlarmDialog from "./components/AlarmDialog";
const App = () => {
    const [alarms, setAlarms] = useState([]);
    const [activeAlarm, setActiveAlarm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const audioCtxRef = useRef(null);
    const oscillatorRef = useRef(null);
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
    const startTone = () => {
        // Web Audio API でシンプルなビープ音を生成してループする
        if (audioCtxRef.current)
            return;
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
    const handleCreate = async (payload) => {
        const updated = await invoke("create_alarm", { payload });
        setAlarms(updated);
    };
    const handleDelete = async (id) => {
        const updated = await invoke("delete_alarm", { id });
        setAlarms(updated);
    };
    const handleTitleChange = async (id, title) => {
        const trimmed = title.trim();
        const updated = await invoke("update_alarm_title", { id, title: trimmed });
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
    const handleStop = async () => {
        if (!activeAlarm)
            return;
        try {
            const updated = await invoke("acknowledge_alarm", { id: activeAlarm.id });
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
    return (_jsxs("main", { className: "container", children: [_jsxs("header", { children: [_jsx("h1", { children: "Sebastian" }), _jsx("p", { className: "subtitle", children: "\u8EFD\u91CF\u306A Tauri \u88FD\u30A2\u30E9\u30FC\u30E0\u30C4\u30FC\u30EB" })] }), error && _jsx("p", { className: "error-text", children: error }), _jsx(AlarmForm, { onSubmit: handleCreate }), loading ? (_jsx("p", { children: "\u8AAD\u307F\u8FBC\u307F\u4E2D..." })) : (_jsx(AlarmList, { alarms: alarms, onDelete: handleDelete, onTitleChange: handleTitleChange, onOpenUrl: handleOpenUrl })), _jsx(AlarmDialog, { alarm: activeAlarm, onStop: handleStop, onOpenUrl: handleOpenUrl })] }));
};
export default App;
