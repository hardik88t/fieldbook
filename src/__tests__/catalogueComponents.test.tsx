import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { useState } from 'react';

import { CartControl } from '@/components/catalogue/CartControl';
import { CategoryChips } from '@/components/catalogue/CategoryChips';
import { describeError } from '@/components/catalogue/describeError';
import { ReorderBanner } from '@/components/catalogue/ReorderBanner';
import { SearchField } from '@/components/catalogue/SearchField';
import { StatusBlock } from '@/components/catalogue/StatusBlock';
import { useDebouncedValue } from '@/components/catalogue/useDebouncedValue';
import { VisitCard } from '@/components/catalogue/VisitCard';

jest.mock('@/state', () => {
  const { formatINR } = jest.requireActual('@/money');
  return { formatINR };
});

const noop = () => undefined;

describe('useDebouncedValue', () => {
  it('returns the latest value only after it has settled for the delay', async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 40),
      { initialProps: { value: 'a' } },
    );
    expect(result.current).toBe('a');

    await rerender({ value: 'ab' });
    expect(result.current).toBe('a');

    await waitFor(() => expect(result.current).toBe('ab'));
  });
});

describe('describeError', () => {
  it('uses the message of an Error and falls back for anything else', () => {
    expect(describeError(new Error('Offline'))).toBe('Offline');
    expect(describeError('boom')).toBe('Something went wrong. Please try again.');
    expect(describeError(new Error(''))).toBe('Something went wrong. Please try again.');
  });
});

describe('CartControl', () => {
  it('explains why adding is blocked when no visit is active', async () => {
    const onAdd = jest.fn();
    await render(
      <CartControl
        productName="Sunflower Oil"
        qty={0}
        canAdd={false}
        busy={false}
        onAdd={onAdd}
        onChange={noop}
      />,
    );

    const add = screen.getByRole('button', { name: 'Add Sunflower Oil to cart' });
    expect(add.props.accessibilityState.disabled).toBe(true);
    expect(add.props.accessibilityHint).toMatch(/Start a visit/);

    await fireEvent.press(add);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('stops the plus button at the cart limit of 99', async () => {
    const onChange = jest.fn();
    await render(
      <CartControl
        productName="Sunflower Oil"
        qty={99}
        canAdd
        busy={false}
        onAdd={noop}
        onChange={onChange}
      />,
    );

    const plus = screen.getByRole('button', { name: 'Add one more Sunflower Oil' });
    expect(plus.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(plus);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('locks both buttons while a write for the product is in flight', async () => {
    await render(
      <CartControl productName="Sunflower Oil" qty={3} canAdd busy onAdd={noop} onChange={noop} />,
    );

    expect(
      screen.getByRole('button', { name: 'Remove one Sunflower Oil' }).props.accessibilityState
        .disabled,
    ).toBe(true);
    expect(
      screen.getByRole('button', { name: 'Add one more Sunflower Oil' }).props.accessibilityState
        .disabled,
    ).toBe(true);
  });
});

describe('SearchField', () => {
  it('offers a clear button only when there is text, and clears it', async () => {
    function Harness() {
      const [value, setValue] = useState('oil');
      return <SearchField value={value} onChangeText={setValue} />;
    }
    await render(<Harness />);

    await fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));

    expect(screen.getByLabelText('Search products').props.value).toBe('');
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
  });
});

describe('CategoryChips', () => {
  it('marks the selected chip and reports "All" as null', async () => {
    const onSelect = jest.fn();
    await render(
      <CategoryChips
        categories={[{ id: 'oil', name: 'Oil & Ghee', sortOrder: 1 }]}
        selectedId="oil"
        onSelect={onSelect}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Oil & Ghee' }).props.accessibilityState.selected,
    ).toBe(true);
    expect(screen.getByRole('button', { name: 'All' }).props.accessibilityState.selected).toBe(
      false,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'All' }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});

describe('ReorderBanner', () => {
  it('uses the singular for a single line and the plural otherwise', async () => {
    await render(
      <ReorderBanner customerName="Bluebird Foods" itemCount={1} onReorder={async () => 1} />,
    );

    expect(screen.getByText('Bluebird Foods · 1 item')).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Reorder last visit from Bluebird Foods' }),
    );
    expect(await screen.findByText('1 item added')).toBeTruthy();
  });
});

describe('StatusBlock and VisitCard', () => {
  it('runs the action of a status block', async () => {
    const onPress = jest.fn();
    await render(
      <StatusBlock title="Nothing here" action={{ label: 'Show all products', onPress }} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Show all products' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows a loading indicator while the visit is loading', async () => {
    await render(<VisitCard customer={null} loading onGoToRoute={noop} />);

    expect(screen.getByLabelText('Loading the current visit')).toBeTruthy();
    expect(screen.queryByText('No visit in progress')).toBeNull();
  });
});
