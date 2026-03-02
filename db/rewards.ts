import type { HabitLogRow } from "./habitLogs";
import type { HabitKind } from "./habits";
import { db } from "./db";

export type RewardType = "one-time" | "recurring";

export type RewardRow = {
    id: string;
    name: string;
    habit_id: string;
    type: RewardType;
    quantity: number;
    requirements: number;
    description: string;
    enabled: 0 | 1;
    created_at?: string;
    valid_from?: string;
}

export function addReward(reward: RewardRow, habitId: string): RewardRow {
    const name = reward.name;;
    const requirements = reward.requirements ?? 0;
    const description = reward.description ?? "";
    const type = reward.type;
    const quantity = reward.quantity ?? 1;

    const id = reward.id;
    const now = new Date().toISOString();

    db.runSync(
        `INSERT INTO rewards (id, name, habit_id, type, quantity, description, requirements, created_at, valid_from, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1);`,
        [id, name.trim(), habitId, type, quantity, description, requirements, now, now]
    );

    return { id, name: name.trim(), habit_id: habitId, type, quantity, description, requirements, enabled: 1, created_at: now, valid_from: now };
}

export function listRewardsForHabit(habitId: string): RewardRow[] {
    return db.getAllSync<RewardRow>(
        `
      SELECT id, name, habit_id, type, quantity, description, requirements, created_at, valid_from, enabled
      FROM rewards
      WHERE habit_id = ? and enabled = 1;
      `,
        [habitId]
    );
}

export function listRewardsForHabits(habitIds: string[]): RewardRow[] {
    if (habitIds.length === 0) {
        return [];
    }
    const placeholders = habitIds.map(() => '?').join(', ');
    return db.getAllSync<RewardRow>(
        `
      SELECT id, name, habit_id, type, quantity, description, requirements, created_at, valid_from, enabled
      FROM rewards
      WHERE habit_id IN (${placeholders}) and enabled = 1;
      `,
        habitIds
    );
}

export function updateRewardDetails(rewardId: string, updates: Pick<RewardRow, "name" | "description" | "requirements" | "quantity" | "type">) {
    db.runSync(
        `UPDATE rewards
         SET name = ?, description = ?, requirements = ?, quantity = ?, type = ?
         WHERE id = ?;`,
        [updates.name.trim(), updates.description ?? "", updates.requirements, updates.quantity, updates.type, rewardId]
    );
}

export function disableReward(rewardId: string) {
    db.runSync(`UPDATE rewards SET enabled=0 WHERE id = ?;`, [rewardId]);
}

export function removeReward(rewardId: string) {
    disableReward(rewardId);
}

export function getRewardById(rewardId: string): RewardRow | null {
    return (
        db.getFirstSync<RewardRow>(
            `SELECT id, name, habit_id, type, quantity, description, requirements, created_at, valid_from, enabled FROM rewards WHERE id=?;`,
            [rewardId]
        ) ?? null
    );
}

function dateKeyFromIso(value: string | undefined, fallback: string) {
    return value ? value.slice(0, 10) : fallback;
}

function addDays(date: Date, count: number) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + count);
    return copy;
}

function formatDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function calcRewardProgress(logs: HabitLogRow[], reward: RewardRow, kind: HabitKind, asOfDate: string): number {
    const activationDate = dateKeyFromIso(reward.valid_from ?? reward.created_at, asOfDate);
    const successfulLogs = logs.filter((log) => log.status === 1);

    if (kind === "task") {
        return successfulLogs.filter((log) => log.date >= activationDate).length;
    }

    const logByDate = Object.fromEntries(logs.map((log) => [log.date, log.status === 1]));
    let streak = 0;
    let cursor = new Date(`${asOfDate}T00:00:00`);

    while (true) {
        const currentDateKey = formatDateKey(cursor);
        if (currentDateKey < activationDate) {
            break;
        }
        if (logByDate[currentDateKey] === true) {
            streak += 1;
            cursor = addDays(cursor, -1);
            continue;
        }
        break;
    }

    return streak;
}
