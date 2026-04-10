import type { BuyerVideoFeedItem } from "../api/client";
import { formatMoney } from "../lib/format";
import type { BuyerLocale } from "../lib/i18n";
import {
  getBuyerDictionary,
  resolveAvailabilityFromState
} from "../lib/i18n";
import { palette } from "../lib/theme";
import { VideoView, useVideoPlayer } from "expo-video";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken
} from "react-native";

type VideoFeedScreenProps = {
  errorMessage: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  items: BuyerVideoFeedItem[];
  locale: BuyerLocale;
  onEndReached: () => void;
  onOpenProduct: (slug: string) => void;
};

type VideoFeedCardProps = {
  active: boolean;
  item: BuyerVideoFeedItem;
  locale: BuyerLocale;
  onOpenProduct: () => void;
};

const windowHeight = Dimensions.get("window").height;
const cardHeight = Math.max(560, windowHeight - 170);

function VideoFeedCard({
  active,
  item,
  locale,
  onOpenProduct
}: VideoFeedCardProps) {
  const dictionary = getBuyerDictionary(locale);
  const hasPlayableVideo = Boolean(item.video.url);
  const player = useVideoPlayer(item.video.url ?? "", (instance) => {
    instance.loop = true;
    instance.muted = true;
  });

  useEffect(() => {
    if (!hasPlayableVideo) {
      player.pause();
      return;
    }

    if (active) {
      player.play();
      return;
    }

    player.pause();
  }, [active, hasPlayableVideo, player]);

  return (
    <View style={styles.card}>
      <View style={styles.videoFrame}>
        {item.video.posterUrl ? (
          <Image
            source={{
              uri: item.video.posterUrl
            }}
            style={styles.poster}
          />
        ) : null}

        {hasPlayableVideo ? (
          <VideoView
            allowsFullscreen
            nativeControls={false}
            player={player}
            style={styles.video}
          />
        ) : null}

        <View style={styles.overlay}>
          <View style={styles.overlayHeader}>
            <Text style={styles.overlaySeller}>{item.seller.displayName}</Text>
            <Text style={styles.overlayMeta}>{dictionary.featuredNow}</Text>
          </View>

          <View style={styles.overlayFooter}>
            <View style={styles.captionBlock}>
              <Text style={styles.caption}>{item.caption}</Text>
              <Text style={styles.productName}>{item.product.name}</Text>
              <Text style={styles.productMeta}>
                {formatMoney(
                  locale,
                  item.product.pricing.currency,
                  item.product.pricing.priceMinor
                )}{" "}
                · {resolveAvailabilityFromState(locale, item.product.stock.state)}
              </Text>
            </View>

            <Pressable
              onPress={onOpenProduct}
              style={({ pressed }) => [
                styles.buyButton,
                pressed ? styles.buttonPressed : null
              ]}
            >
              <Text style={styles.buyButtonText}>{dictionary.videoFeedBuyNow}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export function VideoFeedScreen({
  errorMessage,
  isLoading,
  isLoadingMore,
  items,
  locale,
  onEndReached,
  onOpenProduct
}: VideoFeedScreenProps) {
  const dictionary = getBuyerDictionary(locale);
  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);
  const resolvedActiveId = items.some((item) => item.id === activeId)
    ? activeId
    : (items[0]?.id ?? null);
  const viewabilityConfig = useMemo(
    () => ({
      itemVisiblePercentThreshold: 70
    }),
    []
  );
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const nextItem = viewableItems[0]?.item;

      if (
        nextItem &&
        typeof nextItem === "object" &&
        "id" in nextItem &&
        typeof nextItem.id === "string"
      ) {
        setActiveId(nextItem.id);
      }
    },
    []
  );

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
      onViewableItemsChanged={onViewableItemsChanged}
      pagingEnabled
      renderItem={({ item }) => (
        <VideoFeedCard
          active={resolvedActiveId === item.id}
          item={item}
          locale={locale}
          onOpenProduct={() => onOpenProduct(item.product.slug)}
        />
      )}
      showsVerticalScrollIndicator={false}
      snapToAlignment="start"
      snapToInterval={cardHeight + 18}
      viewabilityConfig={viewabilityConfig}
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
  body: {
    color: palette.card,
    fontSize: 15,
    lineHeight: 22
  },
  buyButton: {
    alignItems: "center",
    backgroundColor: palette.card,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 18
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
    alignSelf: "flex-start",
    backgroundColor: "rgba(12, 11, 8, 0.38)",
    borderRadius: 999,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10
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
  video: {
    ...StyleSheet.absoluteFillObject
  },
  videoFrame: {
    backgroundColor: "#0d0f0d",
    borderRadius: 34,
    flex: 1,
    overflow: "hidden"
  }
});
