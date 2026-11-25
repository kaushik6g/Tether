import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

export type Appearance = 'system' | 'light' | 'dark';
const key = 'tether.appearance';

const AppearanceContext = createContext<{
  preference: Appearance; dark: boolean; save: (value: Appearance) => Promise<void>;
} | null>(null);

export function AppearanceProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [preference, setPreference] = useState<Appearance>('system');
  const saveRevision = useRef(0);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    const revision = saveRevision.current;
    void AsyncStorage.getItem(key).then((value) => {
      if (active && revision === saveRevision.current && (value === 'light' || value === 'dark')) {
        setPreference(value);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  async function save(value: Appearance) {
    saveRevision.current++;
    const write = writes.current.then(async () => {
      await AsyncStorage.setItem(key, value);
      setPreference(value);
    });
    writes.current = write.catch(() => {});
    await write;
  }

  const dark = preference === 'system' ? system === 'dark' : preference === 'dark';
  return <AppearanceContext.Provider value={{ preference, dark, save }}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const appearance = useContext(AppearanceContext);
  if (!appearance) throw new Error('Appearance provider is missing.');
  return appearance;
}
