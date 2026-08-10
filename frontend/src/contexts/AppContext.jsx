import React, { createContext, useContext, useEffect, useState } from "react";
import { apiGet } from "../api/client";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [info, setInfo] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [i, h] = await Promise.all([apiGet("/info"), apiGet("/health")]);
        setInfo(i.data);
        setHealth(h.data);
      } catch (e) {
        setHealth({ status: "offline", error: String(e) });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AppContext.Provider value={{ info, health, loading, refresh: () => {} }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
