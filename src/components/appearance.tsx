import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

export type Appearance = 'system' | 'light' | 'dark';
const key = 'tether.appearance';

const AppearanceContext = createContext<{
  preference: Appearance; dark: boolean; save: (value: Appearance) => Promise<void>;
} | null>(null);

export function AppearanceProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [preference, setPreference] = useState<Appearance>('system');
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(key).then((value) => {
      if (active && (value === 'light' || value === 'dark')) {
        setPreference((current) => current === 'system' ? value : current);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  async function save(value: Appearance) {
    await AsyncStorage.setItem(key, value);
    setPreference(value);
  }

  const dark = preference === 'system' ? system === 'dark' : preference === 'dark';
  return <AppearanceContext.Provider value={{ preference, dark, save }}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const appearance = useContext(AppearanceContext);
  if (!appearance) throw new Error('Appearance provider is missing.');
  return appearance;
}
