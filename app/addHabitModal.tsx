import { Colors, Radii, Shadows, Spacing } from "@/constants/theme";
import { addHabit } from "@/db/habits";
import { RewardRow } from "@/db/rewards";
import { randomUUID } from "expo-crypto";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
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

  const inputStyle = styles.input;


  return (

    <ModalScreen name="Add a Habit">
      <View style={styles.container}>
        <Text style={styles.label}>
          Habit name
        </Text>
        <TextInput
          value={habit?.name}
          onChangeText={(text => setHabit(habit => ({ ...habit!, name: text })))}
          placeholder="e.g., No doomscrolling"
          placeholderTextColor={Colors.ui.textMuted}
          style={inputStyle}
        />

        <Text style={styles.label}>
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
          placeholderTextColor={Colors.ui.textMuted}
          style={inputStyle}
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

        <View style={{ marginTop: Spacing.xl }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Rewards</Text>

            <Pressable onPress={addReward} style={styles.pillButton}>
              <Text style={styles.pillButtonText}>＋</Text>
            </Pressable>
          </View>

          {rewards.length === 0 ? (
            <Text style={styles.emptyHint}>
              No rewards yet. Tap ＋ to add one.
            </Text>
          ) : (
            rewards.map((r, index) => (
              <View
                key={r.id}
                style={styles.rewardCard}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={styles.cardIndex}>[ {index + 1} ]</Text>

                  <Pressable onPress={() => removeReward(r.id)} hitSlop={10}>
                    <Text style={styles.removeText}>✕</Text>
                  </Pressable>
                </View>

                <Text style={styles.subLabel}>Name</Text>
                <TextInput
                  value={r.name}
                  onChangeText={(t) => updateReward(r.id, { name: t })}
                  placeholder="e.g. Buy a Lego set"
                  placeholderTextColor={Colors.ui.textMuted}
                  style={styles.smallInput}
                />

                <Text style={styles.subLabel}>Description (optional)</Text>
                <TextInput
                  value={r.description}
                  onChangeText={(t) => updateReward(r.id, { description: t })}
                  placeholder="Why this reward matters to you"
                  placeholderTextColor={Colors.ui.textMuted}
                  style={styles.smallInput}
                />

                <Text style={styles.subLabel}>Type</Text>
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
                          borderRadius: Radii.sm,
                          borderWidth: 0,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isSelected ? Colors.ui.accent : Colors.ui.surfaceSoft,
                        }}
                      >
                        <Text
                          style={{
                            color: isSelected ? Colors.ui.background : Colors.ui.textSecondary,
                            fontWeight: "600",
                          }}
                        >
                          {{ "one-time": "One-time", recurring: "Recurring" }[type]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>


                <Text style={styles.subLabel}>Requirements</Text>
                <TextInput
                  value={String(r.requirements)}
                  onChangeText={(t) =>
                    updateReward(r.id, { requirements: Number(t.replace(/[^0-9]/g, "")) || 0 })
                  }
                  keyboardType="number-pad"
                  placeholder="e.g. 7"
                  placeholderTextColor={Colors.ui.textMuted}
                  style={styles.smallInput}
                />

                <Text style={styles.subLabel}>Reward Quantity</Text>
                <TextInput
                  value={String(r.quantity)}
                  onChangeText={(t) =>
                    updateReward(r.id, { quantity: Number(t.replace(/[^0-9]/g, "")) || 0 })
                  }
                  keyboardType="number-pad"
                  placeholder="e.g. 7"
                  placeholderTextColor={Colors.ui.textMuted}
                  style={styles.smallInput}
                />
              </View>
            ))
          )}
        </View>
        <Pressable
          onPress={submit}
          style={styles.submitButton}
        >
          <Text style={styles.submitButtonText}>Add Habit</Text>
        </Pressable>
      </View>
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.lg,
    backgroundColor: Colors.ui.background,
  },
  label: {
    marginTop: Spacing.md,
    fontWeight: "700",
    fontSize: 14,
    color: Colors.ui.textPrimary,
  },
  input: {
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radii.md,
    borderColor: Colors.ui.border,
    backgroundColor: Colors.ui.surface,
    padding: 12,
    color: Colors.ui.textPrimary,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.ui.textPrimary,
  },
  pillButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.ui.surfaceSoft,
    borderWidth: 1,
    borderColor: Colors.ui.border,
  },
  pillButtonText: {
    fontSize: 18,
    color: Colors.ui.accent,
    fontWeight: "700",
  },
  emptyHint: {
    marginTop: Spacing.sm,
    color: Colors.ui.textSecondary,
  },
  rewardCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radii.lg,
    borderColor: Colors.ui.border,
    backgroundColor: Colors.ui.surface,
    ...Shadows.card,
  },
  cardIndex: {
    fontWeight: "700",
    color: Colors.ui.textPrimary,
  },
  removeText: {
    fontSize: 16,
    color: Colors.ui.textSecondary,
  },
  subLabel: {
    marginTop: Spacing.sm,
    color: Colors.ui.textSecondary,
    fontWeight: "600",
  },
  smallInput: {
    borderWidth: 1,
    borderRadius: Radii.sm,
    padding: 10,
    marginTop: 6,
    borderColor: Colors.ui.border,
    color: Colors.ui.textPrimary,
    backgroundColor: Colors.ui.background,
  },
  submitButton: {
    marginTop: Spacing.xl,
    padding: 14,
    borderRadius: Radii.md,
    alignItems: "center",
    backgroundColor: Colors.ui.accent,
    ...Shadows.glow,
  },
  submitButtonText: {
    fontWeight: "800",
    color: Colors.ui.background,
  },
});
