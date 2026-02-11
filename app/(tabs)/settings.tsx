import { Colors } from "@/constants/theme";
import { exportBackup } from "@/db/export";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 22, fontWeight: "700", color: Colors.yellow[100] }}>
                    Settings
                </Text>
            </View>
            <Pressable onPress={() => { exportBackup() }} style={{ padding: 12, backgroundColor: Colors.grey[300], borderRadius: 8, marginTop:32 }}>
                <Text style={{ color: Colors.yellow[100], fontWeight: "600" }}>Export Data</Text>
            </Pressable>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        backgroundColor: Colors.grey[400],
    },
})