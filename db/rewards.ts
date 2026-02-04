import { db } from "./db";

export type Reward = {
    id: string;
    name: string;
    type: "one-time" | "recurring";
    requirements: number;
    description?: string;
};

export type RewardRow = {
    id: string;
    name: string;
    habit_id: string;
    type: "one-time" | "recurring";
    requirements: number;
    description: string;

}

export function addReward(reward:Reward, habitId: string): RewardRow {
    const name = reward.name;;
    const requirements = reward.requirements ?? 0;
    const description = reward.description ?? "";
    const type = reward.type;

    const id = reward.id;
    const now = new Date().toISOString();

    db.runSync(
        `INSERT INTO rewards (id, name, habit_id, type, description, requirements, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [id, name.trim(), habitId, type, description, requirements, now]
    );

    return { id, name: name.trim(), habit_id: habitId, type, description, requirements };
}

export function listRewardsForHabit(habitId: string): RewardRow[] {
    return db.getAllSync<RewardRow>(
        `
      SELECT id, name, habit_id, type, description, requirements, created_at
      FROM rewards
      WHERE habit_id = ?;
      `,
        [habitId]
    );
}

export function deleteReward(rewardId: string) {
    db.runSync(`DELETE FROM rewards WHERE id = ?;`, [rewardId]);
}