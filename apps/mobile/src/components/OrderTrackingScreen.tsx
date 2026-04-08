import type { BuyerOrderTrackingData } from "../api/client";
import { formatDateTime, formatMoney } from "../lib/format";
import type { BuyerLocale } from "../lib/i18n";
import {
  getBuyerDictionary,
  resolveOrderStateLabel,
  resolveShipmentStatusLabel
} from "../lib/i18n";
import { palette } from "../lib/theme";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

type OrderTrackingScreenProps = {
  errorMessage: string | null;
  isLoading: boolean;
  locale: BuyerLocale;
  tracking: BuyerOrderTrackingData | null;
  onBack: () => void;
  onOpenTrackingLink: () => void;
  onRefresh: () => void;
};

export function OrderTrackingScreen({
  errorMessage,
  isLoading,
  locale,
  tracking,
  onBack,
  onOpenTrackingLink,
  onRefresh
}: OrderTrackingScreenProps) {
  const dictionary = getBuyerDictionary(locale);

  if (isLoading) {
    return (
      <View style={styles.stateScreen}>
        <ActivityIndicator color={palette.accent} size="large" />
        <Text style={styles.stateText}>{dictionary.loading}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>{dictionary.backToPayment}</Text>
      </Pressable>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {tracking ? (
        <>
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>{dictionary.trackingTitle}</Text>
            <Text style={styles.orderNumber}>{tracking.orderNumber}</Text>
            <Text style={styles.orderState}>
              {resolveOrderStateLabel(locale, tracking.state)}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{dictionary.placedAt}</Text>
              <Text style={styles.metaValue}>
                {formatDateTime(locale, tracking.placedAt) ?? "--"}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{dictionary.total}</Text>
              <Text style={styles.metaValue}>
                {formatMoney(locale, tracking.currency, tracking.totalMinor)}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>{dictionary.seller}</Text>
            <Text style={styles.primaryValue}>{tracking.seller.displayName}</Text>
            <Text style={styles.secondaryValue}>{tracking.seller.slug}</Text>
            <Text style={styles.secondaryValue}>
              {dictionary.sellerSupport}: {tracking.seller.contact}
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionLabel}>{dictionary.shipmentTimeline}</Text>
              <Pressable onPress={onRefresh} style={styles.refreshButton}>
                <Text style={styles.refreshButtonText}>{dictionary.refreshTracking}</Text>
              </Pressable>
            </View>

            {tracking.shipment ? (
              <>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{dictionary.carrierLabel}</Text>
                  <Text style={styles.metaValue}>{tracking.shipment.carrier ?? "--"}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{dictionary.trackingNumber}</Text>
                  <Text style={styles.metaValue}>
                    {tracking.shipment.trackingNumber ?? "--"}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{dictionary.shipmentStatusLabel}</Text>
                  <Text style={styles.metaValue}>
                    {resolveShipmentStatusLabel(locale, tracking.shipment.status)}
                  </Text>
                </View>

                {tracking.shipment.trackingUrl ? (
                  <Pressable onPress={onOpenTrackingLink} style={styles.linkButton}>
                    <Text style={styles.linkButtonText}>{dictionary.trackingLink}</Text>
                  </Pressable>
                ) : null}

                <View style={styles.timeline}>
                  {tracking.shipment.updates.map((event) => (
                    <View key={event.id} style={styles.timelineItem}>
                      <Text style={styles.timelineTitle}>
                        {resolveShipmentStatusLabel(locale, event.status)}
                      </Text>
                      <Text style={styles.timelineMessage}>{event.message}</Text>
                      <Text style={styles.timelineMeta}>
                        {formatDateTime(locale, event.occurredAt) ?? event.occurredAt}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.secondaryValue}>{dictionary.shipmentPending}</Text>
            )}
          </View>
        </>
      ) : (
        <View style={styles.stateScreen}>
          <Text style={styles.stateText}>{dictionary.shipmentPending}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  backButtonText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "700"
  },
  card: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 20
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  content: {
    gap: 16,
    paddingBottom: 48,
    paddingHorizontal: 20,
    paddingTop: 18
  },
  errorText: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20
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
  linkButton: {
    alignItems: "center",
    backgroundColor: palette.accentMuted,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 46
  },
  linkButtonText: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: "700"
  },
  metaLabel: {
    color: palette.muted,
    fontSize: 13
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  metaValue: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "700",
    maxWidth: "60%",
    textAlign: "right"
  },
  orderNumber: {
    color: palette.ink,
    fontSize: 30,
    fontWeight: "700"
  },
  orderState: {
    color: palette.accent,
    fontSize: 15,
    fontWeight: "700"
  },
  primaryValue: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: "700"
  },
  refreshButton: {
    backgroundColor: palette.accentMuted,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  refreshButtonText: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: "700"
  },
  secondaryValue: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21
  },
  sectionLabel: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  stateScreen: {
    alignItems: "center",
    flex: 1,
    gap: 14,
    justifyContent: "center",
    paddingHorizontal: 28
  },
  stateText: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center"
  },
  timeline: {
    gap: 12
  },
  timelineItem: {
    backgroundColor: "#fffefb",
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    padding: 16
  },
  timelineMessage: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 20
  },
  timelineMeta: {
    color: palette.muted,
    fontSize: 12
  },
  timelineTitle: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: "700"
  }
});
