import { Colors, Radii, Shadows, Spacing } from "@/constants/theme";
import { HabitLogRow, getHabitLogForDate, listHabitLogs } from "@/db/habitLogs";
import { getHabitById } from "@/db/habits";
import {
    RewardRow,
    addReward,
    calcRewardProgress,
    listRewardsForHabit,
    removeReward,
    updateRewardDetails,
} from "@/db/rewards";
import { useStreak } from "@/hooks/useStreak";
import { randomUUID } from "expo-crypto";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";
import ModalScreen from "../components/ui/modal";
import { Habit } from "./(tabs)/habits";

export default function HabitScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [habit, setHabit] = useState<Habit>();
    const [rewardDrafts, setRewardDrafts] = useState<RewardRow[]>([]);
    const [savedRewardsById, setSavedRewardsById] = useState<Record<string, RewardRow>>({});
    const [logs, setLogs] = useState<HabitLogRow[]>([]);
    const { current, best } = useStreak(id);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [])
    );

    function load() {
        const habitRow = getHabitById(id);
        const todayLog = getHabitLogForDate(id, new Date().toISOString().split("T")[0]);
        const allLogs = listHabitLogs(id);
        const isTaskComplete = allLogs.some((log) => log.status === 1);
        const rewards = listRewardsForHabit(id);

        setLogs(allLogs);
        setRewardDrafts(rewards);
        setSavedRewardsById(
            Object.fromEntries(rewards.map((reward) => [reward.id, reward]))
        );
        setHabit({
            id: habitRow?.id ?? "",
            name: habitRow?.name ?? "",
            type: habitRow?.type ?? "habit",
            isLoggedToday: todayLog ? todayLog.status === 1 : false,
            rewards,
            isComplete: habitRow?.type === "task" ? isTaskComplete : undefined,
            currentStreak: habitRow?.type === "task" ? (isTaskComplete ? 1 : 0) : current,
            bestStreak: habitRow?.type === "task" ? (isTaskComplete ? 1 : 0) : best,
        });
    }

    const updateRewardDraft = (rewardId: string, updates: Partial<RewardRow>) => {
        setRewardDrafts((prev) => prev.map((reward) => (
            reward.id === rewardId ? { ...reward, ...updates } : reward
        )));
    };

    const addRewardDraft = () => {
        if (!habit) return;
        setRewardDrafts((prev) => [
            ...prev,
            {
                id: randomUUID(),
                name: "",
                type: habit.type === "task" ? "one-time" : "one-time",
                quantity: 1,
                requirements: habit.type === "task" ? 1 : 1,
                description: "",
                enabled: 1,
                habit_id: habit.id,
            },
        ]);
    };

    const hasRewardChanged = (reward: RewardRow) => {
        if (!reward.created_at) {
            return true;
        }

        const savedReward = savedRewardsById[reward.id];
        if (!savedReward) {
            return true;
        }

        return (
            reward.name.trim() !== savedReward.name.trim() ||
            (reward.description ?? "") !== (savedReward.description ?? "") ||
            reward.requirements !== savedReward.requirements ||
            reward.quantity !== savedReward.quantity ||
            reward.type !== savedReward.type
        );
    };

    const saveReward = (reward: RewardRow) => {
        if (!habit) return;
        const name = reward.name.trim();
        if (!name) return;

        if (reward.created_at) {
            updateRewardDetails(reward.id, {
                name,
                description: reward.description ?? "",
                requirements: habit.type === "task" ? 1 : Math.max(1, reward.requirements),
                quantity: Math.max(1, reward.quantity),
                type: habit.type === "task" ? "one-time" : reward.type,
            });
        } else {
            addReward({
                ...reward,
                name,
                requirements: habit.type === "task" ? 1 : Math.max(1, reward.requirements),
                quantity: Math.max(1, reward.quantity),
                type: habit.type === "task" ? "one-time" : reward.type,
            }, habit.id);
        }

        load();
        Toast.show({
            type: "success",
            text1: "Reward saved",
            text2: "Your reward changes are now active.",
            position: "bottom",
            bottomOffset: 60,
        });
    };

    const removeRewardAction = (rewardId: string) => {
        const reward = rewardDrafts.find((entry) => entry.id === rewardId);
        if (!reward) return;

        if (!reward.created_at) {
            setRewardDrafts((prev) => prev.filter((entry) => entry.id !== rewardId));
            return;
        }

        removeReward(rewardId);
        load();
    };

    const today = new Date().toISOString().split("T")[0];

    return (
        <ModalScreen name="Habit Details">
            <View style={styles.container}>
                <Text style={styles.header}>{habit?.name}</Text>
                <View style={styles.statCard}>
                    <Text style={styles.text}>Type: {habit?.type === "task" ? "Task" : "Habit"}</Text>
                    <Text style={styles.text}>
                        {habit?.type === "task"
                            ? `Completed: ${habit?.currentStreak ? "Yes" : "No"}`
                            : `Logged Today: ${habit?.isLoggedToday ? "Yes" : "No"}`}
                    </Text>
                    {habit?.type === "task" ? null : (
                        <>
                            <Text style={styles.text}>Current Streak: {current}</Text>
                            <Text style={styles.text}>Best Streak: {best}</Text>
                        </>
                    )}
                </View>

                <View style={styles.rewardSection}>
                    <View style={styles.rewardHeaderRow}>
                        <Text style={styles.rewardSectionTitle}>Rewards</Text>
                        <Pressable onPress={addRewardDraft} style={styles.addRewardButton}>
                            <Text style={styles.addRewardButtonText}>＋ Add</Text>
                        </Pressable>
                    </View>

                    {rewardDrafts.length === 0 ? (
                        <Text style={styles.text}>No active rewards yet.</Text>
                    ) : (
                        rewardDrafts.map((reward) => {
                            const rewardProgress = calcRewardProgress(logs, reward, habit?.type ?? "habit", today);
                            const remaining = Math.max(reward.requirements - rewardProgress, 0);
                            const canSave = hasRewardChanged(reward);

                            return (
                                <View key={reward.id} style={styles.rewardCard}>
                                    <Text style={styles.subLabel}>Name</Text>
                                    <TextInput
                                        value={reward.name}
                                        onChangeText={(value) => updateRewardDraft(reward.id, { name: value })}
                                        placeholder="Reward name"
                                        placeholderTextColor={Colors.ui.textMuted}
                                        style={styles.input}
                                    />

                                    <Text style={styles.subLabel}>Description</Text>
                                    <TextInput
                                        value={reward.description}
                                        onChangeText={(value) => updateRewardDraft(reward.id, { description: value })}
                                        placeholder="Why this reward matters"
                                        placeholderTextColor={Colors.ui.textMuted}
                                        style={styles.input}
                                    />

                                    <Text style={styles.subLabel}>{habit?.type === "task" ? "Required Completions" : "Requirements"}</Text>
                                    <TextInput
                                        value={String(habit?.type === "task" ? 1 : reward.requirements)}
                                        onChangeText={(value) => updateRewardDraft(reward.id, {
                                            requirements: habit?.type === "task" ? 1 : Number(value.replace(/[^0-9]/g, "")) || 1,
                                        })}
                                        editable={habit?.type !== "task"}
                                        keyboardType="number-pad"
                                        placeholderTextColor={Colors.ui.textMuted}
                                        style={styles.input}
                                    />

                                    <Text style={styles.subLabel}>Quantity</Text>
                                    <TextInput
                                        value={String(reward.quantity)}
                                        onChangeText={(value) => updateRewardDraft(reward.id, {
                                            quantity: Number(value.replace(/[^0-9]/g, "")) || 1,
                                        })}
                                        keyboardType="number-pad"
                                        placeholderTextColor={Colors.ui.textMuted}
                                        style={styles.input}
                                    />

                                    <Text style={styles.subLabel}>Type</Text>
                                    {habit?.type === "task" ? (
                                        <View style={styles.typeTag}>
                                            <Text style={styles.typeTagText}>Tasks only support one-time rewards.</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.typeRow}>
                                            {(["one-time", "recurring"] as const).map((type) => {
                                                const isSelected = reward.type === type;
                                                return (
                                                    <Pressable
                                                        key={type}
                                                        onPress={() => updateRewardDraft(reward.id, { type })}
                                                        style={[styles.typeChip, isSelected ? styles.typeChipSelected : null]}
                                                    >
                                                        <Text style={[styles.typeChipText, isSelected ? styles.typeChipTextSelected : null]}>
                                                            {type === "one-time" ? "One-time" : "Recurring"}
                                                        </Text>
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    )}

                                    <Text style={styles.rewardMeta}>Type: {habit?.type === "task" ? "one-time" : reward.type}</Text>
                                    <Text style={styles.rewardMeta}>
                                        {remaining} {habit?.type === "task" ? "completion(s)" : "log(s)"} remaining since last reward update
                                    </Text>

                                    <View style={styles.rewardActions}>
                                        <Pressable onPress={() => removeRewardAction(reward.id)} style={styles.removeButton}>
                                            <Text style={styles.removeButtonText}>Remove</Text>
                                        </Pressable>
                                        <Pressable
                                            onPress={() => saveReward(reward)}
                                            disabled={!canSave}
                                            style={[styles.saveButton, !canSave ? styles.saveButtonDisabled : null]}
                                        >
                                            <Text style={[styles.saveButtonText, !canSave ? styles.saveButtonTextDisabled : null]}>Save</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </View>
        </ModalScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.ui.background,
    },
    header: {
        fontSize: 30,
        fontWeight: "800",
        color: Colors.ui.textPrimary,
    },
    statCard: {
        marginTop: Spacing.md,
        padding: Spacing.lg,
        borderRadius: Radii.lg,
        backgroundColor: Colors.ui.surface,
        borderWidth: 1,
        borderColor: Colors.ui.border,
        ...Shadows.card,
    },
    text: {
        fontSize: 13,
        color: Colors.ui.textSecondary,
        marginTop: 4,
    },
    rewardSection: {
        marginTop: Spacing.lg,
        padding: Spacing.lg,
        borderRadius: Radii.lg,
        borderColor: Colors.ui.border,
        borderWidth: 1,
        backgroundColor: Colors.ui.surface,
        ...Shadows.card,
    },
    rewardHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    rewardSectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: Colors.ui.textPrimary,
    },
    addRewardButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: Radii.md,
        backgroundColor: Colors.ui.surfaceSoft,
    },
    addRewardButtonText: {
        color: Colors.ui.textPrimary,
        fontWeight: "700",
    },
    rewardCard: {
        marginTop: Spacing.md,
        padding: Spacing.md,
        borderRadius: Radii.md,
        backgroundColor: Colors.ui.surfaceSoft,
    },
    subLabel: {
        marginTop: Spacing.sm,
        color: Colors.ui.textSecondary,
        fontWeight: "600",
    },
    input: {
        marginTop: Spacing.xs,
        borderWidth: 1,
        borderRadius: Radii.md,
        borderColor: Colors.ui.border,
        backgroundColor: Colors.ui.background,
        padding: 12,
        color: Colors.ui.textPrimary,
    },
    typeRow: {
        flexDirection: "row",
        gap: Spacing.sm,
        marginTop: Spacing.xs,
    },
    typeChip: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.ui.border,
        backgroundColor: Colors.ui.background,
        alignItems: "center",
    },
    typeChipSelected: {
        backgroundColor: Colors.ui.accent,
        borderColor: Colors.ui.accent,
    },
    typeChipText: {
        color: Colors.ui.textSecondary,
        fontWeight: "700",
    },
    typeChipTextSelected: {
        color: Colors.ui.background,
    },
    typeTag: {
        marginTop: Spacing.xs,
        borderRadius: Radii.md,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: Colors.ui.background,
        borderWidth: 1,
        borderColor: Colors.ui.border,
    },
    typeTagText: {
        color: Colors.ui.textSecondary,
        fontWeight: "600",
    },
    rewardMeta: {
        fontSize: 12,
        color: Colors.ui.textSecondary,
        marginTop: 8,
    },
    rewardActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    removeButton: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: Radii.md,
        backgroundColor: Colors.ui.danger,
    },
    removeButtonText: {
        color: Colors.ui.background,
        fontWeight: "700",
    },
    saveButton: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: Radii.md,
        backgroundColor: Colors.ui.accent,
    },
    saveButtonDisabled: {
        backgroundColor: Colors.ui.surface,
        borderWidth: 1,
        borderColor: Colors.ui.border,
    },
    saveButtonText: {
        color: Colors.ui.background,
        fontWeight: "700",
    },
    saveButtonTextDisabled: {
        color: Colors.ui.textMuted,
    },
});
