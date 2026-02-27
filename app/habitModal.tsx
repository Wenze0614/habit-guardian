import { Colors, Radii, Shadows, Spacing } from "@/constants/theme";
import { getHabitLogForDate } from "@/db/habitLogs";
import { getHabitById } from "@/db/habits";
import { listRewardsForHabit } from "@/db/rewards";
import { useStreak } from "@/hooks/useStreak";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import ModalScreen from "../components/ui/modal";
import { Habit } from "./(tabs)/habits";

export default function HabitScreen() {

    const { id } = useLocalSearchParams<{ id: string }>();
    const [habit, setHabit] = useState<Habit>();
    const { current, best } = useStreak(id);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [])
    );

    function load() {
        const habit = getHabitById(id);
        const todayLog = getHabitLogForDate(id, new Date().toISOString().split('T')[0]);
        const rewards = listRewardsForHabit(id);
        setHabit({
            id: habit?.id ?? "",
            name: habit?.name ?? "",
            type: habit?.type ?? "good",
            isLoggedToday: todayLog ? todayLog.status === 1 : false,
            rewards,
            currentStreak: current,
            bestStreak: best,
        });

    }

    return (
        <ModalScreen name="Habit Details">
            {/* Habit details content goes here */}
            <View style={styles.container}>
                <Text style={styles.header}>{habit?.name}</Text>
                <View style={styles.statCard}>
                    <Text style={styles.text}>Logged Today: {habit?.isLoggedToday ? "Yes" : "No"}</Text>
                    <Text style={styles.text}>Current Streak: {current}</Text>
                    <Text style={styles.text}>Best Streak: {best}</Text>
                </View>
                {habit?.rewards && habit.rewards.length > 0 && (
                    <View style={styles.rewardSection}>
                        <Text style={styles.rewardSectionTitle}>Rewards</Text>
                        {habit.rewards.map((reward) => (
                            <View key={reward.id} style={styles.rewardCard}>
                                <Text style={styles.rewardName}>{reward.name}</Text>
                                <Text style={styles.rewardMeta}>{reward.description}</Text>
                                <Text style={styles.rewardMeta}>Type: {reward.type}</Text>
                                <Text style={styles.rewardMeta}>Quantity: {reward.quantity}</Text>
                                <Text style={styles.rewardMeta}>Need {
                                    reward.type === 'one-time' ?
                                        <Text style={styles.highlightText}>{Math.max(reward.requirements - current)}</Text> :
                                        <Text style={styles.highlightText}>{
                                            current === 0 ? reward.requirements : Math.max(reward.requirements - current%reward.requirements)
                                        }</Text>
                                } log(s) to receive reward</Text>
                            </View>
                        ))}
                    </View>
                )}
                {/* Add more details as needed */}
            </View>
        </ModalScreen>
    )
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
    rewardSectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: Colors.ui.textPrimary,
    },
    rewardCard: {
        marginTop: Spacing.md,
        padding: Spacing.md,
        borderRadius: Radii.md,
        backgroundColor: Colors.ui.surfaceSoft,
    },
    rewardName: {
        fontSize: 16,
        fontWeight: "700",
        color: Colors.ui.textPrimary,
    },
    rewardMeta: {
        fontSize: 12,
        color: Colors.ui.textSecondary,
        marginTop: 3,
    },
    highlightText: {
        fontSize: 14,
        fontWeight: "700",
        color: Colors.ui.accent,
    },
})
