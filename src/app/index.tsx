import { View } from 'react-native';
import { Redirect } from 'expo-router';

import { Color } from '@/constants/theme';
import { useVaultStore } from '@/store/use-vault-store';

export default function Index() {
  const authReady = useVaultStore((s) => s.authReady);
  const session = useVaultStore((s) => s.session);
  const hydrated = useVaultStore((s) => s.hydrated);
  const onboarded = useVaultStore((s) => s.onboarded);

  if (!authReady || (session && !hydrated)) {
    return <View style={{ flex: 1, backgroundColor: Color.paper }} />;
  }
  if (!session) return <Redirect href="/auth" />;
  return <Redirect href={onboarded ? '/dashboard' : '/onboarding'} />;
}
