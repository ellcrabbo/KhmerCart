import type { BuyerVideoFeedItem } from "../api/client";
import { formatMoney } from "../lib/format";
import type { BuyerLocale } from "../lib/i18n";
import { getBuyerDictionary, resolveAvailabilityFromQuantity } from "../lib/i18n";
import { pickBestRenderableMediaUrl, sanitizeRemoteMediaUrl } from "../lib/media";
import { palette } from "../lib/theme";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from "react-native";

type PostViewerScreenProps = {
  cartCount: number;
  canAddToCart: boolean;
  initialPostId: string;
  isAddingToCart: boolean;
  items: BuyerVideoFeedItem[];
  locale: BuyerLocale;
  onAddToCart: (variantId: string, quantity?: number) => void;
  onBack: () => void;
  onMetric: (
    eventType:
      | "IMPRESSION"
      | "VIEWER_OPEN"
      | "PRODUCT_OPEN"
      | "ADD_TO_CART"
      | "CHECKOUT_START"
      | "ORDER_CONVERSION",
    videoPostId: string,
  ) => void;
  onOpenCart: () => void;
  onOpenProduct: (slug: string) => void;
  onSharePost: (postId: string) => Promise<void> | void;
};

type ViewerPageProps = {
  active: boolean;
  canAddToCart: boolean;
  cartCount: number;
  isAddingToCart: boolean;
  item: BuyerVideoFeedItem;
  locale: BuyerLocale;
  onAddToCart: (variantId: string, quantity?: number) => void;
  onBack: () => void;
  onOpenCart: () => void;
  onOpenProduct: (slug: string) => void;
  onSharePost: () => void;
};

const screenHeight = Dimensions.get("window").height;

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

function ViewerPlayer({
  active,
  fallbackImageUrl,
  posterUrl,
  url,
}: {
  active: boolean;
  fallbackImageUrl: string | null;
  posterUrl: string | null;
  url: string | null;
}) {
  const player = useVideoPlayer(active && url ? url : "", (instance) => {
    instance.loop = true;
    instance.muted = false;
  });

  useEffect(() => {
    if (!active || !url) {
      player.pause();
      return;
    }

    player.play();

    return () => {
      player.pause();
    };
  }, [active, player, url]);

  return (
    <View style={styles.mediaFrame}>
      {fallbackImageUrl ? (
        <Image source={{ uri: fallbackImageUrl }} style={styles.backgroundImage} />
      ) : null}
      {posterUrl ? <Image source={{ uri: posterUrl }} style={styles.posterImage} /> : null}
      {fallbackImageUrl ? (
        <Image source={{ uri: fallbackImageUrl }} style={styles.floatingImage} />
      ) : null}
      {active && url ? (
        <VideoView nativeControls={false} player={player} style={styles.video} />
      ) : null}
      <View style={styles.mediaTopShade} />
      <View style={styles.mediaBottomShade} />
    </View>
  );
}

function ViewerPage({
  active,
  canAddToCart,
  cartCount,
  isAddingToCart,
  item,
  locale,
  onAddToCart,
  onBack,
  onOpenCart,
  onOpenProduct,
  onSharePost,
}: ViewerPageProps) {
  const dictionary = getBuyerDictionary(locale);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    item.product.leadVariant.id,
  );
  const campaignBadges = item.campaignBadges ?? [];
  const [quantity, setQuantity] = useState(1);
  const variants = useMemo(
    () =>
      (item.product.variants ?? []).length > 0
        ? item.product.variants
        : [item.product.leadVariant],
    [item.product.leadVariant, item.product.variants],
  );
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];
  const sellerMonogram = createSellerMonogram(item.seller.slug);
  const productName = createCompactProductName(item.product.name);
  const featuredImageUrl = pickBestRenderableMediaUrl(
    item.product.featuredImageUrl,
    item.video.posterUrl,
  );
  const priceLabel = formatMoney(
    locale,
    selectedVariant.currency,
    selectedVariant.priceMinor,
  );

  useEffect(() => {
    setSelectedVariantId(item.product.leadVariant.id);
    setQuantity(1);
  }, [item.id, item.product.leadVariant.id]);

  return (
    <View style={styles.page}>
      <ViewerPlayer
        active={active}
        fallbackImageUrl={featuredImageUrl}
        posterUrl={sanitizeRemoteMediaUrl(item.video.posterUrl)}
        url={sanitizeRemoteMediaUrl(item.video.url)}
      />

      <View style={styles.overlay}>
        <View style={styles.topRow}>
          <Pressable onPress={onBack} style={styles.utilityButton}>
            <Text style={styles.utilityButtonText}>{dictionary.backToFeed}</Text>
          </Pressable>
          <View style={styles.topRightRow}>
            <View style={styles.viewerModePill}>
              <Text style={styles.viewerModePillText}>Shop Video</Text>
            </View>
            <Pressable onPress={onOpenCart} style={styles.utilityButton}>
              <Text style={styles.utilityButtonText}>
                {dictionary.openCart} {cartCount > 0 ? `(${cartCount})` : ""}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.rightRail}>
          <View style={styles.railProfile}>
            <View style={styles.railAvatar}>
              <Text style={styles.railAvatarText}>{sellerMonogram}</Text>
            </View>
            <Text style={styles.railHandle}>@{item.seller.slug}</Text>
          </View>
          <Pressable onPress={onSharePost} style={styles.railBubble}>
            <Text style={styles.railEmoji}>↗</Text>
            <Text style={styles.railLabel}>Share</Text>
          </Pressable>
          <Pressable onPress={() => onOpenProduct(item.product.slug)} style={styles.railBubble}>
            <Text style={styles.railEmoji}>▣</Text>
            <Text style={styles.railLabel}>Shop</Text>
          </Pressable>
          {item.isPinned ? (
            <View style={styles.railBubble}>
              <Text style={styles.railLabel}>Pinned</Text>
            </View>
          ) : null}
          {campaignBadges.slice(0, 1).map((badge) => (
            <View key={`${item.id}-${badge}`} style={styles.railBubble}>
              <Text style={styles.railLabel}>{badge.replaceAll("_", " ")}</Text>
            </View>
          ))}
        </View>

        <View style={styles.bottomStack}>
          <View style={styles.liveMetaRow}>
            <View style={styles.liveChip}>
              <Text style={styles.liveChipText}>LIVE DROP</Text>
            </View>
            <View style={styles.stockChip}>
              <Text style={styles.stockChipText}>
                {selectedVariant.availableQuantity} ready to ship
              </Text>
            </View>
          </View>

          <View style={styles.copyStack}>
            <Text style={styles.creatorHandle}>@{item.seller.slug}</Text>
            <Text style={styles.caption}>{item.caption}</Text>
          </View>

          <View style={styles.productPanel}>
            <View style={styles.productPanelTop}>
              {featuredImageUrl ? (
                <Image source={{ uri: featuredImageUrl }} style={styles.productThumb} />
              ) : (
                <View style={styles.productThumbFallback}>
                  <Text style={styles.productThumbFallbackText}>{sellerMonogram}</Text>
                </View>
              )}
              <View style={styles.productPanelCopy}>
                <Text style={styles.productPanelEyebrow}>{item.product.category}</Text>
                <Text numberOfLines={1} style={styles.productPanelTitle}>
                  {productName}
                </Text>
                <Text style={styles.productPanelMeta}>
                  {priceLabel} ·{" "}
                  {resolveAvailabilityFromQuantity(
                    locale,
                    selectedVariant.availableQuantity,
                  )}
                </Text>
              </View>
            </View>

            <View style={styles.variantRow}>
              {variants.map((variant) => {
                const selected = variant.id === selectedVariant.id;

                return (
                  <Pressable
                    key={variant.id}
                    onPress={() => setSelectedVariantId(variant.id)}
                    style={[
                      styles.variantChip,
                      selected ? styles.variantChipSelected : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.variantChipText,
                        selected ? styles.variantChipTextSelected : null,
                      ]}
                    >
                      {variant.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.productPanelBottom}>
              <View style={styles.quantityCluster}>
                <Pressable
                  onPress={() => setQuantity((value) => Math.max(1, value - 1))}
                  style={styles.quantityButton}
                >
                  <Text style={styles.quantityButtonText}>-</Text>
                </Pressable>
                <Text style={styles.quantityValue}>{quantity}</Text>
                <Pressable
                  onPress={() =>
                    setQuantity((value) =>
                      Math.min(selectedVariant.availableQuantity || 1, value + 1),
                    )
                  }
                  style={styles.quantityButton}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </Pressable>
              </View>

              <View style={styles.ctaRow}>
                <Pressable
                  onPress={() => onOpenProduct(item.product.slug)}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed ? styles.buttonPressed : null,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>View product</Text>
                </Pressable>
                <Pressable
                  disabled={
                    !canAddToCart ||
                    isAddingToCart ||
                    selectedVariant.availableQuantity <= 0
                  }
                  onPress={() => onAddToCart(selectedVariant.id, quantity)}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed ? styles.buttonPressed : null,
                    !canAddToCart || selectedVariant.availableQuantity <= 0
                      ? styles.primaryButtonDisabled
                      : null,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>{dictionary.addToCart}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export function PostViewerScreen({
  cartCount,
  canAddToCart,
  initialPostId,
  isAddingToCart,
  items,
  locale,
  onAddToCart,
  onBack,
  onMetric,
  onOpenCart,
  onOpenProduct,
  onSharePost,
}: PostViewerScreenProps) {
  const dictionary = getBuyerDictionary(locale);
  const listRef = useRef<FlatList<BuyerVideoFeedItem>>(null);
  const initialIndex = useMemo(
    () => Math.max(0, items.findIndex((item) => item.id === initialPostId)),
    [initialPostId, items],
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    if (items[activeIndex]) {
      onMetric("VIEWER_OPEN", items[activeIndex].id);
    }
  }, [activeIndex, items, onMetric]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<BuyerVideoFeedItem>[] }) => {
      const current = viewableItems.find((entry) => entry.isViewable)?.index ?? 0;
      setActiveIndex(current);
    },
  ).current;

  if (!items.length) {
    return (
      <View style={styles.stateScreen}>
        <Pressable onPress={onBack} style={styles.utilityButton}>
          <Text style={styles.utilityButtonText}>{dictionary.backToFeed}</Text>
        </Pressable>
        <Text style={styles.stateText}>{dictionary.videoFeedEmpty}</Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={items}
      getItemLayout={(_, index) => ({
        index,
        length: screenHeight,
        offset: screenHeight * index,
      })}
      initialNumToRender={1}
      initialScrollIndex={initialIndex}
      keyExtractor={(item) => item.id}
      onViewableItemsChanged={onViewableItemsChanged}
      pagingEnabled
      renderItem={({ index, item }) => (
        <ViewerPage
          active={index === activeIndex}
          canAddToCart={canAddToCart}
          cartCount={cartCount}
          isAddingToCart={isAddingToCart}
          item={item}
          locale={locale}
          onAddToCart={(variantId, quantity) => {
            onMetric("ADD_TO_CART", item.id);
            onAddToCart(variantId, quantity);
          }}
          onBack={onBack}
          onOpenCart={() => {
            onMetric("CHECKOUT_START", item.id);
            onOpenCart();
          }}
          onOpenProduct={(slug) => {
            onMetric("PRODUCT_OPEN", item.id);
            onOpenProduct(slug);
          }}
          onSharePost={() => {
            void onSharePost(item.id);
          }}
        />
      )}
      showsVerticalScrollIndicator={false}
      snapToAlignment="start"
      snapToInterval={screenHeight}
      viewabilityConfig={{
        itemVisiblePercentThreshold: 70,
      }}
    />
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.26,
    resizeMode: "cover",
  },
  bottomStack: {
    gap: 12,
    paddingBottom: 26,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  caption: {
    color: palette.card,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  copyStack: {
    gap: 4,
    paddingRight: 92,
  },
  creatorHandle: {
    color: "#d8f1e8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  ctaRow: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
  },
  floatingImage: {
    bottom: 182,
    height: screenHeight * 0.38,
    opacity: 0.16,
    position: "absolute",
    right: -58,
    transform: [{ rotate: "-10deg" }],
    width: screenHeight * 0.24,
  },
  liveChip: {
    backgroundColor: "#eb5c35",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  liveChipText: {
    color: palette.card,
    fontSize: 11,
    fontWeight: "800",
  },
  liveMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  mediaBottomShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 10, 9, 0.5)",
  },
  mediaFrame: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0f2b24",
  },
  mediaTopShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6, 8, 9, 0.22)",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  page: {
    backgroundColor: palette.ink,
    height: screenHeight,
  },
  posterImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
    resizeMode: "cover",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderRadius: 999,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  productPanel: {
    backgroundColor: "rgba(8, 7, 5, 0.66)",
    borderColor: "rgba(255, 250, 242, 0.12)",
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 14,
  },
  productPanelBottom: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  productPanelCopy: {
    flex: 1,
    gap: 2,
  },
  productPanelEyebrow: {
    color: "#d7ede3",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  productPanelMeta: {
    color: "#efe4d5",
    fontSize: 13,
  },
  productPanelTitle: {
    color: palette.card,
    fontSize: 18,
    fontWeight: "800",
  },
  productPanelTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  productThumb: {
    backgroundColor: "#f7f2ea",
    borderRadius: 18,
    height: 80,
    width: 80,
  },
  productThumbFallback: {
    alignItems: "center",
    backgroundColor: "rgba(255, 250, 242, 0.12)",
    borderRadius: 18,
    height: 80,
    justifyContent: "center",
    width: 80,
  },
  productThumbFallbackText: {
    color: palette.card,
    fontSize: 24,
    fontWeight: "800",
  },
  quantityButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 250, 242, 0.14)",
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  quantityButtonText: {
    color: palette.card,
    fontSize: 18,
    fontWeight: "700",
  },
  quantityCluster: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  quantityValue: {
    color: palette.card,
    fontSize: 16,
    fontWeight: "700",
    minWidth: 18,
    textAlign: "center",
  },
  railAvatar: {
    alignItems: "center",
    backgroundColor: "rgba(255, 250, 242, 0.14)",
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  railAvatarText: {
    color: palette.card,
    fontSize: 15,
    fontWeight: "800",
  },
  railBubble: {
    alignItems: "center",
    backgroundColor: "rgba(8, 7, 5, 0.58)",
    borderColor: "rgba(255, 250, 242, 0.14)",
    borderRadius: 999,
    borderWidth: 1,
    gap: 3,
    minWidth: 72,
    paddingHorizontal: 10,
    paddingVertical: 11,
  },
  railEmoji: {
    color: palette.card,
    fontSize: 18,
    fontWeight: "700",
  },
  railHandle: {
    color: palette.card,
    fontSize: 11,
    fontWeight: "700",
  },
  railLabel: {
    color: palette.card,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
  },
  railProfile: {
    alignItems: "center",
    gap: 6,
  },
  rightRail: {
    alignItems: "center",
    gap: 10,
    position: "absolute",
    right: 16,
    top: 116,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 250, 242, 0.12)",
    borderRadius: 999,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: palette.card,
    fontSize: 13,
    fontWeight: "800",
  },
  stateScreen: {
    alignItems: "center",
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
  stockChip: {
    backgroundColor: "rgba(255, 250, 242, 0.12)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  stockChipText: {
    color: "#d7ede3",
    fontSize: 11,
    fontWeight: "700",
  },
  topRightRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  utilityButton: {
    backgroundColor: "rgba(255, 250, 242, 0.14)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  utilityButtonText: {
    color: palette.card,
    fontSize: 13,
    fontWeight: "700",
  },
  variantChip: {
    backgroundColor: "rgba(255, 250, 242, 0.12)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  variantChipSelected: {
    backgroundColor: palette.card,
  },
  variantChipText: {
    color: palette.card,
    fontSize: 12,
    fontWeight: "700",
  },
  variantChipTextSelected: {
    color: palette.ink,
  },
  variantRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  viewerModePill: {
    backgroundColor: "rgba(8, 7, 5, 0.46)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  viewerModePillText: {
    color: "#dbf3ea",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
});
