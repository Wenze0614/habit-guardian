import { File, Paths } from 'expo-file-system';
import * as Sharing from "expo-sharing";
import { db, getSchemaVersion } from "./db";

const TABLES_TO_EXPORT = ["meta", "habits", "habit_logs", "rewards", "reward_logs"] as const;

export async function exportBackup() {
    const schemaVersion = getSchemaVersion();

    const data: Record<string, any[]> = {};

    for (const table of TABLES_TO_EXPORT) {
        // If you have lots of rows, export in chunks later; for MVP this is fine.
        const rows = db.getAllSync(`SELECT * FROM ${table};`) as any[];
        data[table] = rows ?? [];
    }

    const payload = {
        schemaVersion,
        exportedAt: new Date().toISOString(),
        app: { name: "Habit Guardian" }, // optional
        data,
    };

    const jsonPayload = JSON.stringify(payload, null, 2);

    // filename like: habit-guardian-backup-v1-2026-02-11.json
    const date = new Date().toISOString().slice(0, 10);
    //const fileUri = `${Paths.document}habit-guardian-backup-v${schemaVersion}-${date}.json`;
    const file = new File(Paths.document, 'habit-backup.json');
    await file.write(jsonPayload);

    // Share sheet → user can save to Files / iCloud Drive / AirDrop etc.
    await Sharing.shareAsync(file.uri);

    return file.uri;
}