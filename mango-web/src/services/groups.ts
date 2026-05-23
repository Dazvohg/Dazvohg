import { supabase } from "./supabase";
import type { GroupExpense, GroupMember, SharedGroup } from "../domain/types";

// ── Groups ────────────────────────────────────────────────────────────────────

export async function createGroup(name: string, displayName: string): Promise<SharedGroup | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: group, error } = await supabase
    .from("shared_groups")
    .insert({ name: name.trim(), created_by: user.id })
    .select()
    .single();

  if (error || !group) return null;

  // Creator also joins as member
  await supabase.from("group_members").insert({
    group_id: group.id,
    user_id: user.id,
    display_name: displayName.trim(),
  });

  return group as SharedGroup;
}

export async function joinGroupByToken(token: string, displayName: string): Promise<SharedGroup | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: group } = await supabase
    .from("shared_groups")
    .select()
    .eq("invite_token", token)
    .single();

  if (!group) return null;

  await supabase.from("group_members").upsert(
    { group_id: group.id, user_id: user.id, display_name: displayName.trim() },
    { onConflict: "group_id,user_id" }
  );

  return group as SharedGroup;
}

export async function getMyGroup(userId: string): Promise<SharedGroup | null> {
  if (!supabase) return null;

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(1)
    .single();

  if (!membership) return null;

  const { data: group } = await supabase
    .from("shared_groups")
    .select()
    .eq("id", membership.group_id)
    .single();

  return (group as SharedGroup) ?? null;
}

export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);
}

// ── Members ───────────────────────────────────────────────────────────────────

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("group_members")
    .select()
    .eq("group_id", groupId)
    .order("joined_at");
  return (data as GroupMember[]) ?? [];
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function getGroupExpenses(groupId: string): Promise<GroupExpense[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("group_expenses")
    .select()
    .eq("group_id", groupId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  return (data as GroupExpense[]) ?? [];
}

export async function addGroupExpense(
  groupId: string,
  expense: Omit<GroupExpense, "id" | "group_id" | "added_by" | "created_at">
): Promise<GroupExpense | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("group_expenses")
    .insert({ ...expense, group_id: groupId, added_by: user.id })
    .select()
    .single();

  return (data as GroupExpense) ?? null;
}

export async function deleteGroupExpense(expenseId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("group_expenses").delete().eq("id", expenseId);
}

// ── Balance ───────────────────────────────────────────────────────────────────

export type MemberBalance = {
  userId: string;
  displayName: string;
  paid: number;       // lo que puso
  fairShare: number;  // lo que debería poner (total / N)
  balance: number;    // paid - fairShare (pos = le deben, neg = debe)
};

export function computeBalance(
  members: GroupMember[],
  expenses: GroupExpense[]
): MemberBalance[] {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const fairShare = members.length > 0 ? total / members.length : 0;

  return members.map((m) => {
    const paid = expenses
      .filter((e) => e.added_by === m.user_id)
      .reduce((s, e) => s + e.amount, 0);
    return {
      userId:      m.user_id,
      displayName: m.display_name,
      paid,
      fairShare,
      balance: paid - fairShare,
    };
  });
}
