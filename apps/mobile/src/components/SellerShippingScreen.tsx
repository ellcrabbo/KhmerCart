import type { SaveSellerShipmentInput, SellerShippingQueueData } from "../api/client";
import { formatMoney } from "../lib/format";
import type { BuyerLocale } from "../lib/i18n";
import { getBuyerDictionary, resolveShipmentStatusLabel } from "../lib/i18n";
import { palette } from "../lib/theme";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

type SellerShippingScreenProps = {
  drafts: Record<string, SaveSellerShipmentInput>;
  errorMessage: string | null;
  isLoading: boolean;
  isSaving: boolean;
  locale: BuyerLocale;
  queue: SellerShippingQueueData | null;
  statusMessage: string | null;
  onChangeDraft: (
    orderId: string,
    field: keyof SaveSellerShipmentInput,
    value: string
  ) => void;
  onSaveOrder: (orderId: string, status?: "HANDED_TO_CARRIER" | "IN_TRANSIT" | "DELIVERED") => void;
};

export function SellerShippingScreen({
  drafts,
  errorMessage,
  isLoading,
  isSaving,
  locale,
  queue,
  statusMessage,
  onChangeDraft,
  onSaveOrder
}: SellerShippingScreenProps) {
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
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>{dictionary.sellerCenter}</Text>
        <Text style={styles.title}>{dictionary.sellerShippingTab}</Text>
        <Text style={styles.body}>{dictionary.checkoutBody}</Text>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      {statusMessage ? <Text style={styles.messageText}>{statusMessage}</Text> : null}

      {queue?.orders.length ? (
        queue.orders.map((order) => {
          const draft = drafts[order.orderId] ?? {};

          return (
            <View key={order.orderId} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                <Text style={styles.total}>
                  {formatMoney(locale, order.currency, order.totalMinor)}
                </Text>
              </View>

              <Text style={styles.metaText}>{order.buyer.fullName}</Text>
              <Text style={styles.metaText}>
                {order.shipment
                  ? resolveShipmentStatusLabel(locale, order.shipment.status)
                  : dictionary.shipmentPending}
              </Text>

              <TextInput
                onChangeText={(value) => onChangeDraft(order.orderId, "carrier", value)}
                placeholder={dictionary.carrierLabel}
                placeholderTextColor={palette.muted}
                style={styles.input}
                value={draft.carrier ?? order.shipment?.carrier ?? ""}
              />
              <TextInput
                onChangeText={(value) => onChangeDraft(order.orderId, "trackingNumber", value)}
                placeholder={dictionary.trackingNumber}
                placeholderTextColor={palette.muted}
                style={styles.input}
                value={draft.trackingNumber ?? order.shipment?.trackingNumber ?? ""}
              />
              <TextInput
                onChangeText={(value) => onChangeDraft(order.orderId, "trackingUrl", value)}
                placeholder={dictionary.sellerTrackingUrl}
                placeholderTextColor={palette.muted}
                style={styles.input}
                value={draft.trackingUrl ?? order.shipment?.trackingUrl ?? ""}
              />
              <TextInput
                onChangeText={(value) => onChangeDraft(order.orderId, "message", value)}
                placeholder={dictionary.sellerTrackingNote}
                placeholderTextColor={palette.muted}
                style={[styles.input, styles.multilineInput]}
                multiline
                value={draft.message ?? ""}
              />

              <View style={styles.actionGrid}>
                {order.canMarkHandedToCarrier ? (
                  <Pressable
                    disabled={isSaving}
                    onPress={() => onSaveOrder(order.orderId, "HANDED_TO_CARRIER")}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed ? styles.buttonPressed : null,
                      isSaving ? styles.buttonDisabled : null
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>Handed over</Text>
                  </Pressable>
                ) : null}

                {order.canMarkInTransit ? (
                  <Pressable
                    disabled={isSaving}
                    onPress={() => onSaveOrder(order.orderId, "IN_TRANSIT")}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed ? styles.buttonPressed : null,
                      isSaving ? styles.buttonDisabled : null
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>In transit</Text>
                  </Pressable>
                ) : null}

                {order.canMarkDelivered ? (
                  <Pressable
                    disabled={isSaving}
                    onPress={() => onSaveOrder(order.orderId, "DELIVERED")}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed ? styles.buttonPressed : null,
                      isSaving ? styles.buttonDisabled : null
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>Delivered</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.card}>
          <Text style={styles.metaText}>{dictionary.sellerNoShipments}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  body: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonPressed: {
    opacity: 0.9
  },
  card: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 12,
    padding: 20
  },
  content: {
    gap: 16,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 18
  },
  errorText: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20
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
  input: {
    backgroundColor: "#fffefb",
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  messageText: {
    color: palette.accent,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20
  },
  metaText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: "top"
  },
  orderNumber: {
    color: palette.ink,
    fontSize: 19,
    fontWeight: "700"
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: palette.accent,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 16
  },
  primaryButtonText: {
    color: palette.card,
    fontSize: 13,
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
    minHeight: 46,
    paddingHorizontal: 16
  },
  secondaryButtonText: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: "700"
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
