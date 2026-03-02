import { randomUUID } from "expo-crypto";
import { db } from "./db";

export type RewardLogRow = {
    id: string;
    reward_id: string;
    habit_id: string | null;
    date_received: string;          // YYYY-MM-DD (when granted)
    date_redeemed: string | null;  // YYYY-MM-DD (when user redeems, null if not redeemed yet)
    quantity: number;
    used: 0 | 1;                   // 0=not redeemed, 1=redeemed
};

export const listUnusedRewardLogs = (): RewardLogRow[] => {
    return db.getAllSync<RewardLogRow>(
        `
        SELECT id, reward_id, habit_id, date_received, date_redeemed, quantity, used
        FROM reward_logs
        WHERE used = 0
        ORDER BY date_received DESC;
        `
    );
}

export const addRewardLog = (rewardId: string, habitId: string, quantity: number): RewardLogRow => {

    const now = new Date().toISOString().split('T')[0];
    // 1) find an existing active log for this reward
    const existing = db.getFirstSync(
        `SELECT id, reward_id, habit_id, date_received, date_redeemed, quantity, used
     FROM reward_logs
     WHERE reward_id = ? AND used = 0
     LIMIT 1;`,
        [rewardId]
    ) as RewardLogRow | undefined;

    if (existing?.id) {
        // 2) update existing: add quantity, set used back to 0, clear redeemed date
        db.runSync(
            `UPDATE reward_logs
           SET quantity = quantity + ?,
               used = 0,
               date_redeemed = NULL
           WHERE id = ?;`,
            [quantity, existing.id]
        );

        return { ...existing, quantity: existing.quantity + quantity, used: 0, date_redeemed: null };
    }

    // 3) create new log if no existing active log found
    const id = randomUUID();
    db.runSync(
        `INSERT INTO reward_logs (id, reward_id, habit_id, date_received, quantity, used) VALUES (?, ?, ?, ?, ?, 0);`,
        [id, rewardId, habitId, now, quantity,]
    );

    return { id, reward_id: rewardId, habit_id: habitId, date_received: now, date_redeemed: null, quantity, used: 0 };
}

export const clearRewardLogForDate = (habitId: string, date: string) => {
    db.runSync(`DELETE FROM reward_logs WHERE habit_id=? AND date_received=?;`, [habitId, date]);
}

export const clearRewardLogsForHabit = (habitId: string) => {
    db.runSync(`DELETE FROM reward_logs WHERE habit_id=?;`, [habitId]);
}

export const redeemRewardLog = (rewardLogId: string) => {
    const now = new Date().toISOString().split('T')[0];
    db.runSync(
        `UPDATE reward_logs SET used=1, quantity=0, date_redeemed=? WHERE id=?;`,
        [now, rewardLogId]
    );
}

export const redeemPartialRewardLog = (rewardLogId: string, quantity: number) => {
    console.log("Redeeming partial reward log id: ", rewardLogId, " with quantity: ", quantity)
    const now = new Date().toISOString().split('T')[0];

    const rowBeforeRedeem = db.getFirstSync(
        `SELECT id, quantity, date_redeemed FROM reward_logs WHERE id = ?;`,
        [rewardLogId]
    );

    console.log("Before UPDATE row:", rowBeforeRedeem);

    const res = db.runSync(
        `UPDATE reward_logs
     SET quantity = quantity - ?, date_redeemed = ?
     WHERE id = ?;`,
        [quantity, now, rewardLogId]
    );

    console.log("UPDATE changes:", res?.changes); // should be 1

    const row = db.getFirstSync(
        `SELECT id, quantity, date_redeemed FROM reward_logs WHERE id = ?;`,
        [rewardLogId]
    );

    console.log("After UPDATE row:", row);
}
