"use client";

import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        setStoredValue(JSON.parse(item) as T);
      }
    } catch {
      setStoredValue(initialValue);
    } finally {
      setIsLoaded(true);
    }
  }, [initialValue, key]);

  function setValue(value: T | ((currentValue: T) => T)) {
    setStoredValue((currentValue) => {
      const nextValue =
        value instanceof Function ? value(currentValue) : value;

      window.localStorage.setItem(key, JSON.stringify(nextValue));
      return nextValue;
    });
  }

  return [storedValue, setValue, isLoaded] as const;
}
