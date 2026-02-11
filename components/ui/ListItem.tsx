import { Habit } from "@/app/(tabs)/habits";
import { Colors } from "@/constants/theme";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ReanimatedSwipeable, { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";

type ActionInfo = {
    type: "log" | "cancel" | "delete";
    onPress: (id: string) => void;
    textLabel: string;

}

type ListItemProps = {
    rightActionInfo: ActionInfo;
    leftActionInfo: ActionInfo;
    children: React.ReactNode;
    item: Habit;
}

export const ListItem = ({ rightActionInfo, leftActionInfo, item, children }: ListItemProps) => {
    const scale = useRef(new Animated.Value(1)).current;
    const glow = useRef(new Animated.Value(0)).current;
    const swipeRef = useRef<SwipeableMethods>(null);

    const rightAction = () => {
        return <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={() => { rightActionInfo.onPress(item.id);}}>
                <Text style={styles.buttonText}>Delete</Text>
            </TouchableOpacity>
        </View>
    }

    const leftAction = () => {
        return <View style={styles.buttonContainer}>
            {!item.isLoggedToday ?
                <TouchableOpacity style={[styles.button, styles.logButton]} onPress={() => { leftActionInfo.onPress(item.id); swipeRef.current?.close() }}>
                    <Text style={styles.buttonText}>Log</Text>
                </TouchableOpacity>
                :
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => { leftActionInfo.onPress(item.id); swipeRef.current?.close() }}>
                    <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
            }

        </View>
    }



    useEffect(() => {

        glow.stopAnimation();
        scale.stopAnimation();


        // only glow when user just logged it (optional guard)
        if (!item.isLoggedToday) {
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(glow, { toValue: 1, duration: 120, useNativeDriver: false }),
                    Animated.timing(glow, { toValue: 0, duration: 120, useNativeDriver: false }),
                ]),
            ]).start();
        } else {
            glow.setValue(0);
            scale.setValue(1);

            Animated.parallel([
                Animated.sequence([
                    Animated.timing(scale, { toValue: 1.02, duration: 120, useNativeDriver: false }),
                    Animated.timing(scale, { toValue: 1.0, duration: 180, useNativeDriver: false }),
                ]),
                Animated.sequence([
                    Animated.timing(glow, { toValue: 0, duration: 120, useNativeDriver: false }),
                    Animated.timing(glow, { toValue: 1, duration: 450, useNativeDriver: false }),
                ]),
            ]).start();
        }


    }, [item.isLoggedToday]);

    const shadowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] });
    const shadowRadius = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 3] });

    return (< ReanimatedSwipeable renderRightActions={rightAction} renderLeftActions={leftAction} ref={swipeRef} >
        <Pressable
            onPress={() => router.push({ pathname: '/habitModal', params: { id: item.id } })}
            style={styles.itemContainer}>
            <Animated.View style={{
                ...styles.item,
                backgroundColor: item.isLoggedToday ? Colors.yellow[50] : Colors.grey[500],
                transform: [{ scale }],
                shadowOpacity,
                shadowRadius,
            }}>
                {children}
                {/* <Text style={styles.itemText}>{item.name}</Text>
                <Text style={{ fontSize: 16, color: Colors.yellow[100] }}>{item.currentStreak}</Text> */}
                {/* <Pressable onPress={()=> router.push('/habit')}><Text style={styles.itemText}>{'>'}</Text></Pressable> */}
            </Animated.View>
        </Pressable>
    </ReanimatedSwipeable >)
}

const styles = StyleSheet.create({
    itemContainer: {
        padding: 6,
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: 100,

    },
    item: {
        backgroundColor: "#f1f1f1",
        padding: 20,
        height: 80,
        width: "100%",
        borderRadius: 12,
        // borderTopLeftRadius: 8,
        // borderBottomLeftRadius: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        // iOS glow
        shadowColor: "#FCC419", // yellow
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
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
}
)