import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AccountPage, accountStyles, useAccountColors } from '@/components/account-ui';
import { Action, Field, Problem } from '@/components/feature-ui';
import { errorMessage, listMatches } from '@/features/api';
import { catchupId } from '@/features/catchup-id';
import { listMatchPlans, suggestPlan } from '@/features/plans';
import { formatPlanTime, localPlanFields, localTimeZone, parseLocalPlanTime } from '@/features/plan-time';

export default function ProposePlanScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = catchupId(params.id);
  const colors = useAccountColors();
  if (!id) return <AccountPage><Text style={{ color: colors.text }}>This catch-up is unavailable.</Text></AccountPage>;
  return <ProposalForm key={id} id={id} />;
}

function ProposalForm({ id }: { id: string }) {
  const colors = useAccountColors();
  const router = useRouter();
  const submitting = useRef(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState<{ day: string; time: string; duration: string; place: string; note: string }>();
  const [expected, setExpected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void Promise.all([listMatches(), listMatchPlans(id)]).then(([matches, plans]) => {
      if (!active) return;
      if (!matches.some((match) => match.id === id && !match.closed_at)) {
        setError('This catch-up is closed or unavailable.');
        return;
      }
      const pending = plans.find((plan) => plan.status === 'pending');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(18, 0, 0, 0);
      const suggested = pending && new Date(pending.starts_at).getTime() > Date.now()
        ? new Date(pending.starts_at) : tomorrow;
      setExpected(pending?.id ?? null);
      setDraft({
        ...localPlanFields(suggested),
        duration: String(pending?.duration_minutes ?? 60),
        place: pending?.place ?? '',
        note: pending?.note ?? '',
      });
    }).catch(() => {
      if (active) {
        setLoadFailed(true);
        setError('Could not open this catch-up.');
      }
    });
    return () => { active = false; };
  }, [id, loadAttempt]);

  function chooseDay(offset: number) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    setDraft((current) => current ? { ...current, day: localPlanFields(date).day } : current);
  }

  const preview = draft ? parseLocalPlanTime(draft.day, draft.time) : null;

  async function submit() {
    if (!draft || submitting.current) return;
    const startsAt = parseLocalPlanTime(draft.day, draft.time);
    if (!startsAt || startsAt.getTime() <= Date.now()) {
      setError('Enter a valid future date and time in the formats shown.');
      return;
    }
    const minutes = Number(draft.duration);
    if (!/^\d{2,3}$/.test(draft.duration.trim()) || minutes < 15 || minutes > 240) {
      setError('Enter a whole number from 15 to 240 minutes.');
      return;
    }

    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      await suggestPlan(id, expected, { startsAt, minutes, place: draft.place.trim(), note: draft.note.trim() });
      router.replace({ pathname: '/chat/[id]', params: { id } });
    } catch (failure) {
      setError(errorMessage(failure, 'Could not send your proposal. Try again.'));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <AccountPage>
      <Link href={{ pathname: '/chat/[id]', params: { id } }} replace
        style={[accountStyles.link, { color: colors.secondary }]}>Back to chat</Link>
      <Text accessibilityRole="header" style={[accountStyles.title, { color: colors.text }]}>
        {expected ? 'Suggest another plan' : 'Suggest a plan'}
      </Text>
      {!draft && !error && <Text style={{ color: colors.secondary }}>Loading.</Text>}
      {draft && (
        <>
          <Text style={{ color: colors.secondary }}>Your time zone is {localTimeZone()}.</Text>
          <View style={styles.quickChoices}>
            <Action title="Today" disabled={busy} onPress={() => chooseDay(0)} />
            <Action title="Tomorrow" disabled={busy} onPress={() => chooseDay(1)} />
          </View>
          <View style={styles.field}>
            <Text style={{ color: colors.text }}>Date (YYYY-MM-DD)</Text>
            <Field accessibilityLabel="Date, year month day" value={draft.day} maxLength={10} editable={!busy}
              onChangeText={(day) => setDraft({ ...draft, day })} />
          </View>
          <View style={styles.field}>
            <Text style={{ color: colors.text }}>Time (24-hour HH:MM)</Text>
            <Field accessibilityLabel="Time in 24-hour format" value={draft.time} maxLength={5} editable={!busy}
              onChangeText={(time) => setDraft({ ...draft, time })} />
          </View>
          <View style={styles.field}>
            <Text style={{ color: colors.text }}>Duration in minutes</Text>
            <Field accessibilityLabel="Duration in minutes" keyboardType="number-pad" value={draft.duration}
              maxLength={3} editable={!busy} onChangeText={(duration) => setDraft({ ...draft, duration })} />
            <View style={styles.quickChoices}>
              {[30, 60, 90].map((minutes) => (
                <Action key={minutes} title={minutes + ' min'} disabled={busy || draft.duration === String(minutes)}
                  onPress={() => setDraft({ ...draft, duration: String(minutes) })} />
              ))}
            </View>
          </View>
          <View style={styles.field}>
            <Text style={{ color: colors.text }}>Place (optional)</Text>
            <Field accessibilityLabel="Place" value={draft.place} maxLength={200} editable={!busy}
              onChangeText={(place) => setDraft({ ...draft, place })} />
          </View>
          <View style={styles.field}>
            <Text style={{ color: colors.text }}>Note (optional)</Text>
            <Field accessibilityLabel="Note" value={draft.note} maxLength={500} editable={!busy} multiline
              onChangeText={(note) => setDraft({ ...draft, note })} />
          </View>
          {preview && <Text style={{ color: colors.secondary }}>Proposed start: {formatPlanTime(preview.toISOString())}</Text>}
          <Action title={busy ? 'Sending proposal' : 'Send proposal'} disabled={busy} onPress={submit} />
        </>
      )}
      {error ? <Problem message={error} /> : null}
      {loadFailed && <Action title="Retry loading proposal" onPress={() => {
        setLoadFailed(false);
        setError('');
        setLoadAttempt((attempt) => attempt + 1);
      }} />}
    </AccountPage>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  quickChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
