import { Colors } from '@/constants/theme';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';


type ModalScreenProps = {
  name: string;
  children?: React.ReactNode;
};

export default function ModalScreen({ name, children }: ModalScreenProps) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.grey[500] }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 80, backgroundColor: Colors.grey[500] }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
        {/* <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link">Go to home screen</ThemedText>
      </Link> */}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
