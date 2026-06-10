"use client";

import { useCallback, useEffect, useState } from "react";

export interface LocalRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

function read<T extends LocalRecord>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T extends LocalRecord>(key: string, items: T[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* noop */
  }
}

export function useLocalStore<T extends LocalRecord>(key: string, seed: T[] = []) {
  const [items, setItems] = useState<T[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const existing = read<T>(key);
    if (existing.length === 0 && seed.length > 0) {
      write(key, seed);
      setItems(seed);
    } else {
      setItems(existing);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const persist = useCallback(
    (next: T[]) => {
      setItems(next);
      write(key, next);
    },
    [key]
  );

  const create = useCallback(
    (data: Partial<T>) => {
      const now = new Date().toISOString();
      const record = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data,
      } as T;
      persist([record, ...items]);
      return record;
    },
    [items, persist]
  );

  const update = useCallback(
    (id: string, patch: Partial<T>) => {
      persist(
        items.map((it) =>
          it.id === id ? ({ ...it, ...patch, updatedAt: new Date().toISOString() } as T) : it
        )
      );
    },
    [items, persist]
  );

  const remove = useCallback(
    (id: string) => {
      persist(items.filter((it) => it.id !== id));
    },
    [items, persist]
  );

  const reset = useCallback(() => persist(seed), [persist, seed]);

  return { items, ready, create, update, remove, reset, setItems: persist };
}
