import { addHabit } from "@/db/habits";
import { Picker } from "@react-native-picker/picker";
import React, { useState } from "react";
import {
  Alert,
  Keyboard,
  Pressable,
  Text,
  TextInput,
  View
} from "react-native";

type Habit = {
  name: string;
  type: "good" | "bad";
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
  const [habit, setHabit] = useState<Habit | null>(null);

  function submit() {
    const trimmed = habit?.name.trim();
    if (!trimmed) {
      Alert.alert("Missing name", "Please enter a habit name.");
      return;
    }

    addHabit(trimmed, habit?.type ?? "good");

    Keyboard.dismiss();
    setHabit({ name: "", type: "good" });
    Alert.alert("Added", `Saved "${trimmed}" as a ${habit?.type} habit.`);
  }


  return (
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
      Type
    </Text>
    <View
      style={{
        marginTop: 8,
        borderWidth: 1,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <Picker
        selectedValue={habit?.type}
        onValueChange={(v) =>setHabit(habit => ({ ...habit!, type: v }))}
      >
        <Picker.Item label="Bad habit (want to reduce)" value="bad" />
        <Picker.Item label="Good habit (want to maintain)" value="good" />
      </Picker>
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
  </View>
  );
}