import { Colors } from "@/constants/theme";
import { clearHabitLogForDate, listHabitLogsForHabits, upsertHabitLog } from "@/db/habitLogs";
import { addRewardLog, clearRewardLogForDate } from "@/db/rewardLogs";
import { listRewardsForHabits, RewardRow } from "@/db/rewards";
import { calcStreaksForHabit } from "@/hooks/useStreak";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
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


    const logHabitAction = useCallback((habitId: string) => {
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
                    if (newCurrentStreak < r.requirements) {
                        console.log(`Streak ${newCurrentStreak} has not met reward requirement ${r.requirements} for reward ${r.name}`);
                        return; // not eligible for this reward yet
                    }
                    switch (r.type) {
                        case "one-time":
                            addRewardLog(r.id, h.id, r.quantity);
                            alert(`Congrats! You've earned the reward: ${r.name} for habit "${h.name}"!`);
                            break;
                        case "recurring":
                            addRewardLog(r.id, h.id, r.quantity);
                            alert(`Congrats! You've earned the reward: ${r.name} for habit "${h.name}"!`);
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

        const rightAction = () => {
            return <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={() => deleteHabitAction(item.id)}>
                    <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
            </View>
        }

        const leftAction = () => {
            return <View style={styles.buttonContainer}>
                {!item.isLoggedToday ?
                    <TouchableOpacity style={[styles.button, styles.logButton]} onPress={() => { logHabitAction(item.id) }}>
                        <Text style={styles.buttonText}>Log</Text>
                    </TouchableOpacity>
                    :
                    <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => { cancelLogHabitAction(item.id) }}>
                        <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                }

            </View>
        }

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
            <ListItem rightAction={rightAction} leftAction={leftAction} item={item}>
                <Text style={{ ...styles.itemText, color: item.isLoggedToday ? Colors.grey[300] : Colors.yellow[100] }}>{item.name}</Text>
                <Text style={{ fontSize: 16, color: item.isLoggedToday ? Colors.grey[300] : Colors.yellow[100] }}>{item.currentStreak}</Text>
            </ListItem>
        )
    };

    return (
        <SafeAreaView style={styles.habitsContainer}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 22, fontWeight: "700", color: Colors.yellow[100] }}>
                    Habits
                </Text>
                <Pressable onPress={() => router.push("/addHabitModal")} style={{ backgroundColor: Colors.yellow[100], width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, color: Colors.grey[400] }}>＋</Text>
                </Pressable>
            </View>


            {habits.length === 0 ? (
                <Text style={{ marginTop: 16, color: Colors.yellow[50] }}>
                    No habits yet.
                </Text>
            ) : (

                <View style={{ marginTop: 32, flex: 1 }}>
                    <FlatList
                        data={habits}
                        renderItem={({ item }) => getListItem({ item })}
                        keyExtractor={(item) => item.id}
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
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        backgroundColor: Colors.grey[400],
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
        fontSize: 15,
        fontWeight: "500",
        width: "80%",
        color: Colors.yellow[100],
        textAlign: "left",
    },
    buttonContainer: {
        flexDirection: "row",
        padding: 6,
        height: 100,
    },
    button: {
        width: 80,
        height: "100%",
        backgroundColor: "red",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 12,
        // borderTopRightRadius: 8,
        // borderBottomRightRadius: 8,
    },
    deleteButton: {
        backgroundColor: "red",
        // borderTopRightRadius: 8,
        // borderBottomRightRadius: 8,
    },
    logButton: {
        backgroundColor: "green",
        // borderTopLeftRadius: 8,
        // borderBottomLeftRadius: 8,

    },
    cancelButton: {
        backgroundColor: "grey",
        borderTopLeftRadius: 8,
        borderBottomLeftRadius: 8,

    },
    buttonText: {
        color: "#fff",
        fontWeight: "500",
    }
})
