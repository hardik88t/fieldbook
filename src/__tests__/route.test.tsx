import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Text } from 'react-native';

import RouteScreen from '@/app/(tabs)/route';
import { BootGate } from '@/components/BootGate';
import { AppProvider, useActiveCustomer } from '@/state';
import { FakeTransport } from '@/sync/fakeTransport';
import { NOW, openTestDatabase } from '@/testing/helpers';

const mockPush = jest.fn();
let mockStartVisitOverride: ((customerId: string) => Promise<void>) | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Keep the real hooks, but let a test make startVisit fail.
jest.mock('@/state', () => {
  const actual = jest.requireActual<typeof import('@/state')>('@/state');
  return {
    ...actual,
    useActiveCustomer: () => {
      const real = actual.useActiveCustomer();
      return {
        ...real,
        startVisit: (customerId: string) =>
          mockStartVisitOverride ? mockStartVisitOverride(customerId) : real.startVisit(customerId),
      };
    },
  };
});

/** Shows the id of the active customer, so a test can check that the visit was saved. */
function ActiveCustomerProbe() {
  const { customerId } = useActiveCustomer();
  return <Text accessibilityLabel="active customer">{customerId ?? 'none'}</Text>;
}

async function renderRoute() {
  const dbPromise = openTestDatabase({ seed: false }).then((t) => t.db);
  const transport = new FakeTransport({
    latencyMs: 0,
    sleep: async () => undefined,
    online: true,
    now: () => NOW,
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AppProvider
        openDatabase={() => dbPromise}
        transport={transport}
        now={() => NOW}
        initiallyOnline
      >
        <BootGate>{children}</BootGate>
      </AppProvider>
    );
  }
  return await render(
    <Wrapper>
      <RouteScreen />
      <ActiveCustomerProbe />
    </Wrapper>,
  );
}

beforeEach(() => {
  mockPush.mockReset();
  mockStartVisitOverride = null;
});

describe('Route screen', () => {
  it("shows today's progress, the timeline and the current stop from the seeded route", async () => {
    await renderRoute();

    expect(await screen.findByText('Northgate Pharmacy')).toBeTruthy();
    expect(screen.getByText('2 done')).toBeTruthy();
    expect(screen.getByText('5 stops left')).toBeTruthy();
    expect(screen.getByLabelText('Offline ready')).toBeTruthy();
    expect(screen.getByText('Bluebird Foods')).toBeTruthy();
    expect(screen.getByLabelText("Today's stops")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start visit at Northgate Pharmacy' })).toBeTruthy();
  });

  it('starts the visit for the current stop and opens the catalogue', async () => {
    await renderRoute();
    await screen.findByText('Northgate Pharmacy');

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Start visit at Northgate Pharmacy' }));
    });

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/catalogue'));
    expect(screen.getByLabelText('active customer')).toHaveTextContent('cust-northgate');
  });

  it('shows the error and stays on the route when the visit cannot start', async () => {
    mockStartVisitOverride = () => Promise.reject(new Error('Database is locked'));
    await renderRoute();
    await screen.findByText('Northgate Pharmacy');

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: 'Start visit at Northgate Pharmacy' }));
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not start the visit. Database is locked',
    );
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Start visit at Northgate Pharmacy' })).toBeEnabled();
  });
});
