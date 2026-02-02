import { addHabit } from "@/db/habits";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Button,
  Keyboard,
  Pressable,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type Habit = {
  name: string;
  type: "good" | "bad";
  priority?: number;
};

type HabitLogs = Record<string, Record<string, boolean>>;
// logs[habitId][dateKey] = true (success) | false (slip)

const STORAGE_KEY = "habit_logs_multi_v1";

// ✅ Pre-created habits (edit this list)

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

function calcStreaksForHabit(logByDate: Record<string, boolean> | undefined) {
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
  let current = 0;
  let cursor = new Date();
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

export default function App() {
  const today = dateKey();
  const [habit, setHabit] = useState<Habit>({ name: "", type: "good" });

  function submit() {
    const trimmed = habit?.name.trim();
    if (!trimmed) {
      Alert.alert("Missing name", "Please enter a habit name.");
      return;
    }

    if (habit) {
      addHabit(habit);
    }



    Keyboard.dismiss();
    setHabit({ name: "", type: "good" });
    Alert.alert("Added", `Saved "${trimmed}" as a ${habit?.type} habit.`);
  }


  return (
    <SafeAreaView style={{ flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, backgroundColor: "#fff" }}>
      <View style={{ flex: 1, padding: 16, backgroundColor: "#fff" }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#000" }}>
          Add a Habit
        </Text>

        <Text style={{ marginTop: 16, fontWeight: "600", color: "#000" }}>
          Habit name
        </Text>
        <TextInput
          value={habit?.name}
          onChangeText={(text => setHabit(habit => ({ ...habit!, name: text })))}
          placeholder="e.g., No doomscrolling"
          placeholderTextColor="#666"
          style={{
            marginTop: 8,
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            color: "#000",
          }}
        />

        <Text style={{ marginTop: 16, fontWeight: "600", color: "#000" }}>
          Priority (1–5)
        </Text>

        <TextInput
          value={habit?.priority?.toString() ?? ""}
          onChangeText={(text) => {
            // keep digits only
            const digits = text.replace(/[^0-9]/g, "");

            if (digits === "") {
              setHabit(h => ({ ...h!, priority: undefined }));
              return;
            }

            // clamp between 1 and 5
            let num = parseInt(digits, 10);
            if (num < 1) num = 1;
            if (num > 5) num = 5;

            setHabit(h => ({ ...h!, priority: num }));
          }}
          keyboardType="number-pad"
          maxLength={1} // only 1 digit needed
          placeholder="1 - 5"
          placeholderTextColor="#666"
          style={{
            marginTop: 8,
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            color: "#000",
          }}
        />

        <Text style={{ marginTop: 16, fontWeight: "600", color: "#000" }}>
          Type
        </Text>

        <View
          style={{
            flexDirection: "row",
            marginTop: 8,
            gap: 8,
          }}
        >
          {(["good", "bad"] as const).map((type) => {
            console.log(habit)
            const isSelected = habit?.type === type;

            return (
              <Pressable
                key={type}
                onPress={() =>
                  setHabit((h) => ({ ...h!, type }))
                }
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isSelected ? "#000" : "#fff",
                  borderColor: isSelected ? "#000" : "#ccc",
                }}
              >
                <Text
                  style={{
                    color: isSelected ? "#fff" : "#000",
                    fontWeight: "600",
                  }}
                >
                  {type === "good"
                    ? "Good"
                    : "Bad"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={submit}
          style={{
            marginTop: 20,
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            alignItems: "center",
          }}
        >
          <Text style={{ fontWeight: "700", color: "#000" }}>Add Habit</Text>
        </Pressable>
        <Button
          title="Open Modal"
          onPress={() => router.push("/modal")}
        />
      </View>
    </SafeAreaView>
  );
}