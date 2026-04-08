import type { BuyerCheckoutResult } from "../api/client";
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

type PaymentResultScreenProps = {
  locale: BuyerLocale;
  result: BuyerCheckoutResult;
  onBackToStorefront: () => void;
  onOpenPayment: () => void;
  onTrackOrder: () => void;
};

export function PaymentResultScreen({
  locale,
  result,
  onBackToStorefront,
  onOpenPayment,
  onTrackOrder
}: PaymentResultScreenProps) {
  const dictionary = getBuyerDictionary(locale);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>{dictionary.checkoutPlaced}</Text>
        <Text style={styles.title}>{dictionary.paymentResultTitle}</Text>
        <Text style={styles.body}>{dictionary.paymentResultBody}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>{dictionary.orderNumber}</Text>
          <Text style={styles.value}>{result.orderNumber}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>{dictionary.paymentMethodLabel}</Text>
          <Text style={styles.value}>
            {resolvePaymentMethodLabel(locale, result.payment.method)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>{dictionary.orderStateLabel}</Text>
          <Text style={styles.value}>
            {resolveOrderStateLabel(locale, result.state)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>{dictionary.paymentStatusLabel}</Text>
          <Text style={styles.value}>
            {resolvePaymentStatusLabel(locale, result.payment.status)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>{dictionary.total}</Text>
          <Text style={styles.value}>
            {formatMoney(locale, result.currency, result.totalMinor)}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{dictionary.paymentInstructions}</Text>
        <Text style={styles.instructions}>{result.payment.instructions}</Text>

        <View style={styles.row}>
          <Text style={styles.label}>{dictionary.paymentReference}</Text>
          <Text style={styles.value}>{result.payment.reference}</Text>
        </View>

        {result.payment.qrPayload ? (
          <View style={styles.payloadCard}>
            <Text style={styles.payloadLabel}>{dictionary.paymentQrPayload}</Text>
            <Text style={styles.payloadValue}>{result.payment.qrPayload}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        {result.payment.checkoutUrl ? (
          <Pressable onPress={onOpenPayment} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{dictionary.openPayment}</Text>
          </Pressable>
        ) : null}

        <Pressable onPress={onTrackOrder} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{dictionary.trackOrder}</Text>
        </Pressable>

        <Pressable onPress={onBackToStorefront} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>{dictionary.viewStorefront}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12
  },
  body: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 23
  },
  card: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 20
  },
  content: {
    gap: 16,
    paddingBottom: 48,
    paddingHorizontal: 20,
    paddingTop: 18
  },
  eyebrow: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  ghostButton: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 52,
    justifyContent: "center"
  },
  ghostButtonText: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "700"
  },
  heroCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 32,
    borderWidth: 1,
    gap: 10,
    padding: 20
  },
  instructions: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 22
  },
  label: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  payloadCard: {
    backgroundColor: "#fffefb",
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 16
  },
  payloadLabel: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  payloadValue: {
    color: palette.ink,
    fontSize: 13,
    lineHeight: 20
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: palette.accent,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 54
  },
  primaryButtonText: {
    color: palette.card,
    fontSize: 15,
    fontWeight: "700"
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: palette.accentMuted,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 54
  },
  secondaryButtonText: {
    color: palette.accent,
    fontSize: 15,
    fontWeight: "700"
  },
  sectionLabel: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  title: {
    color: palette.ink,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38
  },
  value: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "700",
    maxWidth: "62%",
    textAlign: "right"
  }
});
