#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod alarm_store;

use alarm_store::{Alarm, AlarmStore, NewAlarmPayload};
use parking_lot::Mutex;
use tauri::{
    image::Image,
    menu::MenuBuilder,
    tray::{TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime, State, WindowEvent,
};
use tokio::time::{sleep, Duration};

struct AppState {
    store: Mutex<AlarmStore>,
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .map_err(|_| anyhow::anyhow!("アプリ用ディレクトリを取得できません。"))?;
            let data_path = data_dir.join("alarms.json");
            let store = AlarmStore::new(data_path)?;
            app.manage(AppState {
                store: Mutex::new(store),
            });
            start_alarm_loop(app.handle().clone());
            register_tray(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_alarms,
            create_alarm,
            delete_alarm,
            update_alarm_title,
            update_alarm,
            acknowledge_alarm,
            import_alarms
        ])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // × で閉じた際は非表示に留めてトレイに常駐
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Sebastian");
}

fn start_alarm_loop(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            {
                let due_alarms = {
                    let state = app.state::<AppState>();
                    let mut store = state.store.lock();
                    match store.due_alarms() {
                        Ok(list) => list,
                        Err(err) => {
                            eprintln!("アラーム判定に失敗: {:?}", err);
                            Vec::new()
                        }
                    }
                };
                if !due_alarms.is_empty() {
                    notify_alarms(&app, due_alarms);
                }
            }
            sleep(Duration::from_secs(1)).await;
        }
    });
}

fn notify_alarms(app: &AppHandle, alarms: Vec<Alarm>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.set_always_on_top(true);
        let _ = window.show();
        let _ = window.set_focus();
    }
    for alarm in alarms {
        if let Err(err) = app.emit("alarm_triggered", &alarm) {
            eprintln!("イベント送出に失敗: {:?}", err);
        }
    }
}

#[tauri::command]
fn list_alarms(state: State<AppState>) -> Result<Vec<Alarm>, String> {
    Ok(state.store.lock().list())
}

#[tauri::command]
fn create_alarm(payload: NewAlarmPayload, state: State<AppState>) -> Result<Vec<Alarm>, String> {
    let mut guard = state.store.lock();
    guard.create(payload).map_err(|e| e.to_string())?;
    Ok(guard.list())
}

#[tauri::command]
fn delete_alarm(id: String, state: State<AppState>) -> Result<Vec<Alarm>, String> {
    let mut guard = state.store.lock();
    guard.delete(&id).map_err(|e| e.to_string())?;
    Ok(guard.list())
}

#[tauri::command]
fn update_alarm_title(
    id: String,
    title: String,
    state: State<AppState>,
) -> Result<Vec<Alarm>, String> {
    let mut guard = state.store.lock();
    guard.update_title(&id, &title).map_err(|e| e.to_string())?;
    Ok(guard.list())
}

#[tauri::command]
fn update_alarm(
    id: String,
    payload: NewAlarmPayload,
    state: State<AppState>,
) -> Result<Vec<Alarm>, String> {
    let mut guard = state.store.lock();
    guard.update(&id, payload).map_err(|e| e.to_string())?;
    Ok(guard.list())
}

#[tauri::command]
fn acknowledge_alarm(
    app: AppHandle,
    id: String,
    state: State<AppState>,
) -> Result<Vec<Alarm>, String> {
    let updated = {
        let mut guard = state.store.lock();
        guard.acknowledge(&id).map_err(|e| e.to_string())?;
        guard.list()
    };
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_always_on_top(false);
    }
    Ok(updated)
}

#[tauri::command]
fn import_alarms(
    payloads: Vec<NewAlarmPayload>,
    replace_existing: bool,
    state: State<AppState>,
) -> Result<Vec<Alarm>, String> {
    if payloads.is_empty() {
        return Err("インポート対象が空です。".into());
    }
    let mut guard = state.store.lock();
    guard
        .import_many(payloads, replace_existing)
        .map_err(|e| e.to_string())?;
    Ok(guard.list())
}

fn register_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let tray_menu = MenuBuilder::new(app)
        .text("show", "表示")
        .text("quit", "終了")
        .build()?;

    let tray_icon = Image::from_bytes(include_bytes!("../icons/tray_icon.png"))?;

    TrayIconBuilder::new()
        .icon(tray_icon)
        .menu(&tray_menu)
        .on_menu_event(|app, event| handle_tray_menu_event(app, event.id().as_ref()))
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick { .. } = event {
                if let Some(window) = tray.app_handle().get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

fn handle_tray_menu_event<R: Runtime>(app: &AppHandle<R>, id: &str) {
    match id {
        "show" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "quit" => app.exit(0),
        _ => {}
    }
}
