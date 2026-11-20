export type User={id:string;name:string;email:string;hero_class:"Warrior"|"Mage"|"Priest";xp:number;level:number;xp_in_level:number;xp_next:number;is_demo:boolean;is_admin?:boolean};
export type Habit={id:string;title:string;category:string;target_minutes:number;streak:number;best_streak:number;consecutive_recoveries:number;completed_today:boolean};
export type RecoveryStatus="offered"|"accepted"|"micro_completed"|"step_completed"|"completed"|"expired";
export type Recovery={id:string;habit_id:string;habit_title:string;original_minutes:number;reason:string;status:RecoveryStatus;micro_minutes:number;step_minutes:number;micro_text:string;step_text:string;streak_before:number;reported_at:string;expires_at:string;missed_date:string;remaining_windows:number;hero_log:string};
export type History={date:string;kind:string;minutes:number;habit_title:string};
export type DailyCompletion={date:string;total_habits:number;completed_habits:number;percentage:number};
export type Insights={total_habits:number;full_sessions:number;perfect_days:number;daily_completion:DailyCompletion[];recoveries:number;step_ups:number;best_streak:number;history:History[];achievements?:Achievements};
export type Achievements={first_step:boolean;three_days:boolean;comeback:boolean};
export type PersonalReward={reward:{title:string;progress:number}|null;goal:number};
export type RecoveryFunnel={offered:number;accepted:number;completed:number;restored:number};
export type AdminPeriod = 7 | 30;
export type LegacyMetrics = {
  real_users: number;
  habits_created: number;
  missed_reports: number;
  eligible_matured: number;
  recovered_within_48h: number;
  recovery_rate_percent: number;
  events_last_30_days: { name: string; count: number }[];
};
export type Metrics = {
  window_days: AdminPeriod;
  updated_at: string;
  real_users: number;
  habits_created: number;
  missed_reports: number;
  signups: number;
  active_users: number;
  eligible_matured: number;
  pending_48h: number;
  recovered_within_48h: number;
  recovery_rate_percent: number;
  retention_7d: { eligible: number; returned: number };
  recovery_funnel: RecoveryFunnel;
  daily_activity: { date: string; active_users: number; completion_actions: number }[];
  event_counts: { name: string; count: number }[];
};

export type WeekHabit = {
  id: string;
  title: string;
  category: string;
  target_minutes: number;
  completed: boolean;
};

export type WeekDay = {
  date: string;
  habits: WeekHabit[];
};
