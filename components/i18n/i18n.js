import { Platform } from 'react-native';
import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import { translations } from "./supportedLanguages";

const i18n = new I18n(translations);

if (Platform.OS === 'ios') {
  console.log('Run on iOS');
  i18n.locale = getLocales()[0].languageCode;
} else if (Platform.OS === 'andriod') {
  console.log('Run on android');
  i18n.locale = getLocales()[0].languageCode;
} else {
  console.log('Run on Web');
  i18n.locale = 'ja';
}
i18n.fallbacks = true;
i18n.defaultLocale = 'ja';

export default i18n;