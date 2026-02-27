import { Colors, Spacing } from '@/constants/theme';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';


type ModalScreenProps = {
  name: string;
  children?: React.ReactNode;
};

export default function ModalScreen({ name, children }: ModalScreenProps) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.ui.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          padding: Spacing.lg,
          paddingBottom: 80,
          backgroundColor: Colors.ui.background,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
