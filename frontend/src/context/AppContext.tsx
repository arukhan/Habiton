"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API, ApiError } from "@/lib/api";
import type { Habit, Insights, Recovery, User } from "@/types";

type Store = {
  user: User | null;
  habits: Habit[];
  recoveries: Recovery[];
  insights: Insights | null;
  insightsError: string;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  setError: (message: string) => void;
  login: (email: string, password: string) => Promise<void>;
  loginWithCode: (email: string, code: string) => Promise<void>;
  register: (name: string, email: string, password: string, code?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (body: { name?: string; hero_class?: string }) => Promise<void>;
};

const Context = createContext<Store | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightsError, setInsightsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);

  const invalidateRequests = useCallback(() => {
    requestVersion.current++;
  }, []);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    const { user } = await API.me();
    if (version !== requestVersion.current) return;
    setUser(user);
    setInsightsError("");

    void API.insights()
      .then((data) => {
        if (version === requestVersion.current) setInsights(data);
      })
      .catch((error: unknown) => {
        if (version === requestVersion.current) {
          setInsightsError(error instanceof Error ? error.message : "Could not load insights");
        }
      });

    const [habitList, recoveryList] = await Promise.all([API.habits(), API.recoveries()]);
    if (version === requestVersion.current) {
      setHabits(habitList.habits);
      setRecoveries(recoveryList.recoveries);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    refresh()
      .catch((error: unknown) => {
        if (!cancelled && !(error instanceof ApiError && error.status === 401)) {
          setError(String(error));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      invalidateRequests();
    };
  }, [invalidateRequests, refresh]);

  async function login(email: string, password: string) {
    setError("");
    const result = await API.login(email, password);
    setUser(result.user);
    await refresh();
    router.push("/today");
  }

  async function loginWithCode(email: string, code: string) {
    setError("");
    const result = await API.loginWithCode(email, code);
    setUser(result.user);
    await refresh();
    router.push("/today");
  }

  async function register(name: string, email: string, password: string, code?: string) {
    setError("");
    const result = await API.register(name, email, password, code);
    setUser(result.user);
    await refresh();
    router.push("/habits/new");
  }

  async function logout() {
    await API.logout();
    invalidateRequests();
    setInsightsError("");
    setUser(null);
    setHabits([]);
    setRecoveries([]);
    setInsights(null);
    router.replace("/login");
  }

  async function updateProfile(body: { name?: string; hero_class?: string }) {
    const result = await API.updateProfile(body);
    setUser(result.user);
  }

  return (
    <Context.Provider value={{
      user, habits, recoveries, insights, insightsError, loading, error,
      refresh, setError, login, loginWithCode, register, logout, updateProfile,
    }}>
      {children}
    </Context.Provider>
  );
}

export function useHabiton() {
  const store = useContext(Context);
  if (!store) throw new Error("AppProvider missing");
  return store;
}
