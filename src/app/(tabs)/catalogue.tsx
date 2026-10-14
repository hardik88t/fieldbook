import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import { CategoryChips } from '@/components/catalogue/CategoryChips';
import { describeError } from '@/components/catalogue/describeError';
import { ProductCard } from '@/components/catalogue/ProductCard';
import { ReorderBanner } from '@/components/catalogue/ReorderBanner';
import { SearchField } from '@/components/catalogue/SearchField';
import { StatusBlock } from '@/components/catalogue/StatusBlock';
import { useDebouncedValue } from '@/components/catalogue/useDebouncedValue';
import { VisitCard } from '@/components/catalogue/VisitCard';
import type { Product } from '@/domain/types';
import { useActiveCustomer, useCart, useCategories, useLastOrder, useProducts } from '@/state';
import { colors, PAGE_GUTTER, space, textStyles } from '@/theme';

const SEARCH_DEBOUNCE_MS = 150;
const NO_PRODUCTS: Product[] = [];

const keyOf = (product: Product) => product.id;

/** Catalogue: find products for the shop being visited and add them to its cart. */
export default function CatalogueScreen() {
  const router = useRouter();
  const { customerId, customer, loading: visitLoading } = useActiveCustomer();
  const cart = useCart();
  const categories = useCategories();
  const lastVisit = useLastOrder(customerId);

  const [searchText, setSearchText] = useState('');
  const query = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const products = useProducts({ query, categoryId });

  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [cartError, setCartError] = useState<string | null>(null);

  const { addOne, setQty } = cart;
  const canAdd = customer !== null;
  const quantities = useMemo(
    () => new Map(cart.lines.map((line) => [line.productId, line.qty])),
    [cart.lines],
  );
  const lastOrder = customerId ? lastVisit.data : null;

  const runCartAction = useCallback(async (productId: string, action: () => Promise<void>) => {
    setPendingIds((current) => new Set(current).add(productId));
    setCartError(null);
    try {
      await action();
    } catch (caught) {
      setCartError(describeError(caught));
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(productId);
        return next;
      });
    }
  }, []);

  const handleAdd = useCallback(
    (productId: string) => runCartAction(productId, () => addOne(productId)),
    [addOne, runCartAction],
  );
  const handleSetQty = useCallback(
    (productId: string, qty: number) => runCartAction(productId, () => setQty(productId, qty)),
    [runCartAction, setQty],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Product>) => (
      <ProductCard
        product={item}
        qty={quantities.get(item.id) ?? 0}
        canAdd={canAdd}
        busy={pendingIds.has(item.id)}
        onAdd={handleAdd}
        onSetQty={handleSetQty}
      />
    ),
    [quantities, canAdd, pendingIds, handleAdd, handleSetQty],
  );

  const clearFilters = () => {
    setSearchText('');
    setCategoryId(null);
  };

  const filtered = query !== '' || categoryId !== null;
  let emptyState;
  if (products.loading) {
    emptyState = (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} accessibilityLabel="Loading products" />
      </View>
    );
  } else if (products.error) {
    emptyState = (
      <StatusBlock
        icon="alert-circle-outline"
        title="Could not load products"
        body={describeError(products.error)}
        action={{ label: 'Try again', onPress: products.refresh }}
      />
    );
  } else if (filtered) {
    emptyState = (
      <StatusBlock
        icon="search-outline"
        title={query ? `No matches for "${query}"` : 'No products in this category'}
        body="Try another word or pick a different category."
        action={{ label: 'Show all products', onPress: clearFilters }}
      />
    );
  } else {
    emptyState = (
      <StatusBlock
        icon="cube-outline"
        title="No products yet"
        body="The catalogue is empty on this device."
      />
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <VisitCard
          customer={customer}
          loading={visitLoading}
          onGoToRoute={() => router.push('/route')}
        />
        <SearchField value={searchText} onChangeText={setSearchText} />
        {categories.error ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading categories"
            onPress={categories.refresh}
          >
            <Text style={styles.error}>Categories could not load. Tap to retry.</Text>
          </Pressable>
        ) : (
          <CategoryChips
            categories={categories.data ?? []}
            selectedId={categoryId}
            onSelect={setCategoryId}
          />
        )}
        {lastOrder ? (
          <ReorderBanner
            key={lastOrder.id}
            customerName={lastOrder.customerName}
            itemCount={lastOrder.lines.length}
            onReorder={lastVisit.reorder}
          />
        ) : null}
        {cartError ? (
          <Text style={styles.error} accessibilityRole="alert">
            {cartError}
          </Text>
        ) : null}
      </View>

      <FlatList
        data={products.data ?? NO_PRODUCTS}
        keyExtractor={keyOf}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={emptyState}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  top: {
    paddingHorizontal: PAGE_GUTTER,
    paddingTop: space.md,
    paddingBottom: space.md,
    gap: space.md,
  },
  column: { gap: space.md },
  grid: {
    paddingHorizontal: PAGE_GUTTER,
    paddingBottom: space.xxxl,
    flexGrow: 1,
  },
  loading: { paddingVertical: space.xxxl, alignItems: 'center' },
  error: { ...textStyles.meta, color: colors.dangerInk },
});
