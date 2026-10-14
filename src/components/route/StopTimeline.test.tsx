import { fireEvent, render, screen } from '@testing-library/react-native';

import type { StopView } from '@/domain/types';
import { asPaise } from '@/money';

import { StopTimeline } from './StopTimeline';

/** Fixed clock: Wednesday 14 October 2026, 09:30 local time. */
const NOW = new Date(2026, 9, 14, 9, 30);

function stop(overrides: Partial<StopView> & { id: string; name: string; time: string }): StopView {
  const { id, name, time, ...rest } = overrides;
  return {
    id,
    customerId: `cust-${id}`,
    visitDate: '2026-10-14',
    plannedTime: time,
    position: Number(id.replace(/\D/g, '')) || 1,
    visitState: 'todo',
    customer: { id: `cust-${id}`, name, area: 'Ring Road' },
    lastOrder: null,
    ...rest,
  };
}

const ROUTE: StopView[] = [
  stop({
    id: 's1',
    name: 'Bluebird Foods',
    time: '09:10',
    visitState: 'done',
    lastOrder: {
      id: 'o1',
      totalPaise: asPaise(214000),
      createdAt: new Date(2026, 9, 14, 9, 12).toISOString(),
    },
  }),
  stop({
    id: 's2',
    name: 'Sunrise Pharmacy',
    time: '09:55',
    visitState: 'done',
    lastOrder: null,
  }),
  stop({
    id: 's3',
    name: 'Northgate Pharmacy',
    time: '10:40',
    lastOrder: {
      id: 'o3',
      totalPaise: asPaise(398000),
      createdAt: new Date(2026, 9, 5, 10, 12).toISOString(),
    },
  }),
  stop({
    id: 's4',
    name: 'Riverside Mart',
    time: '11:30',
    lastOrder: {
      id: 'o4',
      totalPaise: asPaise(114000),
      createdAt: new Date(2026, 8, 20, 11, 4).toISOString(),
    },
  }),
  stop({ id: 's5', name: 'Lotus Kirana', time: '13:00' }),
];

async function renderTimeline(
  overrides: Partial<{
    busyCustomerId: string | null;
    startError: string | null;
    onStartVisit: (stop: StopView) => void;
  }> = {},
) {
  const onStartVisit = overrides.onStartVisit ?? jest.fn();
  await render(
    <StopTimeline
      stops={ROUTE}
      currentId="s3"
      now={NOW}
      busyCustomerId={overrides.busyCustomerId ?? null}
      startError={overrides.startError ?? null}
      onStartVisit={onStartVisit}
    />,
  );
  return { onStartVisit };
}

describe('StopTimeline', () => {
  it('lists every stop with its time, shop and area', async () => {
    await renderTimeline();
    expect(screen.getByText('09:10')).toBeTruthy();
    expect(screen.getByText('Bluebird Foods')).toBeTruthy();
    expect(screen.getAllByText('Ring Road')).toHaveLength(ROUTE.length);
    expect(screen.getByText('Lotus Kirana')).toBeTruthy();
  });

  it('shows the order total for a stop visited today, in rupees', async () => {
    await renderTimeline();
    expect(
      screen.getByLabelText('09:10, Bluebird Foods, Ring Road, Done, Order · ₹ 2,140'),
    ).toBeTruthy();
  });

  it('says when a finished visit has no order today', async () => {
    await renderTimeline();
    expect(screen.getByText('No order today')).toBeTruthy();
  });

  it('shows the last order total for stops still to visit', async () => {
    await renderTimeline();
    expect(
      screen.getByLabelText('11:30, Riverside Mart, Ring Road, To visit, Last order · ₹ 1,140'),
    ).toBeTruthy();
    expect(screen.getByText('No previous order', { exact: false })).toBeTruthy();
  });

  it('puts the highlighted card under the current stop, with the days since its last order', async () => {
    await renderTimeline();
    expect(screen.getByText('Last order 9 days ago · ₹ 3,980')).toBeTruthy();
  });

  it('starts the visit for the current stop, and only that one', async () => {
    const { onStartVisit } = await renderTimeline();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    fireEvent.press(screen.getByRole('button', { name: 'Start visit at Northgate Pharmacy' }));
    expect(onStartVisit).toHaveBeenCalledTimes(1);
    expect(onStartVisit).toHaveBeenCalledWith(ROUTE[2]);
  });

  it('gives the Start visit button a 44 pt touch target', async () => {
    await renderTimeline();
    expect(screen.getByRole('button', { name: 'Start visit at Northgate Pharmacy' })).toHaveStyle({
      minHeight: 44,
    });
  });

  it('disables the button and shows progress while the visit is starting', async () => {
    await renderTimeline({ busyCustomerId: 'cust-s3' });
    const button = screen.getByRole('button', { name: 'Start visit at Northgate Pharmacy' });
    expect(button).toBeDisabled();
    expect(screen.getByText('Starting…')).toBeTruthy();
  });

  it('shows the error from a failed start to the user', async () => {
    await renderTimeline({ startError: 'Could not start the visit. Database is locked' });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not start the visit. Database is locked',
    );
  });
});
