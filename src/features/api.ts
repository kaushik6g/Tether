import { supabase } from '@/lib/supabase';

export type ActiveInvite = { token: string; expires_at: string };
export type Friend = { friend_id: string; display_name: string };
export type Match = { id: string; display_name: string; created_at: string; closed_at: string | null; closed_reason: 'connection_ended' | null };
export type Message = { id: string; sender_id: string | null; body: string; created_at: string };

export function client() {
  if (!supabase) throw new Error('Tether is unavailable.');
  return supabase;
}

export async function rpc<T>(name: string, args?: Record<string, string | number | null>): Promise<T> {
  const { data, error } = await client().rpc(name, args);
  if (error) throw error;
  return data as T;
}

export async function profileName(userId: string) {
  const { data, error } = await client().from('profiles').select('display_name').eq('id', userId).maybeSingle();
  if (error) throw error;
  return (data?.display_name as string | undefined) ?? '';
}

export async function saveProfile(userId: string, name: string) {
  const { error } = await client().from('profiles').upsert({ id: userId, display_name: name.trim() });
  if (error) throw error;
}

export function removeFriend(friend: string) { return rpc<void>('remove_circle_friend', { friend }); }
export function blockFriend(friend: string) { return rpc<void>('block_circle_friend', { friend }); }
export function listBlockedFriends() { return rpc<Friend[]>('list_circle_blocks'); }
export function unblockFriend(friend: string) { return rpc<void>('unblock_circle_friend', { friend }); }
export function deleteMyAccount() { return rpc<void>('delete_my_account'); }
export function listCircle() { return rpc<Friend[]>('list_circle'); }
export function listActiveInvites() { return rpc<ActiveInvite[]>('list_active_circle_invites'); }
export function revokeInvite(token: string) { return rpc<boolean>('revoke_circle_invite', { invite_token: token }); }
export function createInvite() { return rpc<string>('create_circle_invite'); }
export function previewInvite(token: string) { return rpc<string | null>('preview_circle_invite', { invite_token: token }); }
export function acceptInvite(token: string) { return rpc<void>('accept_circle_invite', { invite_token: token }); }
export function tapFriend(friend: string) { return rpc<string | null>('tap_friend', { friend }); }
export function listMatches() { return rpc<Match[]>('list_catchups'); }
export function sendMessage(match: string, message: string) {
  return rpc<void>('send_match_message', { match, message });
}
export function closeMatch(match: string) { return rpc<void>('close_match', { match }); }

export type MessagePage = { messages: Message[]; hasMore: boolean };
const messagePageSize = 40;

export async function listMessagePage(match: string, before?: Message): Promise<MessagePage> {
  const rows = await rpc<Message[]>('list_match_message_page', {
    target_match: match,
    before_at: before?.created_at ?? null,
    before_id: before?.id ?? null,
  });
  return { messages: rows.slice(0, messagePageSize).reverse(), hasMore: rows.length > messagePageSize };
}

export function errorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
}
