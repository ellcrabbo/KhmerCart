import type { BuyerVideoFeedItem } from "../api/client";
import { formatMoney } from "../lib/format";
import type { BuyerLocale } from "../lib/i18n";
import {
  getBuyerDictionary,
  resolveAvailabilityFromState
} from "../lib/i18n";
import { palette } from "../lib/theme";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

type VideoFeedScreenProps = {
  errorMessage: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  items: BuyerVideoFeedItem[];
  locale: BuyerLocale;
  onEndReached: () => void;
  onOpenPost: (postId: string) => void;
  onOpenProduct: (slug: string) => void;
  onSharePost: (postId: string) => void;
};

type VideoFeedCardProps = {
  item: BuyerVideoFeedItem;
  locale: BuyerLocale;
  onOpenPost: () => void;
  onOpenProduct: () => void;
  onSharePost: () => void;
};

const windowHeight = Dimensions.get("window").height;
const cardHeight = Math.max(560, windowHeight - 170);

function VideoFeedCard({
  item,
  locale,
  onOpenPost,
  onOpenProduct,
  onSharePost
}: VideoFeedCardProps) {
  const dictionary = getBuyerDictionary(locale);
  const priceLabel = formatMoney(
    locale,
    item.product.pricing.currency,
    item.product.pricing.priceMinor
  );

  return (
    <Pressable onPress={onOpenPost} style={styles.card}>
      <View style={styles.videoFrame}>
        {item.video.posterUrl ? (
          <Image
            source={{
              uri: item.video.posterUrl
            }}
            style={styles.poster}
          />
        ) : null}
        <View style={styles.posterWash} />

        <View style={styles.overlay}>
          <View style={styles.overlayHeader}>
            <View style={styles.liveChip}>
              <Text style={styles.liveChipText}>LIVE DROP</Text>
            </View>
            <View style={styles.creatorBadge}>
              <Text style={styles.overlaySeller}>@{item.seller.slug}</Text>
              <Text style={styles.overlayMeta}>{dictionary.featuredNow}</Text>
            </View>
          </View>

          {item.isPinned || item.campaignBadges.length > 0 ? (
            <View style={styles.badgeRow}>
              {item.isPinned ? (
                <View style={styles.feedBadge}>
                  <Text style={styles.feedBadgeText}>Pinned</Text>
                </View>
              ) : null}
              {item.campaignBadges.slice(0, 2).map((badge) => (
                <View key={`${item.id}-${badge}`} style={styles.feedBadge}>
                  <Text style={styles.feedBadgeText}>{badge.replaceAll("_", " ")}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.overlayFooter}>
            <View style={styles.bottomRow}>
              <View style={styles.leftColumn}>
                <View style={styles.captionBlock}>
                  <Text style={styles.caption}>{item.caption}</Text>
                  <Text style={styles.productName}>{item.product.name}</Text>
                  <Text style={styles.productMeta}>
                    {priceLabel} ·{" "}
                    {resolveAvailabilityFromState(locale, item.product.stock.state)}
                  </Text>
                </View>

                <View style={styles.productChip}>
                  <View style={styles.productChipThumb}>
                    <Text style={styles.productChipThumbText}>KC</Text>
                  </View>
                  <View style={styles.productChipBody}>
                    <Text style={styles.productChipLabel}>Featured product</Text>
                    <Text numberOfLines={1} style={styles.productChipTitle}>
                      {item.product.name}
                    </Text>
                  </View>
                  <Text style={styles.productChipPrice}>{priceLabel}</Text>
                </View>
              </View>

              <View style={styles.actionRail}>
                <View style={styles.actionBubble}>
                  <Text style={styles.actionEmoji}>♡</Text>
                  <Text style={styles.actionLabel}>Save</Text>
                </View>
                <Pressable onPress={onSharePost} style={styles.actionBubble}>
                  <Text style={styles.actionEmoji}>↗</Text>
                  <Text style={styles.actionLabel}>Share</Text>
                </Pressable>
                <View style={styles.actionBubble}>
                  <Text style={styles.actionEmoji}>▣</Text>
                  <Text style={styles.actionLabel}>Shop</Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={onOpenProduct}
              style={({ pressed }) => [
                styles.buyButton,
                pressed ? styles.buttonPressed : null
              ]}
            >
              <View>
                <Text style={styles.buyButtonEyebrow}>Instant checkout</Text>
                <Text style={styles.buyButtonText}>
                  {dictionary.videoFeedBuyNow}
                </Text>
              </View>
              <Text style={styles.buyButtonArrow}>›</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function VideoFeedScreen({
  errorMessage,
  isLoading,
  isLoadingMore,
  items,
  locale,
  onEndReached,
  onOpenPost,
  onOpenProduct,
  onSharePost
}: VideoFeedScreenProps) {
  const dictionary = getBuyerDictionary(locale);

  if (isLoading) {
    return (
      <View style={styles.stateScreen}>
        <ActivityIndicator color={palette.accent} size="large" />
        <Text style={styles.stateText}>{dictionary.videoFeedLoading}</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.stateScreen}>
        <Text style={styles.stateText}>{errorMessage ?? dictionary.videoFeedEmpty}</Text>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={items}
      decelerationRate="fast"
      keyExtractor={(item) => item.id}
      onEndReached={() => {
        if (!isLoadingMore) {
          onEndReached();
        }
      }}
      onEndReachedThreshold={0.5}
      pagingEnabled
      renderItem={({ item }) => (
        <VideoFeedCard
          item={item}
          locale={locale}
          onOpenPost={() => onOpenPost(item.id)}
          onOpenProduct={() => onOpenProduct(item.product.slug)}
          onSharePost={() => onSharePost(item.id)}
        />
      )}
      showsVerticalScrollIndicator={false}
      snapToAlignment="start"
      snapToInterval={cardHeight + 18}
      ListHeaderComponent={
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>KhmerCart Video</Text>
          <Text style={styles.heroTitle}>{dictionary.heroTitle}</Text>
          <Text style={styles.heroBody}>{dictionary.heroBody}</Text>
        </View>
      }
      ListFooterComponent={
        isLoadingMore ? (
          <View style={styles.footerLoading}>
            <ActivityIndicator color={palette.card} />
          </View>
        ) : errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  actionBubble: {
    alignItems: "center",
    backgroundColor: "rgba(8, 7, 5, 0.48)",
    borderColor: "rgba(255, 250, 242, 0.16)",
    borderRadius: 999,
    borderWidth: 1,
    gap: 4,
    minWidth: 62,
    paddingHorizontal: 10,
    paddingVertical: 12
  },
  actionEmoji: {
    color: palette.card,
    fontSize: 18,
    fontWeight: "700"
  },
  actionLabel: {
    color: palette.card,
    fontSize: 11,
    fontWeight: "700"
  },
  actionRail: {
    alignItems: "center",
    gap: 10,
    justifyContent: "flex-end"
  },
  body: {
    color: palette.card,
    fontSize: 15,
    lineHeight: 22
  },
  feedBadge: {
    backgroundColor: "rgba(255, 250, 242, 0.16)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  feedBadgeText: {
    color: palette.card,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  bottomRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 14
  },
  buyButton: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderRadius: 999,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: 18,
    paddingVertical: 14
  },
  buyButtonArrow: {
    color: palette.ink,
    fontSize: 28,
    fontWeight: "400",
    lineHeight: 28
  },
  buyButtonEyebrow: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
    textTransform: "uppercase"
  },
  buyButtonText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "700"
  },
  buttonPressed: {
    opacity: 0.9
  },
  caption: {
    color: palette.card,
    fontSize: 16,
    lineHeight: 22
  },
  captionBlock: {
    flex: 1,
    gap: 6
  },
  card: {
    height: cardHeight,
    paddingHorizontal: 20
  },
  creatorBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(12, 11, 8, 0.38)",
    borderRadius: 999,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  errorText: {
    color: palette.card,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
    textAlign: "center"
  },
  footerLoading: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80
  },
  heroBody: {
    color: palette.card,
    fontSize: 15,
    lineHeight: 22
  },
  heroCard: {
    backgroundColor: palette.accent,
    borderRadius: 32,
    gap: 10,
    marginBottom: 18,
    marginHorizontal: 20,
    padding: 22
  },
  heroEyebrow: {
    color: "#d7f0e7",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  heroTitle: {
    color: palette.card,
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36
  },
  leftColumn: {
    flex: 1,
    gap: 14,
    justifyContent: "flex-end"
  },
  liveChip: {
    alignSelf: "flex-start",
    backgroundColor: "#e44f2d",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  liveChipText: {
    color: palette.card,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4
  },
  listContent: {
    backgroundColor: palette.background,
    gap: 18,
    paddingBottom: 42,
    paddingTop: 18
  },
  overlay: {
    bottom: 0,
    justifyContent: "space-between",
    left: 0,
    padding: 22,
    position: "absolute",
    right: 0,
    top: 0
  },
  overlayFooter: {
    gap: 14
  },
  overlayHeader: {
    gap: 10
  },
  overlayMeta: {
    color: "#d5efe7",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  overlaySeller: {
    color: palette.card,
    fontSize: 13,
    fontWeight: "700"
  },
  poster: {
    ...StyleSheet.absoluteFillObject
  },
  posterWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8, 7, 5, 0.14)"
  },
  productChip: {
    alignItems: "center",
    backgroundColor: "rgba(255, 250, 242, 0.95)",
    borderRadius: 22,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  productChipBody: {
    flex: 1,
    gap: 2
  },
  productChipLabel: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  productChipPrice: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "800"
  },
  productChipThumb: {
    alignItems: "center",
    backgroundColor: palette.accent,
    borderRadius: 14,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  productChipThumbText: {
    color: palette.card,
    fontSize: 14,
    fontWeight: "800"
  },
  productChipTitle: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "700"
  },
  productMeta: {
    color: "#e4dbcf",
    fontSize: 13,
    lineHeight: 18
  },
  productName: {
    color: palette.card,
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30
  },
  stateScreen: {
    alignItems: "center",
    backgroundColor: palette.background,
    flex: 1,
    gap: 14,
    justifyContent: "center",
    paddingHorizontal: 24
  },
  stateText: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center"
  },
  videoFrame: {
    backgroundColor: "#0d0f0d",
    borderRadius: 34,
    flex: 1,
    overflow: "hidden"
  }
});
