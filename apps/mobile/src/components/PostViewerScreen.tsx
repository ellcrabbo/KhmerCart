import type { BuyerVideoFeedItem } from "../api/client";
import { formatDateTime, formatMoney } from "../lib/format";
import type { BuyerLocale } from "../lib/i18n";
import {
  getBuyerDictionary,
  resolveAvailabilityFromState,
} from "../lib/i18n";
import { palette } from "../lib/theme";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type PostViewerScreenProps = {
  initialPostId: string;
  items: BuyerVideoFeedItem[];
  locale: BuyerLocale;
  onBack: () => void;
  onOpenProduct: (slug: string) => void;
};

type PlayerSurfaceProps = {
  posterUrl: string | null;
  url: string | null;
};

function PlayerSurface({ posterUrl, url }: PlayerSurfaceProps) {
  const player = useVideoPlayer(url ?? "", (instance) => {
    instance.loop = true;
    instance.muted = false;
  });

  useEffect(() => {
    if (!url) {
      return;
    }

    player.play();

    return () => {
      player.pause();
    };
  }, [player, url]);

  return (
    <View style={styles.mediaFrame}>
      {posterUrl ? (
        <Image source={{ uri: posterUrl }} style={styles.posterImage} />
      ) : null}
      {url ? <VideoView nativeControls={false} player={player} style={styles.video} /> : null}
      <View style={styles.mediaShade} />
    </View>
  );
}

export function PostViewerScreen({
  initialPostId,
  items,
  locale,
  onBack,
  onOpenProduct,
}: PostViewerScreenProps) {
  const dictionary = getBuyerDictionary(locale);
  const initialIndex = useMemo(
    () => Math.max(0, items.findIndex((item) => item.id === initialPostId)),
    [initialPostId, items],
  );
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const currentItem = items[currentIndex] ?? items[0] ?? null;

  if (!currentItem) {
    return (
      <View style={styles.stateScreen}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{dictionary.backToFeed}</Text>
        </Pressable>
        <Text style={styles.stateText}>{dictionary.videoFeedEmpty}</Text>
      </View>
    );
  }

  const priceLabel = formatMoney(
    locale,
    currentItem.product.pricing.currency,
    currentItem.product.pricing.priceMinor,
  );
  const publishedAt = formatDateTime(locale, currentItem.publishedAt);
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < items.length - 1;

  return (
    <View style={styles.screen}>
      <PlayerSurface
        key={currentItem.id}
        posterUrl={currentItem.video.posterUrl}
        url={currentItem.video.url}
      />

      <View style={styles.overlay}>
        <View style={styles.topRow}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>{dictionary.backToFeed}</Text>
          </Pressable>
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>
              {currentIndex + 1}/{items.length}
            </Text>
          </View>
        </View>

        <View style={styles.sideRail}>
          <View style={styles.sideBubble}>
            <Text style={styles.sideEmoji}>♡</Text>
            <Text style={styles.sideLabel}>Save</Text>
          </View>
          <View style={styles.sideBubble}>
            <Text style={styles.sideEmoji}>↗</Text>
            <Text style={styles.sideLabel}>Share</Text>
          </View>
        </View>

        <View style={styles.bottomStack}>
          <View style={styles.copyStack}>
            <View style={styles.creatorPill}>
              <Text style={styles.creatorHandle}>@{currentItem.seller.slug}</Text>
              <Text style={styles.creatorMeta}>{dictionary.featuredNow}</Text>
            </View>
            <Text style={styles.caption}>{currentItem.caption}</Text>
            <Text style={styles.productName}>{currentItem.product.name}</Text>
            <Text style={styles.productMeta}>
              {priceLabel} ·{" "}
              {resolveAvailabilityFromState(locale, currentItem.product.stock.state)}
            </Text>
            {publishedAt ? (
              <Text style={styles.dateText}>{publishedAt}</Text>
            ) : null}
          </View>

          <View style={styles.productPanel}>
            <View style={styles.productPanelThumb}>
              <Text style={styles.productPanelThumbText}>KC</Text>
            </View>
            <View style={styles.productPanelCopy}>
              <Text style={styles.productPanelEyebrow}>Tap into checkout</Text>
              <Text numberOfLines={1} style={styles.productPanelTitle}>
                {currentItem.product.name}
              </Text>
            </View>
            <Pressable
              onPress={() => onOpenProduct(currentItem.product.slug)}
              style={({ pressed }) => [
                styles.shopButton,
                pressed ? styles.buttonPressed : null,
              ]}
            >
              <Text style={styles.shopButtonText}>{dictionary.videoFeedBuyNow}</Text>
            </Pressable>
          </View>

          <View style={styles.navRow}>
            <Pressable
              disabled={!canGoBack}
              onPress={() => setCurrentIndex((value) => Math.max(0, value - 1))}
              style={[
                styles.navButton,
                !canGoBack ? styles.navButtonDisabled : null,
              ]}
            >
              <Text style={styles.navButtonText}>Previous</Text>
            </Pressable>
            <Pressable
              disabled={!canGoForward}
              onPress={() =>
                setCurrentIndex((value) => Math.min(items.length - 1, value + 1))
              }
              style={[
                styles.navButton,
                !canGoForward ? styles.navButtonDisabled : null,
              ]}
            >
              <Text style={styles.navButtonText}>Next</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 250, 242, 0.14)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backButtonText: {
    color: palette.card,
    fontSize: 13,
    fontWeight: "700",
  },
  bottomStack: {
    gap: 14,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  caption: {
    color: palette.card,
    fontSize: 18,
    lineHeight: 24,
  },
  copyStack: {
    gap: 6,
  },
  counterPill: {
    backgroundColor: "rgba(255, 250, 242, 0.14)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  counterText: {
    color: palette.card,
    fontSize: 12,
    fontWeight: "800",
  },
  creatorHandle: {
    color: palette.card,
    fontSize: 13,
    fontWeight: "800",
  },
  creatorMeta: {
    color: "#d7f0e7",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  creatorPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(8, 7, 5, 0.42)",
    borderRadius: 999,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dateText: {
    color: "#d9d1c4",
    fontSize: 12,
    lineHeight: 18,
  },
  mediaFrame: {
    backgroundColor: "#09261f",
    flex: 1,
  },
  mediaShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4, 4, 3, 0.22)",
  },
  navButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 250, 242, 0.14)",
    borderRadius: 999,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  navButtonDisabled: {
    opacity: 0.45,
  },
  navButtonText: {
    color: palette.card,
    fontSize: 13,
    fontWeight: "700",
  },
  navRow: {
    flexDirection: "row",
    gap: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: 20,
  },
  posterImage: {
    ...StyleSheet.absoluteFillObject,
  },
  productMeta: {
    color: "#e8ddcf",
    fontSize: 14,
    lineHeight: 20,
  },
  productName: {
    color: palette.card,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  productPanel: {
    alignItems: "center",
    backgroundColor: "rgba(255, 250, 242, 0.95)",
    borderRadius: 26,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  productPanelCopy: {
    flex: 1,
    gap: 2,
  },
  productPanelEyebrow: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  productPanelThumb: {
    alignItems: "center",
    backgroundColor: palette.accent,
    borderRadius: 18,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  productPanelThumbText: {
    color: palette.card,
    fontSize: 16,
    fontWeight: "800",
  },
  productPanelTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  screen: {
    backgroundColor: "#07110e",
    flex: 1,
  },
  shopButton: {
    alignItems: "center",
    backgroundColor: palette.accent,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 16,
  },
  shopButtonText: {
    color: palette.card,
    fontSize: 13,
    fontWeight: "800",
  },
  sideBubble: {
    alignItems: "center",
    backgroundColor: "rgba(8, 7, 5, 0.42)",
    borderRadius: 999,
    gap: 4,
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  sideEmoji: {
    color: palette.card,
    fontSize: 18,
    fontWeight: "700",
  },
  sideLabel: {
    color: palette.card,
    fontSize: 11,
    fontWeight: "700",
  },
  sideRail: {
    alignItems: "center",
    gap: 10,
    position: "absolute",
    right: 20,
    top: 140,
  },
  stateScreen: {
    alignItems: "center",
    backgroundColor: "#07110e",
    flex: 1,
    gap: 16,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stateText: {
    color: palette.card,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
});
