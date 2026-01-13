import { db } from "./db";

export type HabitLogRow = {
  habit_id: string;
  date: string;      // YYYY-MM-DD
  status: 0 | 1;
  note: string | null;
  created_at: string;
};

export function upsertHabitLog(args: {
  habitId: string;
  date: string;            // YYYY-MM-DD
  status: boolean;         // true=success, false=slip
  note?: string;
}) {
  const createdAt = new Date().toISOString();

  db.runSync(
    `
    INSERT INTO habit_logs (habit_id, date, status, note, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(habit_id, date) DO UPDATE SET
      status=excluded.status,
      note=excluded.note;
    `,
    [
      args.habitId,
      args.date,
      args.status ? 1 : 0,
      args.note ?? null,
      createdAt,
    ]
  );
}

export function getHabitLogForDate(habitId: string, date: string): HabitLogRow | null {
  return (
    db.getFirstSync<HabitLogRow>(
      `SELECT habit_id, date, status, note, created_at
       FROM habit_logs
       WHERE habit_id=? AND date=?;`,
      [habitId, date]
    ) ?? null
  );
}

export function clearHabitLogForDate(habitId: string, date: string) {
  db.runSync(`DELETE FROM habit_logs WHERE habit_id=? AND date=?;`, [habitId, date]);
}