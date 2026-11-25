import { Problem } from '@/components/feature-ui';
import { supabase } from '@/lib/supabase';

export function AccountUnavailable() {
  return supabase ? null : <Problem message="Account access is unavailable in this build." />;
}
