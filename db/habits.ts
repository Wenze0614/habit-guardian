import { Habit } from "@/app/addHabit";
import * as crypto from "expo-crypto";
import { db } from "./db";
import { addReward, Reward } from "./rewards";

export type HabitRow = {
    id: string;
    name: string;
    type: "good" | "bad";
    created_at: string;
    archived: 0 | 1;
    priority: number;
};

export function listGoodHabits() {
    return db.getAllSync<{
        id: string;
        name: string;
        type: "good" | "bad";
        created_at: string;
        archived: 0 | 1;
        priority: number;
    }>(
        `
      SELECT id, name, type, created_at, archived, priority
      FROM habits
      WHERE type = 'good' AND archived = 0
      ORDER BY priority DESC;
      `
    );
    // return db.getAllSync<{
    //           id: string;
    //   name: string;
    //   type: "good" | "bad";
    //   created_at: string;
    //   archived: 0 | 1;
    // }>(`SELECT id, name, type, archived, created_at FROM habits ORDER BY created_at DESC;`);
}

export function listBadHabits() {
    return db.getAllSync<{
        id: string;
        name: string;
        type: "good" | "bad";
        created_at: string;
        archived: 0 | 1;
        priority: number;
    }>(
        `
      SELECT id, name, type, created_at, archived, priority
      FROM habits
      WHERE type = 'bad' AND archived = 0
      ORDER BY priority DESC;
      `
    );
}

export function listHabits(includeArchived = false): HabitRow[] {
    if (includeArchived) {
        return db.getAllSync<HabitRow>(
            `SELECT id, name, created_at, archived, priority FROM habits ORDER BY created_at DESC;`
        );
    }
    return db.getAllSync<HabitRow>(
        `SELECT id, name, created_at, archived, priority FROM habits WHERE archived=0 ORDER BY created_at DESC;`
    );
}

export function addHabit(habit: Habit, rewards?: Reward[]): HabitRow {
    const name = habit.name;;
    const type = habit.type;
    const priority = habit.priority ?? 0;


    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.runSync(
        `INSERT INTO habits (id, name, type, created_at,priority,archived) VALUES (?, ?, ?, ?, ?, 0);`,
        [id, name.trim(), type, now, priority]
    );

    if (rewards && rewards.length > 0) {
        rewards.forEach((reward) => {
            addReward(reward, id);
        });
    }

    return { id, name: name.trim(), type, created_at: now, archived: 0, priority };
}

export function archiveHabit(habitId: string, archived: boolean) {
    db.runSync(`UPDATE habits SET archived=? WHERE id=?;`, [archived ? 1 : 0, habitId]);
}

export function deleteHabit(habitId: string) {
    db.runSync(`DELETE FROM habits WHERE id=?;`, [habitId]);
}