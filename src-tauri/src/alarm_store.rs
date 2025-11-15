use anyhow::{anyhow, Context, Result};
use chrono::{
    DateTime, Datelike, Duration, Local, NaiveTime, TimeZone, Timelike, Weekday as ChronoWeekday,
};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Alarm {
    pub id: String,
    pub title: String,
    pub time_label: String,
    pub next_fire_time: String,
    pub url: Option<String>,
    pub repeat_enabled: bool,
    #[serde(default)]
    pub repeat_days: Vec<Weekday>,
    #[serde(default = "default_lead_minutes")]
    pub lead_minutes: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewAlarmPayload {
    pub title: String,
    pub time_label: String,
    pub url: Option<String>,
    pub repeat_enabled: bool,
    #[serde(default)]
    pub repeat_days: Vec<Weekday>,
    #[serde(default = "default_lead_minutes")]
    pub lead_minutes: i64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "PascalCase")]
pub enum Weekday {
    Mon,
    Tue,
    Wed,
    Thu,
    Fri,
    Sat,
    Sun,
}

impl Weekday {
    fn to_chrono(self) -> ChronoWeekday {
        match self {
            Weekday::Mon => ChronoWeekday::Mon,
            Weekday::Tue => ChronoWeekday::Tue,
            Weekday::Wed => ChronoWeekday::Wed,
            Weekday::Thu => ChronoWeekday::Thu,
            Weekday::Fri => ChronoWeekday::Fri,
            Weekday::Sat => ChronoWeekday::Sat,
            Weekday::Sun => ChronoWeekday::Sun,
        }
    }
}

const MAX_LEAD_MINUTES: i64 = 720;

fn default_lead_minutes() -> i64 {
    3
}

fn clamp_lead_minutes(value: i64) -> i64 {
    value.max(0).min(MAX_LEAD_MINUTES)
}

fn build_alarm_from_payload(payload: NewAlarmPayload, now: DateTime<Local>) -> Result<Alarm> {
    let NewAlarmPayload {
        title,
        time_label,
        url,
        repeat_enabled,
        repeat_days,
        lead_minutes,
    } = payload;
    if repeat_enabled && repeat_days.is_empty() {
        return Err(anyhow!(
            "繰り返しが ON の場合は曜日を 1 つ以上指定してください。"
        ));
    }
    let title = title.trim().to_string();
    let time_label = time_label.trim().to_string();
    let lead_minutes = clamp_lead_minutes(lead_minutes);
    let next = compute_next_fire(&time_label, repeat_enabled, &repeat_days, lead_minutes, now)?;
    Ok(Alarm {
        id: Uuid::new_v4().to_string(),
        title,
        time_label,
        next_fire_time: next.to_rfc3339(),
        url,
        repeat_enabled,
        repeat_days,
        lead_minutes,
    })
}

#[derive(Debug)]
pub struct AlarmStore {
    path: PathBuf,
    alarms: Vec<Alarm>,
    ringing: HashSet<String>,
}

impl AlarmStore {
    pub fn new(path: PathBuf) -> Result<Self> {
        let alarms = if path.exists() {
            let raw = fs::read_to_string(&path)?;
            if raw.is_empty() {
                Vec::new()
            } else {
                serde_json::from_str(&raw)?
            }
        } else {
            Vec::new()
        };
        Ok(Self {
            path,
            alarms,
            ringing: HashSet::new(),
        })
    }

    pub fn list(&self) -> Vec<Alarm> {
        let mut cloned = self.alarms.clone();
        cloned.sort_by(|a, b| a.next_fire_time.cmp(&b.next_fire_time));
        cloned
    }

    pub fn create(&mut self, payload: NewAlarmPayload) -> Result<()> {
        let alarm = build_alarm_from_payload(payload, Local::now())?;
        self.alarms.push(alarm);
        self.save()
    }

    pub fn delete(&mut self, id: &str) -> Result<()> {
        self.alarms.retain(|alarm| alarm.id != id);
        self.ringing.remove(id);
        self.save()
    }

    pub fn update_title(&mut self, id: &str, title: &str) -> Result<()> {
        if let Some(alarm) = self.alarms.iter_mut().find(|a| a.id == id) {
            alarm.title = title.trim().to_string();
            self.save()?;
            Ok(())
        } else {
            Err(anyhow!("指定されたアラームが見つかりません。"))
        }
    }

    pub fn update(&mut self, id: &str, payload: NewAlarmPayload) -> Result<()> {
        let now = Local::now();
        let NewAlarmPayload {
            title,
            time_label,
            url,
            repeat_enabled,
            repeat_days,
            lead_minutes,
        } = payload;
        if repeat_enabled && repeat_days.is_empty() {
            return Err(anyhow!(
                "繰り返しが ON の場合は曜日を 1 つ以上指定してください。"
            ));
        }
        let title = title.trim().to_string();
        let time_label = time_label.trim().to_string();
        let lead_minutes = clamp_lead_minutes(lead_minutes);
        let next = compute_next_fire(&time_label, repeat_enabled, &repeat_days, lead_minutes, now)?;
        if let Some(alarm) = self.alarms.iter_mut().find(|a| a.id == id) {
            alarm.title = title;
            alarm.time_label = time_label;
            alarm.url = url;
            alarm.repeat_enabled = repeat_enabled;
            alarm.repeat_days = repeat_days;
            alarm.next_fire_time = next.to_rfc3339();
            alarm.lead_minutes = lead_minutes;
            self.save()
        } else {
            Err(anyhow!("指定されたアラームが見つかりません。"))
        }
    }

    pub fn due_alarms(&mut self) -> Result<Vec<Alarm>> {
        let now = Local::now();
        let mut due = Vec::new();
        for alarm in &self.alarms {
            if self.ringing.contains(&alarm.id) {
                continue;
            }
            let fire_time = DateTime::parse_from_rfc3339(&alarm.next_fire_time)
                .with_context(|| format!("next_fire_time parse error: {}", alarm.next_fire_time))?
                .with_timezone(&Local);
            if fire_time <= now {
                self.ringing.insert(alarm.id.clone());
                due.push(alarm.clone());
            }
        }
        Ok(due)
    }

    pub fn acknowledge(&mut self, id: &str) -> Result<()> {
        let mut should_save = false;
        if let Some(index) = self.alarms.iter().position(|a| a.id == id) {
            let is_repeat =
                self.alarms[index].repeat_enabled && !self.alarms[index].repeat_days.is_empty();
            if is_repeat {
                let lead_minutes = self.alarms[index].lead_minutes;
                let next = compute_next_fire(
                    &self.alarms[index].time_label,
                    true,
                    &self.alarms[index].repeat_days,
                    lead_minutes,
                    Local::now(),
                )?;
                self.alarms[index].next_fire_time = next.to_rfc3339();
                should_save = true;
            } else {
                self.alarms.remove(index);
                should_save = true;
            }
        }
        self.ringing.remove(id);
        if should_save {
            self.save()?;
        }
        Ok(())
    }

    pub fn import_many(
        &mut self,
        payloads: Vec<NewAlarmPayload>,
        replace_existing: bool,
    ) -> Result<()> {
        if replace_existing {
            self.alarms.clear();
            self.ringing.clear();
        }
        for payload in payloads {
            let alarm = build_alarm_from_payload(payload, Local::now())?;
            self.alarms.push(alarm);
        }
        self.save()
    }

    fn save(&self) -> Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }
        let data = serde_json::to_string_pretty(&self.alarms)?;
        fs::write(&self.path, data)?;
        Ok(())
    }
}

fn compute_next_fire(
    time_label: &str,
    repeat_enabled: bool,
    repeat_days: &[Weekday],
    lead_minutes: i64,
    base: DateTime<Local>,
) -> Result<DateTime<Local>> {
    let time = parse_time_label(time_label)?;
    let safe_lead = clamp_lead_minutes(lead_minutes);
    let lead_duration = Duration::minutes(safe_lead);
    let adjusted_base = base + lead_duration;
    if repeat_enabled && !repeat_days.is_empty() {
        for offset in 0..14 {
            let candidate_date = adjusted_base.date_naive() + Duration::days(offset);
            let weekday = candidate_date.weekday();
            if repeat_days.iter().any(|day| day.to_chrono() == weekday) {
                if let Some(candidate) = Local
                    .with_ymd_and_hms(
                        candidate_date.year(),
                        candidate_date.month(),
                        candidate_date.day(),
                        time.hour(),
                        time.minute(),
                        0,
                    )
                    .single()
                {
                    if candidate > adjusted_base {
                        return Ok(candidate - lead_duration);
                    }
                }
            }
        }
        return Err(anyhow!("次回の発火時刻を計算できませんでした。"));
    }

    let mut candidate = Local
        .with_ymd_and_hms(
            adjusted_base.year(),
            adjusted_base.month(),
            adjusted_base.day(),
            time.hour(),
            time.minute(),
            0,
        )
        .single()
        .ok_or_else(|| anyhow!("無効な日付です。"))?;
    if candidate <= adjusted_base {
        candidate += Duration::days(1);
    }
    Ok(candidate - lead_duration)
}

fn parse_time_label(label: &str) -> Result<NaiveTime> {
    NaiveTime::parse_from_str(label, "%H:%M")
        .with_context(|| format!("時刻の解析に失敗しました: {}", label))
}
