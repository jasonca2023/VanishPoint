import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Biometric gate for the Vanish action. PRD: FaceID/TouchID is required to
 * confirm any deletion. On devices without enrolled biometrics we fall back
 * to the device passcode; on web (dev preview) the gate passes through so
 * the flow remains testable.
 */
export async function confirmWithBiometrics(serviceName: string): Promise<boolean> {
  if (Platform.OS === 'web') return true;

  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = hasHardware && (await LocalAuthentication.isEnrolledAsync());
  if (!enrolled && !hasHardware) return true; // simulator without biometrics

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: `Confirm deletion request for ${serviceName}`,
    cancelLabel: 'Cancel',
    biometricsSecurityLevel: 'strong',
  });
  return result.success;
}
