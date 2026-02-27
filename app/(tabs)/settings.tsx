import { Colors, Radii, Shadows, Spacing } from "@/constants/theme";
import { exportBackup } from "@/db/export";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.headerText}>
                    Settings
                </Text>
            </View>
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Data</Text>
                <Text style={styles.cardSubtitle}>Export your backup as a JSON file you can store in iCloud or Files.</Text>
                <Pressable onPress={() => { exportBackup() }} style={styles.exportButton}>
                    <Text style={styles.exportButtonText}>Export Data</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: Spacing.lg,
        backgroundColor: Colors.ui.background,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerText: {
        fontSize: 30,
        fontWeight: "800",
        letterSpacing: 0.3,
        color: Colors.ui.textPrimary,
    },
    card: {
        marginTop: Spacing.xl,
        borderRadius: Radii.lg,
        padding: Spacing.lg,
        backgroundColor: Colors.ui.surface,
        borderWidth: 1,
        borderColor: Colors.ui.border,
        ...Shadows.card,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: Colors.ui.textPrimary,
    },
    cardSubtitle: {
        marginTop: Spacing.sm,
        fontSize: 14,
        color: Colors.ui.textSecondary,
    },
    exportButton: {
        marginTop: Spacing.lg,
        paddingVertical: 12,
        borderRadius: Radii.md,
        backgroundColor: Colors.ui.accent,
        alignItems: "center",
        ...Shadows.glow,
    },
    exportButtonText: {
        color: Colors.ui.background,
        fontWeight: "800",
    },
})
