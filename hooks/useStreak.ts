import { listHabitLogs } from "@/db/habitLogs";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";

function dateKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function parseDateKey(k: string) {
    const [y, m, d] = k.split("-").map(Number);
    return new Date(y, m - 1, d);
}

function addDays(d: Date, n: number) {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + n);
    return copy;
}

export function calcStreaksForHabit(logByDate: Record<string, boolean> | undefined) {
    if (!logByDate || Object.keys(logByDate).length === 0) {
        return { current: 0, best: 0 };
    }

    const keys = Object.keys(logByDate).sort(); // ascending YYYY-MM-DD

    // Best streak across all time (consecutive TRUE days)
    let best = 0;
    let run = 0;
    let prev: Date | null = null;

    for (const k of keys) {
        const success = logByDate[k];
        const dt = parseDateKey(k);

        if (success) {
            if (!prev) run = 1;
            else {
                const expected = addDays(prev, 1).toDateString();
                run = dt.toDateString() === expected ? run + 1 : 1;
            }
            best = Math.max(best, run);
        } else {
            run = 0;
        }

        prev = dt;
    }

    // Current streak ending today (consecutive TRUE backwards from today)
    // Current streak (count consecutive TRUE days up to the latest "eligible" day)
    let current = 0;

    const today = dateKey(new Date());

    // Decide where to start counting:
    let cursor: Date;
    if (logByDate[today] === true) {
        cursor = new Date(); // start at today
    } else if (logByDate[today] === false) {
        // explicitly failed today
        return { current: 0, best };
    } else {
        // no log today → start from yesterday
        cursor = addDays(new Date(), -1);
    }

    // Count backwards while days are TRUE
    while (true) {
        const k = dateKey(cursor);
        if (logByDate[k] === true) {
            current += 1;
            cursor = addDays(cursor, -1);
        } else {
            break;
        }
    }

    return { current, best };
}

type UseStreakResult = {
    current: number;
    best: number;
    loading: boolean;
    error: string | null;
    refetch: () => void;
};

export function useStreak(habitId: string | undefined): UseStreakResult {
    const [logByDate, setLogByDate] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchLogs = useCallback(() => {
        if (!habitId) return;

        try {
            setLoading(true);
            setError(null);

            // expo-sqlite sync API
            const rows = listHabitLogs(habitId);
            const map: Record<string, boolean> = {};
            for (const r of rows) {
                map[r.date] = r.status === 1;
            }

            setLogByDate(map);
        } catch (e: any) {
            setError(e?.message ?? "Failed to load streak logs");
        } finally {
            setLoading(false);
        }
    }, [habitId]);

    // Re-fetch when screen focuses (works great for modal -> back)
    useFocusEffect(
        useCallback(() => {
            fetchLogs();
        }, [fetchLogs])
    );

    const streaks = useMemo(() => calcStreaksForHabit(logByDate), [logByDate]);

    return {
        ...streaks,
        loading,
        error,
        refetch: fetchLogs,
    };
}