import { Habit } from "@/app/(tabs)/habits";
import { Colors, Radii, Spacing } from "@/constants/theme";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ReanimatedSwipeable, { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";

type ActionInfo = {
    type: "log" | "cancel" | "delete" | "archive";
    onPress: (id: string) => void;
    textLabel: string;

}

type ListItemProps = {
    rightActionInfo: ActionInfo[];
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
            {rightActionInfo.map((action) => (
                <TouchableOpacity
                    key={action.type}
                    style={[styles.button, action.type === "archive" ? styles.archiveButton : styles.deleteButton]}
                    onPress={() => { action.onPress(item.id); swipeRef.current?.close(); }}
                >
                    <Text style={action.type === "archive" ? styles.archiveButtonText : styles.buttonText}>{action.textLabel}</Text>
                </TouchableOpacity>
            ))}
        </View>
    }

    const leftAction = () => {
        return <View style={styles.buttonContainer}>
            {leftActionInfo.type === "log" ?
                <TouchableOpacity style={[styles.button, styles.logButton]} onPress={() => { leftActionInfo.onPress(item.id); swipeRef.current?.close() }}>
                    <Text style={styles.buttonText}>{leftActionInfo.textLabel}</Text>
                </TouchableOpacity>
                :
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => { leftActionInfo.onPress(item.id); swipeRef.current?.close() }}>
                    <Text style={styles.buttonText}>{leftActionInfo.textLabel}</Text>
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

    return (< ReanimatedSwipeable renderRightActions={rightAction} renderLeftActions={leftAction} ref={swipeRef} >
        <Pressable
            onPress={() => router.push({ pathname: '/habitModal', params: { id: item.id } })}
            style={styles.itemContainer}>
            <Animated.View style={{
                ...styles.item,
                backgroundColor: item.isLoggedToday ? Colors.ui.surfaceSoft : Colors.ui.surface,
                // transform: [{ scale }],
                // shadowOpacity,
                // shadowRadius,
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
        paddingVertical: Spacing.xs,
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        minHeight: 96,

    },
    item: {
        paddingHorizontal: Spacing.lg,
        height: 84,
        width: "100%",
        borderRadius: Radii.md,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderColor: Colors.ui.border,
        borderWidth: 1,
        // shadowColor: Colors.ui.accent,
        // shadowOffset: { width: 0, height: 0 },
        // shadowOpacity: 0,
        // shadowRadius: 0,
        // ...Shadows.glow,
    },
    buttonContainer: {
        flexDirection: "row",
        paddingVertical: Spacing.xs,
        height: 96,
    },
    button: {
        width: 80,
        height: "100%",
        backgroundColor: Colors.ui.danger,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: Radii.md,
    },
    deleteButton: {
        backgroundColor: Colors.ui.danger,
    },
    archiveButton: {
        backgroundColor: Colors.grey[300],
    },
    logButton: {
        backgroundColor: Colors.ui.success,

    },
    cancelButton: {
        backgroundColor: Colors.ui.textMuted,
        borderTopLeftRadius: Radii.md,
        borderBottomLeftRadius: Radii.md,

    },
    buttonText: {
        color: Colors.ui.background,
        fontWeight: "700",
    },
    archiveButtonText: {
        color: Colors.ui.textPrimary,
        fontWeight: "700",
    },
}
)
