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
        `INSERT INTO rewards (id, name, habit_id, type, quantity, description, requirements, created_at, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1);`,
        [id, name.trim(), habitId, type, quantity, description, requirements, now]
    );

    return { id, name: name.trim(), habit_id: habitId, type, quantity, description, requirements, enabled: 1 };
}

export function listRewardsForHabit(habitId: string): RewardRow[] {
    return db.getAllSync<RewardRow>(
        `
      SELECT id, name, habit_id, type, quantity, description, requirements, created_at
      FROM rewards
      WHERE habit_id = ? ;
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
      SELECT id, name, habit_id, type,quantity,description, requirements, created_at
      FROM rewards
      WHERE habit_id IN (${placeholders});
      `,
        habitIds
    );
}

export function deleteReward(rewardId: string) {
    db.runSync(`DELETE FROM rewards WHERE id = ?;`, [rewardId]);
}

export function getRewardById(rewardId: string): RewardRow | null {
    return (
        db.getFirstSync<RewardRow>(
            `SELECT id, name, habit_id, type, quantity, description, requirements, created_at FROM rewards WHERE id=?;`,
            [rewardId]
        ) ?? null
    );
}