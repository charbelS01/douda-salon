import { Platform } from "react-native";

// Web fallback using localStorage, native uses AsyncStorage
const webStorage = {
  getItem: async (key: string): Promise<string | null> => {
    return localStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    localStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    localStorage.removeItem(key);
  },
};

let storage: typeof webStorage;

if (Platform.OS === "web") {
  storage = webStorage;
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AsyncStorage =
    require("@react-native-async-storage/async-storage").default;
  storage = {
    getItem: (key: string) => AsyncStorage.getItem(key),
    setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
    removeItem: (key: string) => AsyncStorage.removeItem(key),
  };
}

export default storage;
