import * as SQLite from "expo-sqlite";

// Creates/opens a persistent on-device DB file
export const db = SQLite.openDatabaseSync("habits_v_1.db");

const SCHEMA_VERSION_KEY = "schema_version";
const CURRENT_SCHEMA_VERSION = 2;

export function getSchemaVersion(): number {
    const v = metaGet(SCHEMA_VERSION_KEY);
    return v ? parseInt(v, 10) : 0;
}

export function setSchemaVersion(v: number) {
    metaSet(SCHEMA_VERSION_KEY, String(v));
}

/**
 * Run once on app start.
 * - Enables foreign keys
 * - Creates tables
 */
export function initDb() {
    // Foreign keys are off by default in SQLite unless enabled per connection
    db.execSync(`PRAGMA foreign_keys = ON;`);

    db.execSync(`
    CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );`);

    // Create tables if they don't exist
    // Habits table
    db.execSync(`
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,  -- 1=good habit, 0=bad habit
      created_at TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0,
      priority INTEGER NOT NULL DEFAULT 0
    );
  `);

    db.execSync(`
    CREATE TABLE IF NOT EXISTS rewards (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      habit_id TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      requirements INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1
    );
  `);
    // Resolutions table
    //     db.execSync(`
    //     CREATE TABLE IF NOT EXISTS resolutions (
    //       id TEXT PRIMARY KEY NOT NULL,
    //       name TEXT NOT NULL,
    //       type TEXT NOT NULL,  -- 1=good habit, 0=bad habit
    //       created_at TEXT NOT NULL,
    //       archived INTEGER NOT NULL DEFAULT 0
    //     );
    //   `);

    db.execSync(`
    CREATE TABLE IF NOT EXISTS habit_logs (
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,              -- YYYY-MM-DD
      status INTEGER NOT NULL,         -- 1=success, 0=slip
      note TEXT,                       -- optional
      PRIMARY KEY (habit_id, date),
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE
    );
  `);

    db.execSync(`
    CREATE TABLE IF NOT EXISTS reward_logs (
        id TEXT PRIMARY KEY NOT NULL,
        reward_id TEXT NOT NULL,
        habit_id TEXT,
        date_received TEXT NOT NULL,          -- YYYY-MM-DD (when granted)
        date_redeemed TEXT,                    -- YYYY-MM-DD (when user redeems, null if not redeemed yet)
        used INTEGER NOT NULL DEFAULT 0,             -- 0=not redeemed, 1=redeemed 
        quantity INTEGER NOT NULL DEFAULT 1,
        UNIQUE (reward_id, date_received),    -- prevents duplicates for same day
        FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE,
        FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE SET NULL
    );
  `);

    // Helpful indexes for performance
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(date);`);
    db.execSync(`CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON habit_logs(habit_id);`);

    const schemaVersion = getSchemaVersion();
    if (schemaVersion > 0 && schemaVersion < 2) {
        migrateToV2();
    }

    setSchemaVersion(CURRENT_SCHEMA_VERSION);
}

function migrateToV2() {
    db.execSync(`PRAGMA foreign_keys = OFF;`);
    db.execSync(`BEGIN TRANSACTION;`);
    try {
        db.execSync(`
      CREATE TABLE IF NOT EXISTS reward_logs_v2 (
          id TEXT PRIMARY KEY NOT NULL,
          reward_id TEXT NOT NULL,
          habit_id TEXT,
          date_received TEXT NOT NULL,
          date_redeemed TEXT,
          used INTEGER NOT NULL DEFAULT 0,
          quantity INTEGER NOT NULL DEFAULT 1,
          UNIQUE (reward_id, date_received),
          FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE,
          FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE SET NULL
      );
    `);

        db.execSync(`
      INSERT INTO reward_logs_v2 (id, reward_id, habit_id, date_received, date_redeemed, used, quantity)
      SELECT id, reward_id, habit_id, date_received, date_redeemed, used, quantity
      FROM reward_logs;
    `);

        db.execSync(`DROP TABLE reward_logs;`);
        db.execSync(`ALTER TABLE reward_logs_v2 RENAME TO reward_logs;`);
        db.execSync(`COMMIT;`);
    } catch (error) {
        db.execSync(`ROLLBACK;`);
        throw error;
    } finally {
        db.execSync(`PRAGMA foreign_keys = ON;`);
    }
}

// For testing purposes, drops all tables and recreates them with seed data
export function resetDb() {
    db.execSync(`DROP TABLE IF EXISTS habits;`);
    db.execSync(`DROP TABLE IF EXISTS rewards;`);
    db.execSync(`DROP TABLE IF EXISTS habit_logs;`);
    db.execSync(`DROP TABLE IF EXISTS reward_logs;`);
    // db.execSync(`DROP TABLE IF EXISTS resolutions;`);
    initDb();
    seedDb();
}

function seedDb() {
    const now = new Date().toISOString();

    // ---- HABITS ----
    db.execSync(`
      INSERT INTO habits (id, name, type, created_at, archived, priority) VALUES
      ('h1', 'Morning Run', 'good', '${now}', 0, 1),
      ('h2', 'Read 20 Pages', 'good', '${now}', 0, 2),
      ('h3', 'No Sugar', 'bad', '${now}', 0, 3),
      ('h4', 'No Pokemon Purchase(without credits)', 'bad', '${now}', 0, 4);
    `);

    // ---- REWARDS ----
    db.execSync(`
      INSERT INTO rewards (id, name, habit_id, type, quantity, description, requirements, created_at) VALUES
      ('r1', 'Buy New Shoes', 'h1', 'recurring', 1, 'Reward after 7 runs', 7, '${now}'),
      ('r2', 'Movie Night', 'h2', 'recurring', 1, 'After 5 reading days', 5, '${now}'),
      ('r3', 'Cheat Snack', 'h3', 'recurring', 1, 'Allowed after 3 sugar-free days', 3, '${now}'),
      ('r4', 'Pokemon Card Credits', 'h4', 'recurring', 50, 'Reward after 10 days without pokemon purchase', 10, '${now}');
    `);

    // ---- HABIT LOGS ----
    db.execSync(`
      INSERT INTO habit_logs (habit_id, date, status, note) VALUES
      ('h1', '2026-02-01', 1, 'Felt great'),
      ('h1', '2026-02-02', 1, 'Light jog'),

      ('h2', '2026-02-01', 1, 'Read 25 pages'),
      ('h2', '2026-02-02', 1, 'Too tired'),
      ('h2', '2026-02-03', 1, 'Too tired'),
      ('h2', '2026-02-04', 1, 'Too tired'),

      ('h3', '2026-02-01', 1, 'No sugar today'),
      ('h3', '2026-02-02', 1, 'Still clean'),

      ('h4', '2026-02-01', 1, 'No pokemon purchase'),
      ('h4', '2026-02-02', 1, 'No pokemon purchase'),
      ('h4', '2026-02-03', 1, 'No pokemon purchase'),
      ('h4', '2026-02-04', 1, 'No pokemon purchase'),
      ('h4', '2026-02-05', 1, 'No pokemon purchase'),
      ('h4', '2026-02-06', 1, 'No pokemon purchase'),
      ('h4', '2026-02-07', 1, 'No pokemon purchase'),
      ('h4', '2026-02-08', 1, 'No pokemon purchase'),
      ('h4', '2026-02-09', 1, 'No pokemon purchase'),
      ('h4', '2026-02-10', 1, 'No pokemon purchase');
    `);

    // ---- REWARD LOGS ----
    db.execSync(`
      INSERT INTO reward_logs (id, reward_id, habit_id, date_received, date_redeemed, quantity,used) VALUES
      ('rl1', 'r1', 'h1', '2026-02-08', NULL, 1, 0),
      ('rl2', 'r2', 'h2', '2026-02-06', '2026-02-07', 1, 1),
      ('rl3', 'r3', 'h3', '2026-02-04', NULL, 1, 0),
      ('rl4', 'r4', 'h4', '2026-02-10', NULL, 15, 0);
    `);
}

export function metaGet(key: string): string | null {
    const row = db.getFirstSync(
        `SELECT value FROM meta WHERE key = ?;`,
        [key]
    ) as { value: string } | undefined;

    return row?.value ?? null;
}

export function metaSet(key: string, value: string) {
    // UPSERT (SQLite >= 3.24)
    db.runSync(
        `INSERT INTO meta (key, value)
       VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
        [key, value]
    );
}
