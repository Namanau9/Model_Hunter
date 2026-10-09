import { useCallback, useEffect, useRef, useState } from "react";
import { apiGet } from "../api/client";
import { useApp } from "../contexts/AppContext";
import { errorMessage } from "../lib/errors";

/**
 * GET an API path, re-fetching whenever the global refresh tick changes.
 * `select(envelope)` maps the response envelope to the data a page needs.
 */
export default function useApiGet(path, select = (r) => r.data) {
  const { tick } = useApp();
  const selectRef = useRef(select);
  selectRef.current = select;
  const [state, setState] = useState({ data: null, loading: true, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const r = await apiGet(path);
      setState({ data: selectRef.current(r), loading: false, error: null });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: errorMessage(e) }));
    }
  }, [path]);

  useEffect(() => {
    load();
  }, [load, tick]);

  return { ...state, reload: load };
}
