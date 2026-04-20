import type { BuyerOrderTrackingData } from "../api/client";
import { formatDateTime, formatMoney, parseMoneyInput } from "../lib/format";
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
  TextInput,
  View
} from "react-native";
import { useMemo, useState } from "react";

type OrderTrackingScreenProps = {
  errorMessage: string | null;
  isLoading: boolean;
  isSubmittingRefundRequest: boolean;
  locale: BuyerLocale;
  onCreateRefundRequest: (input: {
    buyerMessage: string;
    reason: "NOT_RECEIVED" | "DAMAGED" | "NOT_AS_DESCRIBED" | "OTHER";
    requestedRefundMinor?: number | null;
  }) => void;
  tracking: BuyerOrderTrackingData | null;
  onBack: () => void;
  onOpenTrackingLink: () => void;
  onRefresh: () => void;
};

export function OrderTrackingScreen({
  errorMessage,
  isLoading,
  isSubmittingRefundRequest,
  locale,
  onCreateRefundRequest,
  tracking,
  onBack,
  onOpenTrackingLink,
  onRefresh
}: OrderTrackingScreenProps) {
  const dictionary = getBuyerDictionary(locale);
  const [refundReason, setRefundReason] = useState<
    "NOT_RECEIVED" | "DAMAGED" | "NOT_AS_DESCRIBED" | "OTHER"
  >("DAMAGED");
  const [refundMessage, setRefundMessage] = useState("");
  const [requestedRefundText, setRequestedRefundText] = useState("");
  const activeDispute = useMemo(
    () =>
      tracking?.disputes.find(
        (dispute) => dispute.status === "OPEN" || dispute.status === "UNDER_REVIEW"
      ) ?? null,
    [tracking]
  );

  function formatDisputeReason(
    value: "NOT_RECEIVED" | "DAMAGED" | "NOT_AS_DESCRIBED" | "OTHER"
  ) {
    return value.replaceAll("_", " ").toLowerCase();
  }

  function formatDisputeStatus(value: string) {
    return value.replaceAll("_", " ").toLowerCase();
  }

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
            <Text style={styles.sectionLabel}>Refund and return requests</Text>
            {tracking.disputes.length > 0 ? (
              <View style={styles.disputeList}>
                {tracking.disputes.map((dispute) => (
                  <View key={dispute.id} style={styles.disputeCard}>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>
                        {formatDisputeReason(dispute.reason)}
                      </Text>
                      <Text style={styles.disputeStatus}>
                        {formatDisputeStatus(dispute.status)}
                      </Text>
                    </View>
                    {typeof dispute.requestedRefundMinor === "number" ? (
                      <Text style={styles.secondaryValue}>
                        Requested refund:{" "}
                        {formatMoney(locale, tracking.currency, dispute.requestedRefundMinor)}
                      </Text>
                    ) : null}
                    <Text style={styles.timelineMessage}>{dispute.buyerMessage}</Text>
                    {dispute.resolutionNote ? (
                      <Text style={styles.secondaryValue}>
                        Resolution: {dispute.resolutionNote}
                      </Text>
                    ) : null}
                    <Text style={styles.timelineMeta}>
                      {formatDateTime(locale, dispute.updatedAt) ?? dispute.updatedAt}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.secondaryValue}>
                No refund or return requests have been opened for this order.
              </Text>
            )}

            {tracking.canRequestRefund ? (
              <View style={styles.refundComposer}>
                <Text style={styles.metaLabel}>Reason</Text>
                <View style={styles.reasonRow}>
                  {(
                    ["NOT_RECEIVED", "DAMAGED", "NOT_AS_DESCRIBED", "OTHER"] as const
                  ).map((reason) => (
                    <Pressable
                      key={reason}
                      onPress={() => setRefundReason(reason)}
                      style={[
                        styles.reasonChip,
                        refundReason === reason ? styles.reasonChipActive : null
                      ]}
                    >
                      <Text
                        style={[
                          styles.reasonChipText,
                          refundReason === reason ? styles.reasonChipTextActive : null
                        ]}
                      >
                        {formatDisputeReason(reason)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.metaLabel}>What happened?</Text>
                <TextInput
                  multiline
                  onChangeText={setRefundMessage}
                  placeholder="Describe the issue and what you want reviewed."
                  placeholderTextColor={palette.muted}
                  style={styles.messageInput}
                  value={refundMessage}
                />

                <Text style={styles.metaLabel}>Requested refund amount (optional)</Text>
                <TextInput
                  keyboardType="numeric"
                  onChangeText={setRequestedRefundText}
                  placeholder={
                    tracking.currency === "USD"
                      ? "Enter amount, for example 25.00"
                      : "Enter amount, for example 25000"
                  }
                  placeholderTextColor={palette.muted}
                  style={styles.amountInput}
                  value={requestedRefundText}
                />

                <Pressable
                  disabled={isSubmittingRefundRequest || refundMessage.trim().length === 0}
                  onPress={() => {
                    onCreateRefundRequest({
                      buyerMessage: refundMessage,
                      reason: refundReason,
                      requestedRefundMinor: requestedRefundText.trim()
                        ? parseMoneyInput(tracking.currency, requestedRefundText)
                        : null
                    });
                    setRefundMessage("");
                    setRequestedRefundText("");
                  }}
                  style={[
                    styles.linkButton,
                    isSubmittingRefundRequest || refundMessage.trim().length === 0
                      ? styles.linkButtonDisabled
                      : null
                  ]}
                >
                  <Text style={styles.linkButtonText}>
                    {isSubmittingRefundRequest
                      ? "Submitting request..."
                      : "Submit refund request"}
                  </Text>
                </Pressable>
              </View>
            ) : activeDispute ? (
              <Text style={styles.secondaryValue}>
                A refund request is already active for this order.
              </Text>
            ) : (
              <Text style={styles.secondaryValue}>
                Refund requests open after delivery is completed.
              </Text>
            )}
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
  disputeCard: {
    backgroundColor: palette.sunMuted,
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 14
  },
  disputeList: {
    gap: 10
  },
  disputeStatus: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize"
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
  linkButtonDisabled: {
    opacity: 0.55
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
  amountInput: {
    backgroundColor: palette.sunMuted,
    borderColor: palette.border,
    borderRadius: 16,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12
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
  messageInput: {
    backgroundColor: palette.sunMuted,
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 110,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top"
  },
  reasonChip: {
    backgroundColor: palette.sunMuted,
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  reasonChipActive: {
    backgroundColor: palette.accentMuted,
    borderColor: palette.accent
  },
  reasonChipText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize"
  },
  reasonChipTextActive: {
    color: palette.accent
  },
  reasonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  refundComposer: {
    gap: 10
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
