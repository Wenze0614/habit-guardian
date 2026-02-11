import { Colors } from "@/constants/theme";
import { listUnusedRewardLogs, redeemPartialRewardLog, redeemRewardLog } from "@/db/rewardLogs";
import { getRewardById } from "@/db/rewards";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type RewardLog = {
    id: string;
    rewardId: string;
    habitId: string;
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

    useFocusEffect(
        useCallback(() => {
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
        }, [])
    )

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
        <SafeAreaView style={{ flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, backgroundColor: Colors.grey[400], }}>
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, fontWeight: "700", color: Colors.yellow[100] }}>
                    Rewards
                </Text>
                {rewardLogs.length === 0 ? (
                    <Text style={{ marginTop: 16, fontSize: 16, color: Colors.grey[200] }}>
                        No rewards available. Log your habits to earn rewards!
                    </Text>
                ) : (
                    <View style={{ marginTop: 32, flex: 1 }}>
                        {rewardLogs.map((log) => (
                            <View style={styles.rewardItemContainer} key={log.id}>
                                <View key={log.id} style={{ borderRadius: 8, width: "50%" }}>
                                    <Text style={{ fontSize: 16, fontWeight: "400", color: Colors.grey[400] }}> {log.name}</Text>
                                    {/* <Text style={{ fontSize: 14, color: "#555" }}>{log.dateReceived}</Text> */}
                                    {/* Add redeem button or other actions here */}
                                </View>
                                <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.yellow[400] }}>{log.quantity}</Text>
                                <Pressable onPress={() => { onPressRedeem(log.id, log.quantity) }} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.yellow[400], borderRadius: 6 }}>
                                    <Text style={{ color: Colors.yellow[50] }}>Redeem</Text>
                                </Pressable>
                            </View>
                        ))}
                    </View>
                )}
            </View>
            {
                redeemModal.visible && (
                    <View style={styles.redeemModalContainer}>
                        <View style={{ width: "80%", padding: 20, backgroundColor: Colors.grey[400], borderRadius: 12 }}>
                            <Text style={{ fontSize: 18, fontWeight: "600", color: Colors.yellow[100] }}>Redeem Reward</Text>
                            <Text style={{ marginTop: 12, fontSize: 12, color: Colors.grey[100] }}>Enter the quantity you want to redeem</Text>
                            <TextInput
                                value={redeemModal.redeemQuantity.toString()}
                                onChangeText={(t) => {
                                    const quantity = Number(t.replace(/[^0-9]/g, ""));
                                    setRedeemModal((rm) => { return { ...rm, redeemQuantity: quantity } })
                                }}
                                keyboardType="number-pad"
                                placeholder={`Max: ${redeemModal.maxQuantity}`}
                                placeholderTextColor={Colors.grey[100]}
                                style={{ borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 6, borderColor: Colors.yellow[100], color: Colors.yellow[100] }}
                            />
                            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 20 }}>
                                <Pressable
                                    onPress={() => setRedeemModal({ visible: false, rewardLogId: null, maxQuantity: 1, redeemQuantity: 1 })}
                                    style={{ paddingHorizontal: 12, paddingVertical: 6, }}>
                                    <Text style={{ color: Colors.grey[100] }}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => { onPressRedeemPartial() }}
                                    style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.yellow[500], borderRadius: 6, marginLeft: 8 }}>
                                    <Text style={{ color: Colors.yellow[100] }}>Confirm</Text>
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
    rewardItemContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        height: 100,
        padding: 16,
        marginTop: 12,
        borderRadius: 8,
        backgroundColor: Colors.yellow[50],
    },
    redeemModalContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center"
    }
})