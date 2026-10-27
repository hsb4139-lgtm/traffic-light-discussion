"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "./supabase/client";
import { makeJoinCode } from "./codes";
import type { ClassRow } from "./types";

/** 선생님의 학급(대부분 1개). 없으면 null */
export function useMyClass() {
  const [cls, setCls] = useState<ClassRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await createClient()
      .from("sd_classes")
      .select("id, name, join_code, created_at")
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (error) setError(error.message);
    setCls((data as ClassRow | null) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 처음 한 번 불러오기
    load();
  }, [load]);

  const createClass = useCallback(
    async (name: string) => {
      const supabase = createClient();
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      for (let i = 0; i < 5; i++) {
        const { error } = await supabase
          .from("sd_classes")
          .insert({ name, join_code: makeJoinCode(), teacher_id: u.user.id });
        if (!error) break;
        if (!error.message.includes("join_code")) {
          setError(error.message);
          return;
        }
      }
      await load();
    },
    [load],
  );

  return { cls, loading, error, reload: load, createClass };
}
