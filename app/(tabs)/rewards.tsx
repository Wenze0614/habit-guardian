import { Colors, Radii, Shadows, Spacing } from "@/constants/theme";
import { listUnusedRewardLogs, redeemPartialRewardLog, redeemRewardLog } from "@/db/rewardLogs";
import { getRewardById } from "@/db/rewards";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type RewardLog = {
    id: string;
    rewardId: string;
    habitId: string | null;
    name: string;
    description: string;
    requirements: number;
    type: "one-time" | "recurring";
    quantity: number;
    dateReceived: string; // YYYY-MM-DD
    dateRedeemed: string | null; // YYYY-MM-DD or null
    used: boolean;
}

type RedeemModalState = {
    visible: boolean;
    rewardLogId: string | null;
    maxQuantity: number;
    redeemQuantity: number;
}

export default function RewardsScreen() {
    const [rewardLogs, setRewardLogs] = useState<RewardLog[]>([]);
    const [redeemModal, setRedeemModal] = useState<RedeemModalState>({ visible: false, rewardLogId: null, maxQuantity: 1, redeemQuantity: 1 });

    // Listen to app state changes to refresh rewards when user comes back to the app
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
    )

    const load = () => {
        const data = listUnusedRewardLogs();
        const rewardDetails = data.map(rewardLog => {
            const d = getRewardById(rewardLog.reward_id);
            return {
                id: rewardLog.id,
                rewardId: rewardLog.reward_id,
                habitId: rewardLog.habit_id,
                name: d?.name ?? "Unknown Reward",
                description: d?.description ?? "",
                requirements: d?.requirements ?? 1,
                type: d?.type ?? "one-time",
                quantity: rewardLog?.quantity ?? 1,
                dateReceived: rewardLog.date_received,
                dateRedeemed: rewardLog.date_redeemed,
                used: rewardLog.used === 1
            }
        })
        setRewardLogs(rewardDetails);
    }

    const onPressRedeem = (rewardLogId: string, quantity: number) => {
        if (quantity === 1) {
            redeemReward(rewardLogId);
            return;
        }
        console.log("Opening redeem modal for reward log id: ", rewardLogId, " with quantity: ", quantity)
        setRedeemModal({ visible: true, rewardLogId, maxQuantity: quantity, redeemQuantity: 1 });
    }

    const onPressRedeemPartial = async () => {
        const rewardLogId = redeemModal.rewardLogId;
        console.log("Redeeming reward log id: ", rewardLogId, " with quantity: ", redeemModal.redeemQuantity)
        if (!rewardLogId) return;
        if (redeemModal.redeemQuantity >= redeemModal.maxQuantity) {
            redeemReward(rewardLogId);
            setRedeemModal({ visible: false, rewardLogId: null, maxQuantity: 1, redeemQuantity: 1 })
            return;
        }

        // For recurring rewards where user wants to redeem part of the quantity, we update the reward log with the new quantity after redemption
        redeemPartialRewardLog(rewardLogId, redeemModal.redeemQuantity);
        setRewardLogs((prev) => prev.map(r => {
            if (r.id === rewardLogId) {
                return { ...r, quantity: r.quantity - redeemModal.redeemQuantity }
            }
            return r;
        }))
        setRedeemModal({ visible: false, rewardLogId: null, maxQuantity: 1, redeemQuantity: 1 })
        await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
        );
    }

    // For one-time rewards or when redeeming all quantity, we can just mark the reward log as redeemed and remove it from the list
    const redeemReward = async (rewardLogId: string) => {
        redeemRewardLog(rewardLogId);
        setRewardLogs((prev) => prev.filter(r => r.id !== rewardLogId));
        await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
        );
    }


    return (
        // <ScrollView
        //     contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        //     keyboardShouldPersistTaps="handled"
        // >
        <SafeAreaView style={styles.container}>
            <View style={{ flex: 1 }}>
                <Text style={styles.headerText}>
                    Rewards
                </Text>
                {rewardLogs.length === 0 ? (
                    <View style={styles.emptyStateCard}>
                        <Text style={styles.emptyStateTitle}>No rewards yet</Text>
                        <Text style={styles.emptyStateSubtitle}>Log your habits to earn rewards.</Text>
                    </View>
                ) : (
                    <View style={styles.listWrap}>
                        {rewardLogs.map((log) => (
                            <View style={styles.rewardItemContainer} key={log.id}>
                                <View key={log.id} style={styles.rewardInfo}>
                                    <Text style={styles.rewardName}>{log.name}</Text>
                                    {/* <Text style={{ fontSize: 14, color: "#555" }}>{log.dateReceived}</Text> */}
                                    {/* Add redeem button or other actions here */}
                                </View>
                                <Text style={styles.quantityText}>{log.quantity}</Text>
                                <Pressable onPress={() => { onPressRedeem(log.id, log.quantity) }} style={styles.redeemButton}>
                                    <Text style={styles.redeemButtonText}>Redeem</Text>
                                </Pressable>
                            </View>
                        ))}
                    </View>
                )}
            </View>
            {
                redeemModal.visible && (
                    <View style={styles.redeemModalContainer}>
                        <View style={{ width: "80%", padding: 20, backgroundColor: Colors.ui.surfaceSoft, borderRadius: 12, borderColor: Colors.ui.border, borderWidth: 1 }}>
                            <Text style={{ fontSize: 18, fontWeight: "600", color: Colors.ui.textPrimary }}>Redeem Reward</Text>
                            <Text style={{ marginTop: 12, fontSize: 12, color: Colors.ui.textSecondary }}>Enter the quantity you want to redeem</Text>
                            <TextInput
                                value={redeemModal.redeemQuantity.toString()}
                                onChangeText={(t) => {
                                    const quantity = Number(t.replace(/[^0-9]/g, ""));
                                    setRedeemModal((rm) => { return { ...rm, redeemQuantity: quantity } })
                                }}
                                keyboardType="number-pad"
                                placeholder={`Max: ${redeemModal.maxQuantity}`}
                                placeholderTextColor={Colors.ui.textMuted}
                                style={{ borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 6, borderColor: Colors.ui.border, color: Colors.ui.textPrimary, backgroundColor: Colors.ui.background }}
                            />
                            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 20 }}>
                                <Pressable
                                    onPress={() => setRedeemModal({ visible: false, rewardLogId: null, maxQuantity: 1, redeemQuantity: 1 })}
                                    style={{ paddingHorizontal: 12, paddingVertical: 6, }}>
                                    <Text style={{ color: Colors.ui.textSecondary }}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => { onPressRedeemPartial() }}
                                    style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.ui.accent, borderRadius: 6, marginLeft: 8 }}>
                                    <Text style={{ color: Colors.ui.background, fontWeight: "700" }}>Confirm</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                )
            }

        </SafeAreaView>
        // </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: Spacing.lg,
        backgroundColor: Colors.ui.background,
    },
    headerText: {
        fontSize: 30,
        fontWeight: "800",
        letterSpacing: 0.3,
        color: Colors.ui.textPrimary,
    },
    listWrap: {
        marginTop: Spacing.md,
        flex: 1,
    },
    emptyStateCard: {
        marginTop: Spacing.md,
        borderRadius: Radii.lg,
        padding: Spacing.xl,
        backgroundColor: Colors.ui.surface,
        borderWidth: 1,
        borderColor: Colors.ui.border,
        ...Shadows.card,
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
    rewardItemContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        minHeight: 92,
        padding: Spacing.md,
        marginTop: 12,
        borderRadius: Radii.md,
        backgroundColor: Colors.ui.surface,
        borderColor: Colors.ui.border,
        borderWidth: 1,
        ...Shadows.card,
    },
    rewardInfo: {
        borderRadius: Radii.sm,
        width: "50%",
    },
    rewardName: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.ui.textPrimary,
    },
    quantityText: {
        fontSize: 14,
        fontWeight: "700",
        color: Colors.ui.accentStrong,
    },
    redeemButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: Colors.ui.accent,
        borderRadius: Radii.sm,
    },
    redeemButtonText: {
        color: Colors.ui.background,
        fontWeight: "700",
    },
    redeemModalContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: Colors.ui.overlay,
        justifyContent: "center",
        alignItems: "center"
    }
})
