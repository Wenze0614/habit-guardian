import { Colors, Radii, Shadows, Spacing } from "@/constants/theme";
import { clearHabitLogForDate, clearHabitLogs, listHabitLogsForHabits, upsertHabitLog } from "@/db/habitLogs";
import { addRewardLog, clearRewardLogForDate, clearRewardLogsForHabit } from "@/db/rewardLogs";
import { disableReward, listRewardsForHabits, RewardRow } from "@/db/rewards";
import { calcStreaksForHabit } from "@/hooks/useStreak";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { AppState, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { ListItem } from "../../components/ui/ListItem";
import { deleteHabit, HabitKind, listHabits } from "../../db/habits";


export type Habit = {
    id: string;
    name: string;
    type: HabitKind;
    rewards?: RewardRow[];
    isLoggedToday?: boolean;
    isComplete?: boolean;
    completionDate?: string | null;
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
            const today = new Date().toISOString().split('T')[0];
            const todayLog = logsByHabits[habit.id]?.[today];
            const logBydate = logsByHabits[habit.id] || {};
            const completedDates = Object.entries(logBydate)
                .filter(([, status]) => status)
                .map(([date]) => date)
                .sort();
            const isComplete = completedDates.length > 0;
            const completionDate = isComplete ? completedDates[0] : null;
            const streaks = habit.type === "habit"
                ? calcStreaksForHabit(logBydate)
                : { current: isComplete ? 1 : 0, best: isComplete ? 1 : 0 };

            return {
                ...habit,
                rewards: rewardsByHabit[habit.id],
                isLoggedToday: todayLog ? todayLog : false,
                isComplete,
                completionDate,
                currentStreak: streaks.current,
                bestStreak: streaks.best,
            };
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
                if (h.type === "task" && h.isComplete) {
                    return h;
                }
                const progress = h.type === "task" ? 1 : h.currentStreak + 1;
                const newBestStreak = h.type === "task" ? progress : Math.max(progress, h.bestStreak);

                h.rewards?.forEach(r => {
                    if (h.type === "task" && r.type === "recurring") {
                        return;
                    }
                    if (r.requirements <= 0 || progress < r.requirements) {
                        console.log(`Progress ${progress} has not met reward requirement ${r.requirements} for reward ${r.name}`);
                        return; // not eligible for this reward yet
                    }
                    if (r.type === "recurring" && progress % r.requirements !== 0) {
                        console.log(`Progress ${progress} is not a recurring reward checkpoint for requirement ${r.requirements}`);
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
                    isComplete: h.type === "task" ? true : h.isComplete,
                    completionDate: h.type === "task" ? now.toISOString().split('T')[0] : h.completionDate,
                    currentStreak: progress,
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
        setHabits((prev) => prev.map(h => {
            if (h.id !== habitId) return h;

            if (h.type === "task") {
                clearHabitLogs(habitId);
                clearRewardLogsForHabit(habitId);
                return {
                    ...h,
                    isLoggedToday: false,
                    isComplete: false,
                    completionDate: null,
                    currentStreak: 0,
                    bestStreak: 0,
                };
            }

            clearHabitLogForDate(habitId, now.toISOString().split('T')[0]);
            clearRewardLogForDate(habitId, now.toISOString().split('T')[0]);
            return {
                ...h,
                isLoggedToday: false,
                currentStreak: Math.max(h.currentStreak - 1, 0),
            };
        }));
    }



    const getListItem = ({ item }: { item: Habit }) => {
        const isTaskActionDone = item.type === "task" ? item.isComplete : item.isLoggedToday;


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
                    type: isTaskActionDone ? 'cancel' : 'log',
                    onPress: isTaskActionDone ? cancelLogHabitAction : logHabitAction,
                    textLabel: item.type === "task"
                        ? (isTaskActionDone ? "Reopen" : "Done")
                        : (isTaskActionDone ? "Cancel" : "Log")

                }} item={item}>
                <View style={styles.itemContent}>
                    <Text style={{ ...styles.itemText, color: isTaskActionDone ? Colors.ui.textPrimary : Colors.ui.textMuted }}>{item.name}</Text>
                    <Text style={styles.itemMeta}>
                        {item.type === "task"
                            ? ((item.isComplete ? "Completed" : "Open"))
                            : `${item.currentStreak} day streak`}
                    </Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: "700", color: isTaskActionDone ? Colors.ui.textPrimary : Colors.ui.textMuted }}>
                    {item.type === "task" ? (item.isComplete ? "Done" : "To do") : item.currentStreak}
                </Text>
            </ListItem>
        )
    };

    return (
        <SafeAreaView style={styles.habitsContainer}>
            <View style={styles.headerRow}>
                <Text style={styles.headerText}>
                    Habits & Tasks
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
        color: Colors.ui.textPrimary,
        textAlign: "left",
    },
    itemContent: {
        width: "78%",
    },
    itemMeta: {
        marginTop: 4,
        fontSize: 12,
        color: Colors.ui.textMuted,
    },

})
