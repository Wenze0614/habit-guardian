import { Colors, Radii, Shadows, Spacing } from "@/constants/theme";
import { clearHabitLogForDate, listHabitLogsForHabits, upsertHabitLog } from "@/db/habitLogs";
import { addRewardLog, clearRewardLogForDate } from "@/db/rewardLogs";
import { disableReward, listRewardsForHabits, RewardRow } from "@/db/rewards";
import { calcStreaksForHabit } from "@/hooks/useStreak";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { AppState, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { ListItem } from "../../components/ui/ListItem";
import { deleteHabit, listHabits } from "../../db/habits";


export type Habit = {
    id: string;
    name: string;
    type: "good" | "bad";
    rewards?: RewardRow[];
    isLoggedToday?: boolean;
    currentStreak: number;
    bestStreak: number;
};

export default function HabitsScreen() {
    const [habits, setHabits] = useState<Habit[]>([]);
    // const [rewards, setRewards] = useState<Reward[]>([]);
    const router = useRouter();

    useEffect(() => {
        const sub = AppState.addEventListener("change", (state) => {
          if (state === "active") {
            load(); // recompute isLoggedToday + streaks
          }
        });
        return () => sub.remove();
      }, []);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [])
    );

    function load() {
        const rows = listHabits();
        const habitIds = rows.map(h => h.id);
        const logs = listHabitLogsForHabits(habitIds);
        const rewards = listRewardsForHabits(habitIds);

        // Group logs by habit_id => { [date]: boolean }
        const logsByHabits: Record<string, Record<string, boolean>> = {};
        for (const r of logs) {
            if (!logsByHabits[r.habit_id]) logsByHabits[r.habit_id] = {};
            logsByHabits[r.habit_id][r.date] = r.status === 1;
        }

        const rewardsByHabit: Record<string, RewardRow[]> = {};
        for (const r of rewards) {
            if (!rewardsByHabit[r.habit_id]) rewardsByHabit[r.habit_id] = [];
            rewardsByHabit[r.habit_id].push({
                id: r.id,
                name: r.name,
                type: r.type,
                quantity: r.quantity,
                requirements: r.requirements,
                description: r.description,
                habit_id: r.habit_id,
                enabled: r.enabled === 1 ? 1 : 0,
            });
        }


        const habitsWithMeta = rows.map((habit) => {
            // const rewards = listRewardsForHabit(habit.id);
            const today = new Date().toISOString().split('T')[0];
            const todayLog = logsByHabits[habit.id]?.[today];
            const logBydate = logsByHabits[habit.id] || {};
            const { current, best } = calcStreaksForHabit(logBydate);
            console.log("rewards for each habit: ", rewardsByHabit[habit.id])

            return { ...habit, rewards: rewardsByHabit[habit.id], isLoggedToday: todayLog ? todayLog : false, currentStreak: current, bestStreak: best };
        });
        setHabits(habitsWithMeta);

    }

    const deleteHabitAction = useCallback((habitId: string) => {
        deleteHabit(habitId);
        setHabits((prev) => prev.filter(h => h.id !== habitId));
    }, [])


    const logHabitAction = useCallback(async (habitId: string) => {
        const now = new Date();
        console.log(`Logging habit ${habitId} `);
        upsertHabitLog({ habitId, date: now.toISOString().split('T')[0], status: true, note: "" });
        console.log(habits)
        setHabits((prev) => {
            return prev.map(h => {
                if (h.id !== habitId) return h; // not the one we're logging
                const newCurrentStreak = h.currentStreak + 1;
                const newBestStreak = newCurrentStreak > h.bestStreak ? newCurrentStreak : h.bestStreak;
                console.log("rewards:", h.rewards)
                h.rewards?.forEach(r => {
                    console.log("reward:", r)
                    if (r.requirements <= 0 || newCurrentStreak < r.requirements) {
                        console.log(`Streak ${newCurrentStreak} has not met reward requirement ${r.requirements} for reward ${r.name}`);
                        return; // not eligible for this reward yet
                    }
                    if (r.type === "recurring" && newCurrentStreak % r.requirements !== 0) {
                        console.log(`Streak ${newCurrentStreak} is not a recurring reward checkpoint for requirement ${r.requirements}`);
                        return;
                    }
                    switch (r.type) {
                        case "one-time":
                            addRewardLog(r.id, h.id, r.quantity);
                            //alert(`Congrats! You've earned the reward: ${r.name} for habit "${h.name}"!`);
                            Toast.show({
                                type: 'success',
                                text1: 'You earned new reward!',
                                text2: 'Great job 💪!',
                                position: 'bottom',
                                bottomOffset: 60,
                            });
                            disableReward(r.id); // one-time reward should be disabled after receiving
                            break;
                        case "recurring":
                            addRewardLog(r.id, h.id, r.quantity);
                            //alert(`Congrats! You've earned the reward: ${r.name} for habit "${h.name}"!`);
                            Toast.show({
                                type: 'success',
                                text1: 'You earned new reward!',
                                text2: 'Great job 💪!',
                                position: 'bottom',
                                bottomOffset: 60,
                            });
                            break;
                        default:
                            break;
                    }
                })
                return {
                    ...h,
                    isLoggedToday: true,
                    currentStreak: newCurrentStreak,
                    bestStreak: newBestStreak
                }
            })
        });
        await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
        );
    }, [])

    const cancelLogHabitAction = (habitId: string) => {
        const now = new Date();
        clearHabitLogForDate(habitId, now.toISOString().split('T')[0]);
        clearRewardLogForDate(habitId, now.toISOString().split('T')[0]);
        setHabits((prev) => prev.map(h => h.id === habitId ? {
            ...h,
            isLoggedToday: false,
            currentStreak: h.currentStreak - 1,
        } : h));
    }



    const getListItem = ({ item }: { item: Habit }) => {


        // return (< ReanimatedSwipeable renderRightActions={rightAction} renderLeftActions={leftAction} >
        //     <Pressable onPress={() => router.push({ pathname: '/habitModal', params: { id: item.id } })} >
        //         <Animated.View style={{
        //             ...styles.item,
        //             backgroundColor: item.isLoggedToday ? Colors.yellow[50] : Colors.grey[500],
        //             transform: [{ scale }],
        //             shadowOpacity,
        //             shadowRadius,
        //         }}>
        //             <Text style={styles.itemText}>{item.name}</Text>
        //             <Text style={{ fontSize: 16, color: Colors.yellow[100] }}>{item.currentStreak}</Text>
        //             {/* <Pressable onPress={()=> router.push('/habit')}><Text style={styles.itemText}>{'>'}</Text></Pressable> */}
        //         </Animated.View>
        //     </Pressable>
        // </ReanimatedSwipeable >)
        return (
            <ListItem
                rightActionInfo={{ type: 'delete', onPress: deleteHabitAction, textLabel: "Delete" }}
                leftActionInfo={{
                    type: item.isLoggedToday ? 'cancel' : 'log',
                    onPress: item.isLoggedToday ? cancelLogHabitAction : logHabitAction,
                    textLabel: item.isLoggedToday ? "Cancel" : "Log"

                }} item={item}>
                <Text style={{ ...styles.itemText, color: item.isLoggedToday ? Colors.ui.textPrimary :  Colors.ui.textMuted }}>{item.name}</Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: item.isLoggedToday ? Colors.ui.textPrimary: Colors.ui.textMuted }}>{item.currentStreak}</Text>
            </ListItem>
        )
    };

    return (
        <SafeAreaView style={styles.habitsContainer}>
            <View style={styles.headerRow}>
                <Text style={styles.headerText}>
                    Habits
                </Text>
                <Pressable onPress={() => router.push("/addHabitModal")} style={styles.addButton}>
                    <Text style={styles.addButtonText}>＋</Text>
                </Pressable>
            </View>


            {habits.length === 0 ? (
                <View style={styles.emptyStateCard}>
                    <Text style={styles.emptyStateTitle}>No habits yet</Text>
                    <Text style={styles.emptyStateSubtitle}>Tap the + button to add your first habit.</Text>
                </View>
            ) : (

                <View style={styles.listWrap}>
                    <FlatList
                        data={habits}
                        renderItem={({ item }) => getListItem({ item })}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                    />
                </View>
            )}
            {/* <Pressable onPress={load} style={{ marginTop: 10 }}>
                <Text style={{ textDecorationLine: "underline" }}>Refresh</Text>
            </Pressable> */}

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    habitsContainer: {
        flex: 1,
        padding: Spacing.lg,
        backgroundColor: Colors.ui.background,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: Spacing.md,
    },
    headerText: {
        fontSize: 30,
        fontWeight: "800",
        letterSpacing: 0.3,
        color: Colors.ui.textPrimary,
    },
    addButton: {
        backgroundColor: Colors.ui.accent,
        width: 38,
        height: 38,
        borderRadius: Radii.pill,
        justifyContent: "center",
        alignItems: "center",
        ...Shadows.glow,
    },
    addButtonText: {
        fontSize: 22,
        lineHeight: 24,
        color: Colors.ui.background,
        fontWeight: "700",
    },
    emptyStateCard: {
        marginTop: Spacing.md,
        borderRadius: Radii.lg,
        padding: Spacing.xl,
        backgroundColor: Colors.ui.surface,
        borderWidth: 1,
        borderColor: Colors.ui.border,
        ...Shadows.glow,
    },
    emptyStateTitle: {
        color: Colors.ui.textPrimary,
        fontWeight: "700",
        fontSize: 18,
    },
    emptyStateSubtitle: {
        marginTop: Spacing.sm,
        color: Colors.ui.textSecondary,
        fontSize: 14,
    },
    listWrap: {
        marginTop: Spacing.md,
        flex: 1,
    },
    // item: {
    //     backgroundColor: "#f1f1f1",
    //     marginBottom: 12,
    //     padding: 20,
    //     height: 80,
    //     borderRadius: 12,
    //     // borderTopLeftRadius: 8,
    //     // borderBottomLeftRadius: 8,
    //     flexDirection: "row",
    //     justifyContent: "space-between",
    //     alignItems: "center",
    //     // iOS glow
    //     shadowColor: "#FCC419", // yellow
    //     shadowOffset: { width: 0, height: 0 },
    //     shadowOpacity: 0,
    //     shadowRadius: 0,

    // },
    itemText: {
        fontSize: 16,
        fontWeight: "600",
        width: "80%",
        color: Colors.ui.textPrimary,
        textAlign: "left",
    },

})
