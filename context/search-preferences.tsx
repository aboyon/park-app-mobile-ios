import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = '@park_app_search_prefs';

type SearchPreferencesValue = {
  inDayTimes: boolean;
  onlyOperatives: boolean;
  setInDayTimes: (value: boolean) => void;
  setOnlyOperatives: (value: boolean) => void;
};

const SearchPreferencesContext = createContext<SearchPreferencesValue>({
  inDayTimes: false,
  onlyOperatives: false,
  setInDayTimes: () => {},
  setOnlyOperatives: () => {},
});

export function SearchPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [inDayTimes, setInDayTimesState] = useState(false);
  const [onlyOperatives, setOnlyOperativesState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!stored) return;
      try {
        const parsed = JSON.parse(stored);
        if (typeof parsed.inDayTimes === 'boolean') setInDayTimesState(parsed.inDayTimes);
        if (typeof parsed.onlyOperatives === 'boolean') setOnlyOperativesState(parsed.onlyOperatives);
      } catch {}
    });
  }, []);

  const persist = (next: { inDayTimes: boolean; onlyOperatives: boolean }) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const setInDayTimes = (value: boolean) => {
    setInDayTimesState(value);
    persist({ inDayTimes: value, onlyOperatives });
  };

  const setOnlyOperatives = (value: boolean) => {
    setOnlyOperativesState(value);
    persist({ inDayTimes, onlyOperatives: value });
  };

  return (
    <SearchPreferencesContext.Provider value={{ inDayTimes, onlyOperatives, setInDayTimes, setOnlyOperatives }}>
      {children}
    </SearchPreferencesContext.Provider>
  );
}

export function useSearchPreferences(): SearchPreferencesValue {
  return useContext(SearchPreferencesContext);
}
