import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export const downloadFile = async (data: string, filename: string, mimeType: string): Promise<void> => {
  if (Platform.OS === 'web') {
    const blob = new Blob([data], { type: mimeType });
    const href = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(href);
  } else {
    try {
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, data, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: mimeType,
          dialogTitle: `Download ${filename}`
        });
      } else {
        console.warn("Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Error saving/sharing file:", error);
    }
  }
};
