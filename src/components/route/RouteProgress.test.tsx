import { render, screen } from '@testing-library/react-native';

import { RouteProgress } from './RouteProgress';
import { summarizeRoute } from './summary';
import type { StopView } from '@/domain/types';

function route(done: number, total: number): StopView[] {
  return Array.from({ length: total }, (_, index) => ({
    id: `s${index + 1}`,
    customerId: `c${index + 1}`,
    visitDate: '2026-10-14',
    plannedTime: '09:10',
    position: index + 1,
    visitState: index < done ? 'done' : 'todo',
    customer: { id: `c${index + 1}`, name: `Shop ${index + 1}`, area: 'Paldi' },
    lastOrder: null,
  }));
}

describe('RouteProgress', () => {
  it('shows done, stops left and offline-ready chips', async () => {
    await render(<RouteProgress summary={summarizeRoute(route(2, 6))} online pendingCount={0} />);
    expect(screen.getByText('2 done')).toBeTruthy();
    expect(screen.getByText('4 stops left')).toBeTruthy();
    expect(screen.getByLabelText('Offline ready')).toBeTruthy();
  });

  it('exposes the route progress as a progressbar', async () => {
    await render(<RouteProgress summary={summarizeRoute(route(2, 6))} online pendingCount={0} />);
    expect(screen.getByRole('progressbar', { name: 'Route progress' })).toHaveAccessibilityValue({
      min: 0,
      max: 6,
      now: 2,
    });
  });

  it('describes queued orders and offline state in the offline chip label', async () => {
    await render(
      <RouteProgress summary={summarizeRoute(route(1, 3))} online={false} pendingCount={2} />,
    );
    expect(
      screen.getByLabelText('Offline ready, currently offline, 2 orders waiting to send'),
    ).toBeTruthy();
  });

  it('says the route is complete when nothing is left', async () => {
    await render(<RouteProgress summary={summarizeRoute(route(3, 3))} online pendingCount={0} />);
    expect(screen.getByText('Route complete')).toBeTruthy();
  });
});
