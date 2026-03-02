import { db } from "./db";

export type HabitLogRow = {
  habit_id: string;
  date: string;      // YYYY-MM-DD
  status: 0 | 1;
  note: string | null;
};

export function upsertHabitLog(args: {
  habitId: string;
  date: string;            // YYYY-MM-DD
  status: boolean;         // true=success, false=slip
  note?: string;
}) {

  db.runSync(
    `
    INSERT INTO habit_logs (habit_id, date, status, note)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(habit_id, date) DO UPDATE SET
      status=excluded.status,
      note=excluded.note;
    `,
    [
      args.habitId,
      args.date,
      args.status ? 1 : 0,
      args.note ?? null
    ]
  );
}

export function getHabitLogForDate(habitId: string, date: string): HabitLogRow | null {
  return (
    db.getFirstSync<HabitLogRow>(
      `SELECT habit_id, date, status, note
       FROM habit_logs
       WHERE habit_id=? AND date=?;`,
      [habitId, date]
    ) ?? null
  );
}

export function clearHabitLogForDate(habitId: string, date: string) {
  db.runSync(`DELETE FROM habit_logs WHERE habit_id=? AND date=?;`, [habitId, date]);
}

export function clearHabitLogs(habitId: string) {
  db.runSync(`DELETE FROM habit_logs WHERE habit_id=?;`, [habitId]);
}

export function listHabitLogs(habitId: string): HabitLogRow[] {
  return db.getAllSync<HabitLogRow>(
    `
      SELECT habit_id, date, status, note
      FROM habit_logs
      WHERE habit_id=?
      ORDER BY date ASC;
    `,
    [habitId]
  );
}

export function listHabitLogsForHabits(habitIds: string[]): HabitLogRow[] {
  if (habitIds.length === 0) return [];
  const placeholders = habitIds.map(() => '?').join(', ');
  return db.getAllSync<HabitLogRow>(
    `SELECT habit_id, date, status, note
     FROM habit_logs
     WHERE habit_id IN (${placeholders})
     ORDER BY habit_id, date;`,
    habitIds
  );
}
