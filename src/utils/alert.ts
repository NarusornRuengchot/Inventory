import { Platform, Alert } from 'react-native';

interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export const customAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[]
) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 0) {
      if (buttons.length > 1) {
        // Multi-button dialog (e.g. Cancel and Confirm/Approve/Delete)
        const cancelBtn = buttons.find((b) => b.style === 'cancel' || b.text?.toLowerCase() === 'cancel' || b.text?.toLowerCase() === 'ยกเลิก');
        const confirmBtn = buttons.find((b) => b !== cancelBtn);

        const result = window.confirm(`${title}${message ? '\n\n' + message : ''}`);
        if (result) {
          if (confirmBtn && confirmBtn.onPress) confirmBtn.onPress();
        } else {
          if (cancelBtn && cancelBtn.onPress) cancelBtn.onPress();
        }
      } else {
        // Single button dialog (e.g. OK success alert)
        window.alert(`${title}${message ? '\n\n' + message : ''}`);
        if (buttons[0].onPress) buttons[0].onPress();
      }
    } else {
      // Basic alert with no button callbacks
      window.alert(`${title}${message ? '\n\n' + message : ''}`);
    }
  } else {
    // On native iOS/Android, use standard React Native Alert
    Alert.alert(title, message, buttons);
  }
};
