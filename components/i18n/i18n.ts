import { Platform } from 'react-native';
import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import { translations, type SupportedLocale } from './supportedLanguages';

const DEFAULT_LOCALE: SupportedLocale = 'ja';

const i18n = new I18n(translations);
i18n.enableFallback = true;
i18n.defaultLocale = DEFAULT_LOCALE;

const locales = getLocales();
const deviceLocale = locales[0]?.languageCode?.toLowerCase() as SupportedLocale | undefined;

if (Platform.OS === 'ios' || Platform.OS === 'android') {
  if (deviceLocale && translations[deviceLocale]) {
    i18n.locale = deviceLocale;
  } else {
    i18n.locale = DEFAULT_LOCALE;
  }
} else {
  i18n.locale = DEFAULT_LOCALE;
}

export default i18n;
