import React, { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteHabit, listGoodHabits } from "../../db/habits";

type Habit = {
    id: string;
    name: string;
    type: "good" | "bad";
};

export default function GoodHabitsScreen() {
    const [habits, setHabits] = useState<Habit[]>([]);

    useEffect(() => {
        load();
    }, []);

    function load() {
        const rows = listGoodHabits();
        setHabits(rows);
    }

    return (
        <SafeAreaView style={{ flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, backgroundColor: "#fff" }}>
            <View style={{ flex: 1, padding: 16, backgroundColor: "#fff" }}>
                <Text style={{ fontSize: 22, fontWeight: "700", color: "#000" }}>
                    Good Habits
                </Text>

                {habits.length === 0 ? (
                    <Text style={{ marginTop: 16, color: "#666" }}>
                        No good habits yet.
                    </Text>
                ) : (
                    <FlatList
                        data={habits}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ marginTop: 12 }}
                        renderItem={({ item }) => (
                            <View
                                style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: 12,
                                    borderWidth: 1,
                                    borderRadius: 12,
                                    marginBottom: 10,
                                }}
                            >
                                <Text style={{ fontSize: 16, color: "#000" }}>
                                    {item.name}
                                </Text>
                                <Pressable
                                    onPress={() => {deleteHabit(item.id); setHabits((prev) => prev.filter(h => h.id !== item.id));}}
                                    hitSlop={10}
                                    style={{ width:28, height:28, borderRadius:14, alignItems:"center", justifyContent:"center"}}
                                >
                                    <Text style={{ fontSize:18, fontWeight:"700", color:"#888" }}>X</Text>
                                </Pressable>
                            </View>
                        )}
                    />
                )}
                <Pressable onPress={load} style={{ marginTop: 10 }}>
                    <Text style={{ textDecorationLine: "underline" }}>Refresh</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}