export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export interface Alarm {
  id: string;
  title: string;
  timeLabel: string;
  nextFireTime: string;
  url?: string;
  repeatEnabled: boolean;
  repeatDays: Weekday[];
}

export interface NewAlarmPayload {
  title: string;
  timeLabel: string;
  url?: string;
  repeatEnabled: boolean;
  repeatDays: Weekday[];
}
