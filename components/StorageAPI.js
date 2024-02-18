import AsyncStorage from '@react-native-async-storage/async-storage';

const storeData = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
  }
};

const readData = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value
  } catch (error) {
  }
};

export { storeData, readData };