import { Colors } from "@/constants/theme";
import { addHabit } from "@/db/habits";
import { RewardRow } from "@/db/rewards";
import { randomUUID } from "expo-crypto";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Keyboard,
  Pressable,
  Text,
  TextInput,
  View
} from "react-native";
import ModalScreen from "../components/ui/modal";

export type AddHabit = {
  name: string;
  type: "good" | "bad";
  priority?: number;
};

type HabitLogs = Record<string, Record<string, boolean>>;
// logs[habitId][dateKey] = true (success) | false (slip)

const STORAGE_KEY = "habit_logs_multi_v1";

export default function AddHabit() {
  const [habit, setHabit] = useState<AddHabit>({ name: "", type: "good" });
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const router = useRouter();

  function submit() {
    const trimmed = habit?.name.trim();
    if (!trimmed) {
      Alert.alert("Missing name", "Please enter a habit name.");
      return;
    }

    if (habit) {
      addHabit(habit, rewards);
    }



    Keyboard.dismiss();
    setHabit({ name: "", type: "good" });
    Alert.alert("Added", `Saved "${trimmed}" as a ${habit?.type} habit.`);
    router.back();
  }

  const addReward = () => {
    setRewards((prev) => [
      ...prev,
      {
        id: randomUUID(),
        name: "",
        type: "one-time",
        quantity: 1,
        requirements: 1,
        description: "",
        enabled: 1,
        habit_id: "", // will be set when saving to DB
      },
    ]);
  }

  const removeReward = (id: string) => {
    setRewards((prev) => prev.filter(r => r.id !== id));
  }

  const updateReward = (id: string, updates: Partial<RewardRow>) => {
    setRewards((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  }


  return (

    <ModalScreen name="Add a Habit">
      <View style={{ flex: 1, padding: 16, backgroundColor: Colors.grey[500] }}>
        <Text style={{ marginTop: 16, fontWeight: "600", color: Colors.yellow[100] }}>
          Habit name
        </Text>
        <TextInput
          value={habit?.name}
          onChangeText={(text => setHabit(habit => ({ ...habit!, name: text })))}
          placeholder="e.g., No doomscrolling"
          placeholderTextColor={Colors.grey[200]}
          style={{
            marginTop: 8,
            borderWidth: 1,
            borderRadius: 12,
            borderColor: Colors.yellow[100],
            padding: 12,
            color: Colors.yellow[100],
          }}
        />

        <Text style={{ marginTop: 16, fontWeight: "600", color: Colors.yellow[100] }}>
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
          placeholderTextColor={Colors.grey[200]}
          style={{
            marginTop: 8,
            borderWidth: 1,
            borderRadius: 12,
            borderColor: Colors.yellow[100],
            padding: 12,
            color: Colors.yellow[100],
          }}
        />

        {/* <Text style={{ marginTop: 16, fontWeight: "600", color: "#000" }}>
          Type
        </Text> */}

        {/* <View
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
        </View> */}

        <View style={{ marginTop: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.yellow[100] }}>Rewards</Text>

            <Pressable onPress={addReward} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ fontSize: 18, color: Colors.yellow[100] }}>＋</Text>
            </Pressable>
          </View>

          {rewards.length === 0 ? (
            <Text style={{ marginTop: 8, color: Colors.grey[200] }}>
              No rewards yet. Tap ＋ to add one.
            </Text>
          ) : (
            rewards.map((r, index) => (
              <View
                key={r.id}
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderRadius: 12,
                  borderColor: 'green',
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontWeight: "700", color: Colors.yellow[100] }}>[ {index + 1} ]</Text>

                  <Pressable onPress={() => removeReward(r.id)} hitSlop={10}>
                    <Text style={{ fontSize: 16, color: Colors.yellow[100] }}>✕</Text>
                  </Pressable>
                </View>

                <Text style={{ marginTop: 10, color: Colors.yellow[100] }}>Name</Text>
                <TextInput
                  value={r.name}
                  onChangeText={(t) => updateReward(r.id, { name: t })}
                  placeholder="e.g. Buy a Lego set"
                  placeholderTextColor={Colors.grey[200]}
                  style={{ borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 6, borderColor: Colors.yellow[100], color: Colors.yellow[100] }}
                />

                <Text style={{ marginTop: 10, color: Colors.yellow[100] }}>Description (optional)</Text>
                <TextInput
                  value={r.description}
                  onChangeText={(t) => updateReward(r.id, { description: t })}
                  placeholder="Why this reward matters to you"
                  placeholderTextColor={Colors.grey[200]}
                  style={{ borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 6, borderColor: Colors.yellow[100], color: Colors.yellow[100] }}
                />

                <Text style={{ marginTop: 10, color: Colors.yellow[100] }}>Type</Text>
                <View style={{ flexDirection: "row", marginTop: 6, gap: 8 }}>
                  {(["one-time", "recurring"] as const).map((type) => {
                    const isSelected = r.type === type;

                    return (
                      <Pressable
                        key={type}
                        onPress={() =>
                          updateReward(r.id, { type })
                        }
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          borderRadius: 10,
                          borderWidth: 0,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isSelected ? Colors.yellow[100] : Colors.grey[200],
                        }}
                      >
                        <Text
                          style={{
                            color: isSelected ? Colors.grey[400] : Colors.grey[50],
                            fontWeight: "600",
                          }}
                        >
                          {{ "one-time": "One-time", recurring: "Recurring" }[type]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>


                <Text style={{ marginTop: 10, color: Colors.yellow[100] }}>Requirements</Text>
                <TextInput
                  value={String(r.requirements)}
                  onChangeText={(t) =>
                    updateReward(r.id, { requirements: Number(t.replace(/[^0-9]/g, "")) || 0 })
                  }
                  keyboardType="number-pad"
                  placeholder="e.g. 7"
                  placeholderTextColor={Colors.grey[200]}
                  style={{ borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 6, borderColor: Colors.yellow[100], color: Colors.yellow[100] }}
                />

                <Text style={{ marginTop: 10, color: Colors.yellow[100] }}>Reward Quantity</Text>
                <TextInput
                  value={String(r.quantity)}
                  onChangeText={(t) =>
                    updateReward(r.id, { quantity: Number(t.replace(/[^0-9]/g, "")) || 0 })
                  }
                  keyboardType="number-pad"
                  placeholder="e.g. 7"
                  placeholderTextColor={Colors.grey[200]}
                  style={{ borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 6, borderColor: Colors.yellow[100], color: Colors.yellow[100] }}
                />
              </View>
            ))
          )}
        </View>
        <Pressable
          onPress={submit}
          style={{
            marginTop: 20,
            padding: 14,
            borderRadius: 12,
            borderWidth: 0,
            alignItems: "center",
            backgroundColor: Colors.yellow[100],

          }}
        >
          <Text style={{ fontWeight: "700", color: Colors.grey[500], }}>Add Habit</Text>
        </Pressable>
      </View>
    </ModalScreen>
  );
}