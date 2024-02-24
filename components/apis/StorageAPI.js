import AsyncStorage from '@react-native-async-storage/async-storage';

const storeData = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.error("Error storing the data", error);
  }
};

const readData = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value
  } catch (error) {
    console.error("Error reading the data", error);
  }
};

const deleteData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error("Error deleting the data", error);
  }
};


export { storeData, readData, deleteData };