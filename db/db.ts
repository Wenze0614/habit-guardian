import * as SQLite from "expo-sqlite";

// Creates/opens a persistent on-device DB file
export const db = SQLite.openDatabaseSync("habits.db");

/**
 * Run once on app start.
 * - Enables foreign keys
 * - Creates tables
 */
export function initDb() {
  // Foreign keys are off by default in SQLite unless enabled per connection
  db.execSync(`PRAGMA foreign_keys = ON;`);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,  -- 1=good habit, 0=bad habit
      created_at TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS habit_logs (
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,              -- YYYY-MM-DD
      status INTEGER NOT NULL,         -- 1=success, 0=slip
      note TEXT,                       -- optional
      created_at TEXT NOT NULL,
      PRIMARY KEY (habit_id, date),
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    );
  `);

  // Helpful indexes for performance
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(date);`);
  db.execSync(`CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON habit_logs(habit_id);`);
}