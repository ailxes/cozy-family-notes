import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HouseholdInfo {
  id: string;
  name: string;
  role: string;
}

export interface HouseholdMember {
  user_id: string;
  role: string;
  full_name: string | null;
  email: string;
}

export interface HouseholdInvite {
  id: string;
  email: string;
  created_at: string;
}

export function useHousehold(userId: string | undefined) {
  return useQuery({
    queryKey: ["household", userId],
    enabled: !!userId,
    queryFn: async (): Promise<HouseholdInfo | null> => {
      const { data, error } = await supabase
        .from("household_members")
        .select("role, household_id, households!inner(id, name)")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      // @ts-expect-error nested
      return { id: data.households.id, name: data.households.name, role: data.role };
    },
  });
}

export function useHouseholdMembers(householdId: string | undefined) {
  return useQuery({
    queryKey: ["household-members", householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<HouseholdMember[]> => {
      const { data: members, error } = await supabase
        .from("household_members")
        .select("user_id, role")
        .eq("household_id", householdId!);
      if (error) throw error;
      const ids = members.map((m) => m.user_id);
      if (ids.length === 0) return [];
      const { data: profiles, error: e2 } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", ids);
      if (e2) throw e2;
      return members.map((m) => {
        const p = profiles?.find((p) => p.id === m.user_id);
        return {
          user_id: m.user_id,
          role: m.role,
          email: p?.email ?? "",
          full_name: p?.full_name ?? null,
        };
      });
    },
  });
}

export function useHouseholdInvites(householdId: string | undefined) {
  return useQuery({
    queryKey: ["household-invites", householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<HouseholdInvite[]> => {
      const { data, error } = await supabase
        .from("household_invites")
        .select("id, email, created_at")
        .eq("household_id", householdId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}
