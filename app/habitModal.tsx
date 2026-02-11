import { Colors } from "@/constants/theme";
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
    const { current, best, loading } = useStreak(id);

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
                <Text style={styles.text}>Logged Today: {habit?.isLoggedToday ? "Yes" : "No"}</Text>
                <Text style={styles.text}>Current Streak: {current}</Text>
                <Text style={styles.text}>Best Streak: {best}</Text>
                {habit?.rewards && habit.rewards.length > 0 && (
                    <View style={{ marginTop: 16, padding: 16, borderRadius: 8, borderColor: Colors.yellow[100], borderWidth: 1 }}>
                        <Text style={{ fontSize: 18, fontWeight: "600", color: Colors.yellow[100] }}>Rewards:</Text>
                        {habit.rewards.map((reward) => (
                            <View key={reward.id} style={{ marginLeft: 16, marginTop: 8 }}>
                                <Text style={{ fontSize: 18, fontWeight: '500', color: Colors.yellow[100] }}>{reward.name}</Text>
                                <Text style={{ fontSize: 12, color: Colors.grey[100] }}>{reward.description}</Text>
                                <Text style={{ fontSize: 12, color: Colors.grey[100] }}>Type: {reward.type}</Text>
                                <Text style={{ fontSize: 12, color: Colors.grey[100] }}>Quantity: {reward.quantity}</Text>
                                <Text style={{ fontSize: 12, color: Colors.grey[100] }}>Need {
                                    reward.type === 'one-time' ?
                                        <Text style={{ fontSize: 14, fontWeight: '500', color: Colors.yellow[100] }}>{Math.max(reward.requirements - current)}</Text> :
                                        <Text style={{ fontSize: 14, fontWeight: '500', color: Colors.yellow[100] }}>{reward.requirements % current}</Text>
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
        justifyContent: "center",
        backgroundColor: Colors.grey[500],
        // alignItems: "center"
    },
    header: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 16,
        color: Colors.yellow[100],
    },
    text: {
        fontSize: 12, color: Colors.grey[100]
    }
})