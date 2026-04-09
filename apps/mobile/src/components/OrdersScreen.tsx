import type { BuyerRecentOrder } from "../lib/orders";
import { formatMoney } from "../lib/format";
import type { BuyerLocale } from "../lib/i18n";
import {
  getBuyerDictionary,
  resolveOrderStateLabel,
  resolvePaymentMethodLabel,
  resolvePaymentStatusLabel
} from "../lib/i18n";
import { palette } from "../lib/theme";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type OrdersScreenProps = {
  isLoading: boolean;
  isSignedIn: boolean;
  locale: BuyerLocale;
  orders: BuyerRecentOrder[];
  onOpenAccount: () => void;
  onOpenOrder: (orderId: string) => void;
};

export function OrdersScreen({
  isLoading,
  isSignedIn,
  locale,
  orders,
  onOpenAccount,
  onOpenOrder
}: OrdersScreenProps) {
  const dictionary = getBuyerDictionary(locale);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>{dictionary.recentOrdersTitle}</Text>
        <Text style={styles.title}>{dictionary.ordersTab}</Text>
        <Text style={styles.body}>{dictionary.ordersBody}</Text>
      </View>

      {!isSignedIn ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>{dictionary.signInToShop}</Text>
          <Pressable onPress={onOpenAccount} style={styles.accountButton}>
            <Text style={styles.accountButtonText}>{dictionary.goToAccount}</Text>
          </Pressable>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>{dictionary.loading}</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>{dictionary.ordersEmpty}</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {orders.map((order) => (
            <Pressable
              key={order.orderId}
              onPress={() => onOpenOrder(order.orderId)}
              style={({ pressed }) => [
                styles.card,
                pressed ? styles.cardPressed : null
              ]}
            >
              <View style={styles.row}>
                <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                <Text style={styles.total}>
                  {formatMoney(locale, order.currency, order.totalMinor)}
                </Text>
              </View>

              <View style={styles.metaStack}>
                <Text style={styles.metaText}>{order.sellerDisplayName}</Text>
                <Text style={styles.metaText}>
                  {resolvePaymentMethodLabel(locale, order.paymentMethod)} ·{" "}
                  {resolvePaymentStatusLabel(locale, order.paymentStatus)}
                </Text>
                <Text style={styles.stateText}>
                  {resolveOrderStateLabel(locale, order.state)}
                </Text>
                {order.trackingNumber ? (
                  <Text style={styles.metaText}>
                    {dictionary.trackingNumber}: {order.trackingNumber}
                  </Text>
                ) : null}
              </View>

              <View style={styles.ctaRow}>
                <Text style={styles.ctaText}>{dictionary.openTrackingCta}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  accountButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: palette.accent,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 18
  },
  accountButtonText: {
    color: palette.card,
    fontSize: 14,
    fontWeight: "700"
  },
  body: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22
  },
  card: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 20,
    shadowColor: palette.shadow,
    shadowOffset: {
      height: 10,
      width: 0
    },
    shadowOpacity: 1,
    shadowRadius: 24
  },
  cardPressed: {
    opacity: 0.92
  },
  content: {
    gap: 16,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 18
  },
  ctaRow: {
    alignItems: "flex-start"
  },
  ctaText: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: "700"
  },
  emptyText: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22
  },
  eyebrow: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  heroCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 32,
    borderWidth: 1,
    gap: 10,
    padding: 20
  },
  list: {
    gap: 14
  },
  metaStack: {
    gap: 4
  },
  metaText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19
  },
  orderNumber: {
    color: palette.ink,
    fontSize: 19,
    fontWeight: "700"
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  stateText: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: "700"
  },
  title: {
    color: palette.ink,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38
  },
  total: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "700"
  }
});
