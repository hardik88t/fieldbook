import { daysAgo } from '@/domain/dates';
import { ids, NOW, openTestDatabase } from '@/testing/helpers';

const TODAY = '2026-10-14';

describe('stop repository', () => {
  it('returns today’s route in planned order with customers attached', async () => {
    const { repos } = await openTestDatabase();
    const stops = await repos.stops.listForDate(TODAY);
    expect(stops).toHaveLength(7);
    expect(stops.map((s) => s.plannedTime)).toEqual([
      '09:10',
      '09:55',
      '10:40',
      '11:30',
      '12:15',
      '13:00',
      '13:45',
    ]);
    expect(stops[0]?.customer.name).toBe('Bluebird Foods');
    expect(stops[0]?.customer.area).toBe('Navrangpura');
  });

  it('reports each shop’s most recent order, including today’s', async () => {
    const { repos } = await openTestDatabase();
    const stops = await repos.stops.listForDate(TODAY);
    const bluebird = stops.find((s) => s.customerId === ids.bluebirdCustomer);
    expect(bluebird?.lastOrder?.id).toBe('seed-today-cust-bluebird');
    expect(daysAgo(bluebird?.lastOrder?.createdAt ?? '', NOW)).toBe(0);
  });

  it('reports how long ago the last order was for a shop not yet visited', async () => {
    const { repos } = await openTestDatabase();
    const stops = await repos.stops.listForDate(TODAY);
    const northgate = stops.find((s) => s.customerId === ids.northgateCustomer);
    expect(northgate?.visitState).toBe('todo');
    expect(daysAgo(northgate?.lastOrder?.createdAt ?? '', NOW)).toBe(11);
  });

  it('returns nothing for a day with no route', async () => {
    const { repos } = await openTestDatabase();
    expect(await repos.stops.listForDate('2026-01-01')).toEqual([]);
  });

  it('updates a visit state', async () => {
    const { repos } = await openTestDatabase();
    const northgate = (await repos.stops.listForDate(TODAY)).find((s) => s.position === 3);
    expect(northgate).toBeDefined();
    await repos.stops.setVisitState(northgate?.id ?? '', 'done');
    const updated = (await repos.stops.listForDate(TODAY)).find((s) => s.position === 3);
    expect(updated?.visitState).toBe('done');
  });

  it('looks up a customer by id', async () => {
    const { repos } = await openTestDatabase();
    expect(await repos.stops.getCustomer(ids.sunriseCustomer)).toEqual({
      id: 'cust-sunrise',
      name: 'Sunrise Pharmacy',
      area: 'Paldi',
    });
    expect(await repos.stops.getCustomer('missing')).toBeNull();
  });
});
