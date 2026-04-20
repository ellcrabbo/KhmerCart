import type { BuyerVideoFeedItem } from "../api/client";
import { formatMoney } from "../lib/format";
import type { BuyerLocale } from "../lib/i18n";
import { getBuyerDictionary, resolveAvailabilityFromQuantity } from "../lib/i18n";
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
  type ViewToken
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
    videoPostId: string
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

function ViewerPlayer({
  active,
  posterUrl,
  url
}: {
  active: boolean;
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
      {posterUrl ? <Image source={{ uri: posterUrl }} style={styles.posterImage} /> : null}
      {active && url ? <VideoView nativeControls={false} player={player} style={styles.video} /> : null}
      <View style={styles.mediaShade} />
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
  onSharePost
}: ViewerPageProps) {
  const dictionary = getBuyerDictionary(locale);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(item.product.leadVariant.id);
  const campaignBadges = item.campaignBadges ?? [];
  const [quantity, setQuantity] = useState(1);
  const variants = useMemo(
    () => ((item.product.variants ?? []).length > 0 ? item.product.variants : [item.product.leadVariant]),
    [item.product.leadVariant, item.product.variants]
  );
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];
  const priceLabel = formatMoney(
    locale,
    selectedVariant.currency,
    selectedVariant.priceMinor
  );

  return (
    <View style={styles.page}>
      <ViewerPlayer active={active} posterUrl={item.video.posterUrl} url={item.video.url} />

      <View style={styles.overlay}>
        <View style={styles.topRow}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>{dictionary.backToFeed}</Text>
          </Pressable>
          <Pressable onPress={onOpenCart} style={styles.cartButton}>
            <Text style={styles.cartButtonText}>
              {dictionary.openCart} {cartCount > 0 ? `(${cartCount})` : ""}
            </Text>
          </Pressable>
        </View>

        <View style={styles.sideRail}>
          <Pressable onPress={onSharePost} style={styles.sideBubble}>
            <Text style={styles.sideLabel}>Share</Text>
          </Pressable>
          {item.isPinned ? (
            <View style={styles.sideBubble}>
              <Text style={styles.sideLabel}>Pinned</Text>
            </View>
          ) : null}
          {campaignBadges.slice(0, 2).map((badge) => (
            <View key={`${item.id}-${badge}`} style={styles.sideBubble}>
              <Text style={styles.sideLabel}>{badge.replaceAll("_", " ")}</Text>
            </View>
          ))}
        </View>

        <View style={styles.bottomStack}>
          <View style={styles.copyStack}>
            <View style={styles.creatorPill}>
              <Text style={styles.creatorHandle}>@{item.seller.slug}</Text>
              <Text style={styles.creatorMeta}>{dictionary.featuredNow}</Text>
            </View>
            <Text style={styles.caption}>{item.caption}</Text>
            <Text style={styles.productName}>{item.product.name}</Text>
            <Text style={styles.productMeta}>
              {priceLabel} ·{" "}
              {resolveAvailabilityFromQuantity(locale, selectedVariant.availableQuantity)}
            </Text>
          </View>

          <View style={styles.variantRow}>
            {variants.map((variant) => {
              const selected = variant.id === selectedVariant.id;

              return (
                <Pressable
                  key={variant.id}
                  onPress={() => setSelectedVariantId(variant.id)}
                  style={[styles.variantChip, selected ? styles.variantChipSelected : null]}
                >
                  <Text style={[styles.variantChipText, selected ? styles.variantChipTextSelected : null]}>
                    {variant.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.quantityRow}>
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
                  Math.min(selectedVariant.availableQuantity || 1, value + 1)
                )
              }
              style={styles.quantityButton}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </Pressable>
          </View>

          <View style={styles.productPanel}>
            <Pressable
              onPress={() => onOpenProduct(item.product.slug)}
              style={({ pressed }) => [
                styles.productInfoButton,
                pressed ? styles.buttonPressed : null
              ]}
            >
              <Text style={styles.productPanelEyebrow}>Tap into detail</Text>
              <Text numberOfLines={1} style={styles.productPanelTitle}>
                {item.product.name}
              </Text>
            </Pressable>
            <Pressable
              disabled={!canAddToCart || isAddingToCart || selectedVariant.availableQuantity <= 0}
              onPress={() => onAddToCart(selectedVariant.id, quantity)}
              style={({ pressed }) => [
                styles.shopButton,
                pressed ? styles.buttonPressed : null,
                !canAddToCart || selectedVariant.availableQuantity <= 0 ? styles.shopButtonDisabled : null
              ]}
            >
              <Text style={styles.shopButtonText}>{dictionary.addToCart}</Text>
            </Pressable>
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
  onSharePost
}: PostViewerScreenProps) {
  const dictionary = getBuyerDictionary(locale);
  const listRef = useRef<FlatList<BuyerVideoFeedItem>>(null);
  const initialIndex = useMemo(
    () => Math.max(0, items.findIndex((item) => item.id === initialPostId)),
    [initialPostId, items]
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
    }
  ).current;

  if (!items.length) {
    return (
      <View style={styles.stateScreen}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{dictionary.backToFeed}</Text>
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
        offset: screenHeight * index
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
        itemVisiblePercentThreshold: 70
      }}
    />
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 250, 242, 0.14)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  backButtonText: {
    color: palette.card,
    fontSize: 13,
    fontWeight: "700"
  },
  bottomStack: {
    gap: 14
  },
  buttonPressed: {
    opacity: 0.9
  },
  caption: {
    color: palette.card,
    fontSize: 18,
    lineHeight: 24
  },
  cartButton: {
    backgroundColor: "rgba(255, 250, 242, 0.14)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  cartButtonText: {
    color: palette.card,
    fontSize: 13,
    fontWeight: "700"
  },
  copyStack: {
    gap: 6
  },
  creatorHandle: {
    color: palette.card,
    fontSize: 13,
    fontWeight: "800"
  },
  creatorMeta: {
    color: "#d7f0e7",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  creatorPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(8, 7, 5, 0.42)",
    borderRadius: 999,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  mediaFrame: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.ink
  },
  mediaShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6, 6, 8, 0.28)"
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingBottom: 40,
    paddingHorizontal: 18,
    paddingTop: 14
  },
  page: {
    backgroundColor: palette.ink,
    height: screenHeight
  },
  posterImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: "cover"
  },
  productInfoButton: {
    flex: 1,
    gap: 2
  },
  productMeta: {
    color: "#f0e7da",
    fontSize: 13
  },
  productName: {
    color: palette.card,
    fontSize: 22,
    fontWeight: "800"
  },
  productPanel: {
    alignItems: "center",
    backgroundColor: "rgba(8, 7, 5, 0.62)",
    borderRadius: 24,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  productPanelEyebrow: {
    color: "#d9d1c4",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  productPanelTitle: {
    color: palette.card,
    fontSize: 15,
    fontWeight: "700"
  },
  quantityButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 250, 242, 0.14)",
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  quantityButtonText: {
    color: palette.card,
    fontSize: 18,
    fontWeight: "700"
  },
  quantityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14
  },
  quantityValue: {
    color: palette.card,
    fontSize: 16,
    fontWeight: "700",
    minWidth: 20,
    textAlign: "center"
  },
  screen: {
    flex: 1
  },
  shopButton: {
    backgroundColor: palette.card,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 14
  },
  shopButtonDisabled: {
    opacity: 0.5
  },
  shopButtonText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "800"
  },
  sideBubble: {
    alignItems: "center",
    backgroundColor: "rgba(8, 7, 5, 0.48)",
    borderColor: "rgba(255, 250, 242, 0.16)",
    borderRadius: 999,
    borderWidth: 1,
    gap: 4,
    minWidth: 72,
    paddingHorizontal: 10,
    paddingVertical: 12
  },
  sideLabel: {
    color: palette.card,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  sideRail: {
    alignItems: "flex-end",
    gap: 10
  },
  stateScreen: {
    alignItems: "center",
    flex: 1,
    gap: 16,
    justifyContent: "center",
    padding: 24
  },
  stateText: {
    color: palette.card,
    fontSize: 15,
    textAlign: "center"
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  variantChip: {
    backgroundColor: "rgba(255, 250, 242, 0.14)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  variantChipSelected: {
    backgroundColor: palette.card
  },
  variantChipText: {
    color: palette.card,
    fontSize: 12,
    fontWeight: "700"
  },
  variantChipTextSelected: {
    color: palette.ink
  },
  variantRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  video: {
    ...StyleSheet.absoluteFillObject
  }
});
