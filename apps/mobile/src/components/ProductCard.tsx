import type { BuyerFeedItem } from "../api/client";
import { formatMoney } from "../lib/format";
import type { BuyerLocale } from "../lib/i18n";
import { getBuyerDictionary, resolveAvailabilityFromState } from "../lib/i18n";
import { palette } from "../lib/theme";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type ProductCardProps = {
  item: BuyerFeedItem;
  locale: BuyerLocale;
  onPress: () => void;
};

export function ProductCard({ item, locale, onPress }: ProductCardProps) {
  const dictionary = getBuyerDictionary(locale);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed ? styles.cardPressed : null
      ]}
    >
      {item.featuredImage?.url ? (
        <Image
          source={{
            uri: item.featuredImage.url
          }}
          style={styles.image}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>KhmerCart</Text>
        </View>
      )}

      <View style={styles.copy}>
        <View style={styles.metaRow}>
          <Text style={styles.category}>{item.category}</Text>
          <Text style={styles.seller}>{item.seller.displayName}</Text>
        </View>

        <Text style={styles.name}>{item.name}</Text>
        <Text numberOfLines={3} style={styles.description}>
          {item.description}
        </Text>

        <View style={styles.footer}>
          <View style={styles.priceBlock}>
            <Text style={styles.priceLabel}>{dictionary.priceFrom}</Text>
            <Text style={styles.priceValue}>
              {formatMoney(locale, item.pricing.currency, item.pricing.priceMinor)}
            </Text>
          </View>

          <View style={styles.stockBlock}>
            <Text style={styles.stockLabel}>
              {resolveAvailabilityFromState(locale, item.stock.state)}
            </Text>
            <Text style={styles.stockValue}>
              {item.stock.availableQuantity} {dictionary.stockUnits}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: palette.shadow,
    shadowOffset: {
      height: 10,
      width: 0
    },
    shadowOpacity: 1,
    shadowRadius: 24
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ translateY: 1 }]
  },
  category: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  copy: {
    gap: 12,
    padding: 18
  },
  description: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21
  },
  footer: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between"
  },
  image: {
    backgroundColor: palette.sunMuted,
    height: 220,
    width: "100%"
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  name: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28
  },
  placeholder: {
    alignItems: "center",
    backgroundColor: palette.sunMuted,
    height: 220,
    justifyContent: "center"
  },
  placeholderText: {
    color: palette.sun,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.6
  },
  priceBlock: {
    gap: 4
  },
  priceLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  priceValue: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: "700"
  },
  seller: {
    color: palette.muted,
    fontSize: 12
  },
  stockBlock: {
    alignItems: "flex-end",
    gap: 4
  },
  stockLabel: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: "700"
  },
  stockValue: {
    color: palette.ink,
    fontSize: 13
  }
});
