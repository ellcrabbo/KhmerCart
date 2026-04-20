import type { NotificationEntry } from "../api/client";
import { formatDateTime } from "../lib/format";
import type { BuyerLocale } from "../lib/i18n";
import { getBuyerDictionary } from "../lib/i18n";
import { palette } from "../lib/theme";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type NotificationsScreenProps = {
  errorMessage: string | null;
  isLoading: boolean;
  items: NotificationEntry[];
  locale: BuyerLocale;
  onBack: () => void;
  onOpenNotification: (notification: NotificationEntry) => void;
};

export function NotificationsScreen({
  errorMessage,
  isLoading,
  items,
  locale,
  onBack,
  onOpenNotification,
}: NotificationsScreenProps) {
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
        <Text style={styles.backButtonText}>{dictionary.backToFeed}</Text>
      </Pressable>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Inbox</Text>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.body}>
          Order updates, featured drops, post approvals, and saved-product activity land here.
        </Text>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {items.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>No notifications yet.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((notification) => (
            <Pressable
              key={notification.id}
              onPress={() => onOpenNotification(notification)}
              style={[
                styles.card,
                !notification.isRead ? styles.cardUnread : null,
              ]}
            >
              <View style={styles.row}>
                <Text style={styles.itemTitle}>{notification.title}</Text>
                {!notification.isRead ? <View style={styles.unreadDot} /> : null}
              </View>
              <Text style={styles.itemBody}>{notification.body}</Text>
              <Text style={styles.metaText}>
                {formatDateTime(locale, notification.createdAt) ?? notification.createdAt}
              </Text>
            </Pressable>
          ))}
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
    paddingVertical: 10,
  },
  backButtonText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  body: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  cardUnread: {
    borderColor: palette.accent,
    borderWidth: 1.5,
  },
  content: {
    gap: 16,
    paddingBottom: 36,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  emptyText: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  errorText: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  eyebrow: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  heroCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 32,
    borderWidth: 1,
    gap: 10,
    padding: 20,
  },
  itemBody: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 21,
  },
  itemTitle: {
    color: palette.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  list: {
    gap: 12,
  },
  metaText: {
    color: palette.muted,
    fontSize: 12,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  stateScreen: {
    alignItems: "center",
    flex: 1,
    gap: 16,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  stateText: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },
  title: {
    color: palette.ink,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38,
  },
  unreadDot: {
    backgroundColor: palette.accent,
    borderRadius: 999,
    height: 10,
    width: 10,
  },
});
