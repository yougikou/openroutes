import AsyncStorage from '@react-native-async-storage/async-storage';

const isWeb = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const resolveStorage = (persistent = true) => {
  if (!isWeb) {
    return null;
  }

  try {
    return persistent ? window.localStorage : window.sessionStorage;
  } catch (error) {
    console.error('Error accessing web storage', error);
    return null;
  }
};

const storeData = async (key, value, options = {}) => {
  const { persistent = true } = options;
  try {
    if (isWeb) {
      const storage = resolveStorage(persistent);
      if (!storage) {
        return;
      }
      if (value === undefined || value === null) {
        storage.removeItem(key);
      } else {
        storage.setItem(key, value);
      }
      return;
    }

    if (value === undefined || value === null) {
      await AsyncStorage.removeItem(key);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  } catch (error) {
    console.error('Error storing the data', error);
  }
};

const readData = async (key, options = {}) => {
  const { persistent = true } = options;
  try {
    if (isWeb) {
      const storage = resolveStorage(persistent);
      if (!storage) {
        return null;
      }
      return storage.getItem(key);
    }

    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error('Error reading the data', error);
    return null;
  }
};

const deleteData = async (key, options = {}) => {
  const { persistent = true } = options;
  try {
    if (isWeb) {
      const storage = resolveStorage(persistent);
      if (!storage) {
        return;
      }
      storage.removeItem(key);
      return;
    }

    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error deleting the data', error);
  }
};

export { storeData, readData, deleteData };
