import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from './i18n';
import { SupportedLocale } from './supportedLanguages';

type LanguageContextType = {
  locale: SupportedLocale;
  changeLanguage: (locale: SupportedLocale) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<SupportedLocale>(i18n.locale as SupportedLocale);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLocale = await AsyncStorage.getItem('user-language');
        if (savedLocale) {
          i18n.locale = savedLocale;
          setLocale(savedLocale as SupportedLocale);
        }
      } catch (e) {
        console.error('Failed to load language', e);
      } finally {
        setIsLoaded(true);
      }
    };

    loadLanguage();
  }, []);

  const changeLanguage = async (newLocale: SupportedLocale) => {
    i18n.locale = newLocale;
    setLocale(newLocale);
    await AsyncStorage.setItem('user-language', newLocale);
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ locale, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
