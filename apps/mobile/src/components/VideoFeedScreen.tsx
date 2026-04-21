import type { BuyerVideoFeedItem } from "../api/client";
import { formatMoney } from "../lib/format";
import type { BuyerLocale } from "../lib/i18n";
import { getBuyerDictionary, resolveAvailabilityFromState } from "../lib/i18n";
import { pickBestRenderableMediaUrl } from "../lib/media";
import { palette } from "../lib/theme";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
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
const cardHeight = Math.max(640, windowHeight - 84);

function createSellerMonogram(slug: string) {
  return slug
    .split("-")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function createCompactProductName(name: string) {
  return name.split(" / ")[0]?.trim() || name;
}

function VideoFeedCard({
  item,
  locale,
  onOpenPost,
  onOpenProduct,
  onSharePost,
}: VideoFeedCardProps) {
  const dictionary = getBuyerDictionary(locale);
  const campaignBadges = item.campaignBadges ?? [];
  const sellerMonogram = createSellerMonogram(item.seller.slug);
  const productName = createCompactProductName(item.product.name);
  const posterUrl = pickBestRenderableMediaUrl(
    item.video.posterUrl,
    item.product.featuredImageUrl,
  );
  const featuredImageUrl = pickBestRenderableMediaUrl(
    item.product.featuredImageUrl,
    item.video.posterUrl,
  );
  const priceLabel = formatMoney(
    locale,
    item.product.pricing.currency,
    item.product.pricing.priceMinor,
  );
  const availabilityLabel = resolveAvailabilityFromState(
    locale,
    item.product.stock.state,
  );

  return (
    <Pressable onPress={onOpenPost} style={styles.card}>
      <View style={styles.frame}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.backgroundImage} />
        ) : null}
        <View style={styles.backgroundScrim} />
        <View style={styles.topFade} />
        <View style={styles.bottomFade} />

        <View style={styles.topBar}>
          <View style={styles.feedTabs}>
            <Text style={styles.feedTabMuted}>Following</Text>
            <Text style={styles.feedTabActive}>For You</Text>
            <Text style={styles.feedTabMuted}>Shop</Text>
          </View>
          <View style={styles.livePill}>
            <Text style={styles.livePillText}>LIVE DROP</Text>
          </View>
        </View>

        <View style={styles.rightRail}>
          <View style={styles.avatarBubble}>
            <Text style={styles.avatarBubbleText}>{sellerMonogram}</Text>
          </View>
          <View style={styles.railBubble}>
            <Text style={styles.railBubbleEmoji}>♡</Text>
            <Text style={styles.railBubbleLabel}>Save</Text>
          </View>
          <Pressable onPress={onSharePost} style={styles.railBubble}>
            <Text style={styles.railBubbleEmoji}>↗</Text>
            <Text style={styles.railBubbleLabel}>Share</Text>
          </Pressable>
          <Pressable onPress={onOpenProduct} style={styles.railBubble}>
            <Text style={styles.railBubbleEmoji}>▣</Text>
            <Text style={styles.railBubbleLabel}>Buy</Text>
          </Pressable>
        </View>

        <View style={styles.mediaCenter}>
          <View style={styles.playHalo}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
          <Text style={styles.centerEyebrow}>Tap to watch</Text>
        </View>

        <View style={styles.bottomPanel}>
          <View style={styles.sellerRow}>
            <View style={styles.sellerBadge}>
              <Text style={styles.sellerBadgeHandle}>@{item.seller.slug}</Text>
              <Text style={styles.sellerBadgeMeta}>{dictionary.featuredNow}</Text>
            </View>
            <View style={styles.stockPill}>
              <Text style={styles.stockPillText}>
                {item.product.stock.availableQuantity} ready
              </Text>
            </View>
          </View>

          <View style={styles.copyBlock}>
            <Text numberOfLines={2} style={styles.caption}>
              {item.caption}
            </Text>
            <Text numberOfLines={2} style={styles.productName}>
              {productName}
            </Text>
            <Text style={styles.productMeta}>
              {priceLabel} · {availabilityLabel}
            </Text>
          </View>

          {campaignBadges.length > 0 || item.isPinned ? (
            <View style={styles.badgeRow}>
              {item.isPinned ? (
                <View style={styles.badgeChip}>
                  <Text style={styles.badgeChipText}>Pinned</Text>
                </View>
              ) : null}
              {campaignBadges.slice(0, 2).map((badge) => (
                <View key={`${item.id}-${badge}`} style={styles.badgeChip}>
                  <Text style={styles.badgeChipText}>{badge.replaceAll("_", " ")}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.buyStrip}>
            <View style={styles.buyStripThumb}>
              {featuredImageUrl ? (
                <Image source={{ uri: featuredImageUrl }} style={styles.buyStripThumbImage} />
              ) : (
                <Text style={styles.buyStripThumbText}>{sellerMonogram}</Text>
              )}
            </View>
            <View style={styles.buyStripCopy}>
              <Text style={styles.buyStripEyebrow}>{item.product.category}</Text>
              <Text numberOfLines={1} style={styles.buyStripTitle}>
                {productName}
              </Text>
            </View>
            <Pressable
              onPress={onOpenProduct}
              style={({ pressed }) => [
                styles.shopButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.shopButtonText}>Shop now</Text>
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
  onSharePost,
}: VideoFeedScreenProps) {
  const dictionary = getBuyerDictionary(locale);

  if (isLoading) {
    return (
      <View style={styles.stateScreen}>
        <ActivityIndicator color={palette.card} size="large" />
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
      onEndReachedThreshold={0.45}
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
      snapToInterval={cardHeight}
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
  avatarBubble: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 999,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  avatarBubbleText: {
    color: palette.card,
    fontSize: 16,
    fontWeight: "800",
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.82,
    resizeMode: "cover",
  },
  backgroundScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(3, 5, 6, 0.26)",
  },
  badgeChip: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeChipText: {
    color: palette.card,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bottomFade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4, 5, 7, 0.1)",
  },
  bottomPanel: {
    bottom: 88,
    gap: 8,
    left: 16,
    position: "absolute",
    right: 92,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buyStrip: {
    alignItems: "center",
    backgroundColor: "rgba(13, 16, 18, 0.82)",
    borderColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 8,
  },
  buyStripCopy: {
    flex: 1,
    gap: 2,
  },
  buyStripEyebrow: {
    color: "#d7e4dd",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  buyStripThumb: {
    alignItems: "center",
    backgroundColor: "#f4ebdf",
    borderRadius: 14,
    height: 56,
    justifyContent: "center",
    overflow: "hidden",
    width: 56,
  },
  buyStripThumbImage: {
    height: "100%",
    resizeMode: "cover",
    width: "100%",
  },
  buyStripThumbText: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  buyStripTitle: {
    color: palette.card,
    fontSize: 14,
    fontWeight: "700",
  },
  caption: {
    color: palette.card,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
  card: {
    height: cardHeight,
  },
  centerAura: {
    backgroundColor: "rgba(33, 93, 79, 0.24)",
    borderRadius: 180,
    height: 220,
    position: "absolute",
    width: 220,
  },
  centerEyebrow: {
    color: "#dce7e2",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  centerThumb: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 28,
    borderWidth: 1,
    height: 208,
    overflow: "hidden",
    width: 164,
  },
  centerThumbFallback: {
    backgroundColor: "#173932",
    flex: 1,
  },
  centerThumbImage: {
    height: "100%",
    resizeMode: "cover",
    width: "100%",
  },
  centerThumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(7, 10, 11, 0.18)",
    justifyContent: "center",
    padding: 16,
  },
  centerThumbOverlayBadge: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  centerThumbOverlayBadgeText: {
    color: palette.card,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  centerThumbOverlayMeta: {
    color: "#dce7e2",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 8,
    textTransform: "uppercase",
  },
  centerThumbOverlayMono: {
    color: palette.card,
    fontSize: 36,
    fontWeight: "800",
  },
  copyBlock: {
    gap: 4,
  },
  errorText: {
    color: palette.card,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
    textAlign: "center",
  },
  feedTabActive: {
    color: palette.card,
    fontSize: 17,
    fontWeight: "800",
  },
  feedTabMuted: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 14,
    fontWeight: "700",
  },
  feedTabs: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  footerLoading: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
  },
  frame: {
    backgroundColor: "#050709",
    flex: 1,
    overflow: "hidden",
  },
  listContent: {
    backgroundColor: "#050709",
    paddingBottom: 0,
  },
  livePill: {
    backgroundColor: "#ef5932",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  livePillText: {
    color: palette.card,
    fontSize: 11,
    fontWeight: "800",
  },
  mediaCenter: {
    alignItems: "center",
    gap: 8,
    left: 0,
    position: "absolute",
    right: 0,
    top: 250,
  },
  playHalo: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderColor: "rgba(255, 255, 255, 0.26)",
    borderRadius: 999,
    borderWidth: 1,
    height: 70,
    justifyContent: "center",
    width: 70,
  },
  playIcon: {
    color: palette.card,
    fontSize: 30,
    fontWeight: "900",
    marginLeft: 4,
  },
  productMeta: {
    color: "#dce7e2",
    fontSize: 13,
  },
  productName: {
    color: palette.card,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 23,
  },
  railBubble: {
    alignItems: "center",
    gap: 4,
  },
  railBubbleEmoji: {
    color: palette.card,
    fontSize: 20,
    fontWeight: "700",
  },
  railBubbleLabel: {
    color: palette.card,
    fontSize: 11,
    fontWeight: "700",
  },
  rightRail: {
    alignItems: "center",
    bottom: 120,
    gap: 18,
    position: "absolute",
    right: 14,
  },
  sellerBadge: {
    gap: 2,
  },
  sellerBadgeHandle: {
    color: palette.card,
    fontSize: 14,
    fontWeight: "800",
  },
  sellerBadgeMeta: {
    color: "#d8e6de",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  sellerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  shopButton: {
    backgroundColor: palette.card,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  shopButtonText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: "800",
  },
  stateScreen: {
    alignItems: "center",
    backgroundColor: "#050709",
    flex: 1,
    gap: 16,
    justifyContent: "center",
    padding: 24,
  },
  stateText: {
    color: palette.card,
    fontSize: 15,
    textAlign: "center",
  },
  stockPill: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  stockPillText: {
    color: palette.card,
    fontSize: 11,
    fontWeight: "700",
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    left: 16,
    position: "absolute",
    right: 16,
    top: 16,
    zIndex: 2,
  },
  topFade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 7, 8, 0.14)",
  },
});
