import type { BuyerProductDetail } from "../api/client";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { formatDateTime, formatMoney } from "../lib/format";
import type { BuyerLocale } from "../lib/i18n";
import {
  getBuyerDictionary,
  resolveAvailabilityFromQuantity
} from "../lib/i18n";
import { palette } from "../lib/theme";

type ProductDetailScreenProps = {
  canAddToCart: boolean;
  cartCount: number;
  errorMessage: string | null;
  isAddingToCart: boolean;
  isLoading: boolean;
  locale: BuyerLocale;
  onAddToCart: (variantId: string) => void;
  onBack: () => void;
  onOpenCart: () => void;
  product: BuyerProductDetail | null;
};

export function ProductDetailScreen({
  canAddToCart,
  cartCount,
  errorMessage,
  isAddingToCart,
  isLoading,
  locale,
  onAddToCart,
  onBack,
  onOpenCart,
  product
}: ProductDetailScreenProps) {
  const dictionary = getBuyerDictionary(locale);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <View style={styles.stateScreen}>
        <ActivityIndicator color={palette.accent} size="large" />
        <Text style={styles.stateText}>{dictionary.detailLoading}</Text>
      </View>
    );
  }

  if (!product || errorMessage) {
    return (
      <View style={styles.stateScreen}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{dictionary.backToFeed}</Text>
        </Pressable>
        <Text style={styles.stateText}>
          {errorMessage ?? dictionary.detailFallback}
        </Text>
      </View>
    );
  }

  const selectedVariant =
    product.variants.find((variant) => variant.id === selectedVariantId) ??
    product.variants.find((variant) => variant.isDefault) ??
    product.variants[0];
  const heroImage = product.images[0]?.url ?? product.featuredImage?.url ?? null;
  const publishedAt = formatDateTime(locale, product.publishedAt);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{dictionary.backToFeed}</Text>
        </Pressable>

        <Pressable onPress={onOpenCart} style={styles.cartButton}>
          <Text style={styles.cartButtonText}>
            {dictionary.openCart} {cartCount > 0 ? `(${cartCount})` : ""}
          </Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        {heroImage ? (
          <Image
            source={{
              uri: heroImage
            }}
            style={styles.heroImage}
          />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={styles.heroPlaceholderText}>KhmerCart</Text>
          </View>
        )}

        <View style={styles.heroCopy}>
          <Text style={styles.category}>{product.category}</Text>
          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.description}>{product.description}</Text>

          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{dictionary.priceFrom}</Text>
              <Text style={styles.statValue}>
                {formatMoney(locale, product.pricing.currency, product.pricing.priceMinor)}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>{dictionary.seller}</Text>
              <Text style={styles.statValue}>{product.seller.displayName}</Text>
            </View>
          </View>

          {publishedAt ? (
            <Text style={styles.metaLine}>{publishedAt}</Text>
          ) : null}
        </View>
      </View>

      {selectedVariant ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{dictionary.variantLabel}</Text>
          <Text style={styles.variantName}>{selectedVariant.name}</Text>
          <Text style={styles.variantPrice}>
            {formatMoney(locale, selectedVariant.currency, selectedVariant.priceMinor)}
          </Text>
          <Text style={styles.variantStock}>
            {resolveAvailabilityFromQuantity(locale, selectedVariant.availableQuantity)} ·{" "}
            {selectedVariant.availableQuantity} {dictionary.stockUnits}
          </Text>

          <View style={styles.actionRow}>
            <Pressable
              disabled={isAddingToCart || selectedVariant.availableQuantity <= 0}
              onPress={() => onAddToCart(selectedVariant.id)}
              style={({ pressed }) => [
                styles.primaryButton,
                !canAddToCart ? styles.primaryButtonMuted : null,
                pressed ? styles.buttonPressed : null,
                isAddingToCart || selectedVariant.availableQuantity <= 0
                  ? styles.buttonDisabled
                  : null
              ]}
            >
              {isAddingToCart ? (
                <ActivityIndicator color={palette.card} />
              ) : (
                <Text style={styles.primaryButtonText}>{dictionary.addToCart}</Text>
              )}
            </Pressable>

            <Pressable
              onPress={onOpenCart}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed ? styles.buttonPressed : null
              ]}
            >
              <Text style={styles.secondaryButtonText}>{dictionary.openCart}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{dictionary.variantLabel}</Text>
        <View style={styles.variantList}>
          {product.variants.map((variant) => {
            const isSelected = variant.id === selectedVariant?.id;

            return (
              <Pressable
                key={variant.id}
                onPress={() => setSelectedVariantId(variant.id)}
                style={[
                  styles.variantCard,
                  isSelected ? styles.variantCardSelected : null
                ]}
              >
                <View style={styles.variantHeader}>
                  <Text
                    style={[
                      styles.variantCardName,
                      isSelected ? styles.variantCardNameSelected : null
                    ]}
                  >
                    {variant.name}
                  </Text>
                  <Text
                    style={[
                      styles.variantCardPrice,
                      isSelected ? styles.variantCardNameSelected : null
                    ]}
                  >
                    {formatMoney(locale, variant.currency, variant.priceMinor)}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.variantCardMeta,
                    isSelected ? styles.variantCardMetaSelected : null
                  ]}
                >
                  {resolveAvailabilityFromQuantity(locale, variant.availableQuantity)} ·{" "}
                  {variant.availableQuantity} {dictionary.stockUnits}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{dictionary.disclosures}</Text>
        <View style={styles.disclosureList}>
          <View style={styles.disclosureCard}>
            <Text style={styles.disclosureLabel}>{dictionary.contactSeller}</Text>
            <Text style={styles.disclosureValue}>
              {product.disclosures.sellerContact}
            </Text>
          </View>

          <View style={styles.disclosureCard}>
            <Text style={styles.disclosureLabel}>{dictionary.sellerAddress}</Text>
            <Text style={styles.disclosureValue}>
              {product.disclosures.sellerAddress}
            </Text>
          </View>

          <View style={styles.disclosureCard}>
            <Text style={styles.disclosureLabel}>{dictionary.returnPolicy}</Text>
            <Text style={styles.disclosureValue}>
              {product.disclosures.returnPolicy}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    gap: 12
  },
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  backButtonText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "700"
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonPressed: {
    opacity: 0.9
  },
  card: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 16,
    padding: 20
  },
  cartButton: {
    alignSelf: "flex-start",
    backgroundColor: palette.accentMuted,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  cartButtonText: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: "700"
  },
  category: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  content: {
    gap: 16,
    paddingBottom: 48,
    paddingHorizontal: 20,
    paddingTop: 18
  },
  description: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 23
  },
  disclosureCard: {
    backgroundColor: "#fffefb",
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 16
  },
  disclosureLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  disclosureList: {
    gap: 12
  },
  disclosureValue: {
    color: palette.ink,
    fontSize: 15,
    lineHeight: 22
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  heroCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 32,
    borderWidth: 1,
    overflow: "hidden"
  },
  heroCopy: {
    gap: 12,
    padding: 20
  },
  heroImage: {
    backgroundColor: palette.sunMuted,
    height: 320,
    width: "100%"
  },
  heroPlaceholder: {
    alignItems: "center",
    backgroundColor: palette.sunMuted,
    height: 320,
    justifyContent: "center"
  },
  heroPlaceholderText: {
    color: palette.sun,
    fontSize: 22,
    fontWeight: "700"
  },
  metaLine: {
    color: palette.muted,
    fontSize: 13
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: palette.accent,
    borderRadius: 999,
    flex: 1,
    justifyContent: "center",
    minHeight: 52
  },
  primaryButtonMuted: {
    backgroundColor: palette.sun
  },
  primaryButtonText: {
    color: palette.card,
    fontSize: 15,
    fontWeight: "700"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: palette.accentMuted,
    borderRadius: 999,
    flex: 1,
    justifyContent: "center",
    minHeight: 52
  },
  secondaryButtonText: {
    color: palette.accent,
    fontSize: 15,
    fontWeight: "700"
  },
  sectionLabel: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  statCard: {
    backgroundColor: "#fffefb",
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    padding: 16
  },
  statLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  statRow: {
    flexDirection: "row",
    gap: 12
  },
  statValue: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "700"
  },
  stateScreen: {
    alignItems: "center",
    flex: 1,
    gap: 16,
    justifyContent: "center",
    paddingHorizontal: 28
  },
  stateText: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center"
  },
  title: {
    color: palette.ink,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38
  },
  variantCard: {
    backgroundColor: "#fffefb",
    borderColor: palette.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
    padding: 16
  },
  variantCardMeta: {
    color: palette.muted,
    fontSize: 13
  },
  variantCardMetaSelected: {
    color: palette.card
  },
  variantCardName: {
    color: palette.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: "700"
  },
  variantCardNameSelected: {
    color: palette.card
  },
  variantCardPrice: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "700"
  },
  variantCardSelected: {
    backgroundColor: palette.accent,
    borderColor: palette.accent
  },
  variantHeader: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  variantList: {
    gap: 12
  },
  variantName: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: "700"
  },
  variantPrice: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: "700"
  },
  variantStock: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: "700"
  }
});
