import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';

import { Palette } from '@/constants/palette';
import { useVaultStore } from '@/store/use-vault-store';

export default function Index() {
  const hydrated = useVaultStore((s) => s.hydrated);
  const onboarded = useVaultStore((s) => s.onboarded);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.bg }}>
        <ActivityIndicator color={Palette.accent} />
      </View>
    );
  }
  return <Redirect href={onboarded ? '/dashboard' : '/onboarding'} />;
}
