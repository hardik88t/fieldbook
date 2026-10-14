import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { RouteHeader } from '@/components/route/RouteHeader';
import { RouteNotice } from '@/components/route/RouteNotice';
import { RouteProgress } from '@/components/route/RouteProgress';
import { StopTimeline } from '@/components/route/StopTimeline';
import { summarizeRoute } from '@/components/route/summary';
import type { StopView } from '@/domain/types';
import { useActiveCustomer, useConnectivity, useSync, useTodayStops } from '@/state';
import { colors, PAGE_GUTTER, space } from '@/theme';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Today's route: greeting, progress, the stop timeline and the "Start visit" card. */
export default function RouteScreen() {
  const router = useRouter();
  const stops = useTodayStops();
  const { startVisit } = useActiveCustomer();
  const { online } = useConnectivity();
  const { pendingCount } = useSync();
  const [busyCustomerId, setBusyCustomerId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

  const now = new Date();
  const list = stops.data ?? [];
  const summary = summarizeRoute(list);

  async function handleStart(stop: StopView) {
    setStartError(null);
    setBusyCustomerId(stop.customerId);
    try {
      await startVisit(stop.customerId);
      router.push('/catalogue');
    } catch (error) {
      setStartError(`Could not start the visit. ${messageOf(error)}`);
    } finally {
      setBusyCustomerId(null);
    }
  }

  let body: ReactNode;
  if (stops.loading) {
    body = (
      <View style={styles.loading} accessible accessibilityLabel="Loading today's route">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  } else if (stops.error && list.length === 0) {
    body = (
      <RouteNotice
        title="Could not load today's route"
        body={stops.error.message}
        actionLabel="Try again"
        onAction={stops.refresh}
        alert
      />
    );
  } else if (list.length === 0) {
    body = (
      <RouteNotice title="No stops today" body="Nothing is planned on your route for today." />
    );
  } else {
    body = (
      <>
        {stops.error ? (
          <RouteNotice
            title="Route may be out of date"
            body={stops.error.message}
            actionLabel="Try again"
            onAction={stops.refresh}
            alert
          />
        ) : null}
        <StopTimeline
          stops={list}
          currentId={summary.currentId}
          now={now}
          busyCustomerId={busyCustomerId}
          startError={startError}
          onStartVisit={handleStart}
        />
      </>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <RouteHeader now={now} />
      <RouteProgress summary={summary} online={online} pendingCount={pendingCount} />
      {body}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: PAGE_GUTTER,
    paddingTop: space.lg,
    paddingBottom: space.xxxl,
    gap: space.lg,
  },
  loading: {
    paddingVertical: space.xxxl,
    alignItems: 'center',
  },
});
