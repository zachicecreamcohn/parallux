import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ProjectData } from '../shared/interfaces';

interface StoreContextType {
  data: ProjectData;
  set: <K extends keyof ProjectData>(key: K, value: ProjectData[K]) => void;
  remove: <K extends keyof ProjectData>(key: K) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [storeData, setStoreData] = useState<ProjectData | null>(null);

  useEffect(() => {
    window.api.store.getAll().then((allData) => {
      setStoreData(allData);
    });

    const unsubscribe = window.api.store.onUpdate((update) => {
      setStoreData((prev) => {
        if (!prev) return null;
        return { ...prev, [update.key]: update.value };
      });
    });

    return () => unsubscribe();
  }, []);

  const setStoreValue = <K extends keyof ProjectData>(key: K, value: ProjectData[K]) => {
    setStoreData((prev) => (prev ? { ...prev, [key]: value } : null));
    window.api.store.set(key, value);
  };

  const removeStoreValue = <K extends keyof ProjectData>(key: K) => {
    // We can't really "delete" a key from the interface type,
    // but we can set it to undefined or handle it logic-wise.
    // Usually, you just trigger the backend delete.
    window.api.store.delete(key);
    // Note: The onUpdate listener above will catch the change and update React
  };

  // Block rendering until data is loaded
  if (!storeData) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <StoreContext.Provider value={{ data: storeData, set: setStoreValue, remove: removeStoreValue }}>
      {children}
    </StoreContext.Provider>
  );
};

// --- THE NEW HOOK ---
// This replaces your old useStore hook entirely.
export function useStore<K extends keyof ProjectData>(key: K) {
  const context = useContext(StoreContext);

  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }

  const value = context.data[key];

  // Create stable setter functions
  const setValue = (val: ProjectData[K]) => context.set(key, val);
  const removeValue = () => context.remove(key);

  return [value, setValue, removeValue] as const;
}
