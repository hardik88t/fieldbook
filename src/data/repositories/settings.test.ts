import { openTestDatabase } from '@/testing/helpers';

describe('settings repository', () => {
  it('stores, updates and deletes values', async () => {
    const { repos } = await openTestDatabase();
    expect(await repos.settings.get('activeCustomerId')).toBeNull();
    await repos.settings.set('activeCustomerId', 'cust-sunrise');
    await repos.settings.set('activeCustomerId', 'cust-lotus');
    expect(await repos.settings.get('activeCustomerId')).toBe('cust-lotus');
    await repos.settings.set('activeCustomerId', null);
    expect(await repos.settings.get('activeCustomerId')).toBeNull();
  });
});
