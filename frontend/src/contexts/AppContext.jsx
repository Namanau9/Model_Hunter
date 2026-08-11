import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { apiGet } from "../api/client";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [info, setInfo] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  // Incrementing tick lets any page re-fetch its own data when a refresh occurs.
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [i, h] = await Promise.all([apiGet("/info"), apiGet("/health")]);
      setInfo(i.data);
      setHealth(h.data);
    } catch (e) {
      setHealth({ status: "offline", error: String(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setTick((t) => t + 1);
    await load();
  }, [load]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppContext.Provider value={{ info, health, loading, refresh, tick }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
