import type { BuyerProductDetail, ProductReviewSummary } from "../api/client";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  eligibleReviewOrders: Array<{
    label: string;
    orderId: string;
  }>;
  isFollowingSeller: boolean;
  isAddingToCart: boolean;
  isEligibilityLoading: boolean;
  isLoading: boolean;
  isReviewLoading: boolean;
  isSubmittingReview: boolean;
  isSaved: boolean;
  locale: BuyerLocale;
  onAddToCart: (variantId: string, quantity?: number) => void;
  onBack: () => void;
  onOpenCart: () => void;
  onSubmitReview: (input: {
    body: string;
    headline: string;
    orderId: string;
    rating: number;
  }) => void;
  onToggleFollowSeller: () => void;
  onToggleSaveProduct: () => void;
  product: BuyerProductDetail | null;
  reviews: ProductReviewSummary | null;
  reviewsError: string | null;
};

export function ProductDetailScreen({
  canAddToCart,
  cartCount,
  errorMessage,
  eligibleReviewOrders,
  isFollowingSeller,
  isAddingToCart,
  isEligibilityLoading,
  isLoading,
  isReviewLoading,
  isSubmittingReview,
  isSaved,
  locale,
  onAddToCart,
  onBack,
  onOpenCart,
  onSubmitReview,
  onToggleFollowSeller,
  onToggleSaveProduct,
  product,
  reviews,
  reviewsError
}: ProductDetailScreenProps) {
  const dictionary = getBuyerDictionary(locale);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewHeadline, setReviewHeadline] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [selectedReviewOrderId, setSelectedReviewOrderId] = useState<string | null>(
    null
  );

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

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Rating</Text>
              <Text style={styles.statValue}>
                {product.sellerRating?.reviewCount
                  ? `${product.sellerRating.averageRating.toFixed(1)} ★`
                  : "New"}
              </Text>
            </View>
          </View>

          {publishedAt ? (
            <Text style={styles.metaLine}>{publishedAt}</Text>
          ) : null}

          <View style={styles.quickActionRow}>
            <Pressable
              onPress={onToggleSaveProduct}
              style={({ pressed }) => [
                styles.quickActionButton,
                pressed ? styles.buttonPressed : null
              ]}
            >
              <Text style={styles.quickActionButtonText}>
                {isSaved ? "Saved" : "Save product"}
              </Text>
            </Pressable>

            <Pressable
              onPress={onToggleFollowSeller}
              style={({ pressed }) => [
                styles.quickActionButton,
                pressed ? styles.buttonPressed : null
              ]}
            >
              <Text style={styles.quickActionButtonText}>
                {isFollowingSeller ? "Following seller" : "Follow seller"}
              </Text>
            </Pressable>
          </View>
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

      {product.bundles.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Bundle offers</Text>
          <View style={styles.bundleList}>
            {product.bundles.map((bundle) => (
              <View key={bundle.id} style={styles.bundleCard}>
                <Text style={styles.bundleTitle}>{bundle.name}</Text>
                <Text style={styles.disclosureValue}>
                  {bundle.itemCount} bundled units across {bundle.productIds.length} products
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

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

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Trust</Text>
        <View style={styles.disclosureList}>
          <View style={styles.disclosureCard}>
            <Text style={styles.disclosureLabel}>Seller rating</Text>
            <Text style={styles.disclosureValue}>
              {product.sellerRating?.reviewCount
                ? `${product.sellerRating.averageRating.toFixed(1)} from ${product.sellerRating.reviewCount} reviews`
                : "No seller reviews yet."}
            </Text>
          </View>
          <View style={styles.disclosureCard}>
            <Text style={styles.disclosureLabel}>Product reviews</Text>
            <Text style={styles.disclosureValue}>
              {product.reviewSummary?.reviewCount
                ? `${product.reviewSummary.averageRating.toFixed(1)} average across ${product.reviewSummary.reviewCount} reviews`
                : "No product reviews yet."}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Recent reviews</Text>
        {isReviewLoading ? (
          <ActivityIndicator color={palette.accent} />
        ) : reviewsError ? (
          <Text style={styles.disclosureValue}>{reviewsError}</Text>
        ) : reviews?.entries.length ? (
          <View style={styles.reviewList}>
            {reviews.entries.slice(0, 4).map((entry) => (
              <View key={entry.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewBuyer}>{entry.buyerName}</Text>
                  <Text style={styles.reviewMeta}>{entry.rating.toFixed(1)} ★</Text>
                </View>
                {entry.headline ? (
                  <Text style={styles.reviewHeadline}>{entry.headline}</Text>
                ) : null}
                <Text style={styles.reviewBody}>
                  {entry.body || "Verified buyer review."}
                </Text>
                <Text style={styles.reviewMeta}>
                  {formatDateTime(locale, entry.createdAt)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.disclosureValue}>
            Reviews will appear here as completed buyers start rating the product.
          </Text>
        )}
      </View>

      {canAddToCart ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Write a review</Text>
          {isEligibilityLoading ? (
            <ActivityIndicator color={palette.accent} />
          ) : eligibleReviewOrders.length ? (
            <>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((rating) => {
                  const active = rating === reviewRating;

                  return (
                    <Pressable
                      key={rating}
                      onPress={() => setReviewRating(rating)}
                      style={[
                        styles.ratingChip,
                        active ? styles.ratingChipSelected : null
                      ]}
                    >
                      <Text
                        style={[
                          styles.ratingChipText,
                          active ? styles.ratingChipTextSelected : null
                        ]}
                      >
                        {rating}★
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <ScrollView
                contentContainerStyle={styles.reviewOrderRow}
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {eligibleReviewOrders.map((order) => {
                  const active = order.orderId === selectedReviewOrderId;

                  return (
                    <Pressable
                      key={order.orderId}
                      onPress={() => setSelectedReviewOrderId(order.orderId)}
                      style={[
                        styles.reviewOrderChip,
                        active ? styles.reviewOrderChipSelected : null
                      ]}
                    >
                      <Text
                        style={[
                          styles.reviewOrderChipText,
                          active ? styles.reviewOrderChipTextSelected : null
                        ]}
                      >
                        {order.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <TextInput
                onChangeText={setReviewHeadline}
                placeholder="Review headline"
                placeholderTextColor={palette.muted}
                style={styles.reviewInput}
                value={reviewHeadline}
              />
              <TextInput
                multiline
                onChangeText={setReviewBody}
                placeholder="What stood out about this product?"
                placeholderTextColor={palette.muted}
                style={[styles.reviewInput, styles.reviewTextarea]}
                textAlignVertical="top"
                value={reviewBody}
              />

              <Pressable
                disabled={!selectedReviewOrderId || isSubmittingReview}
                onPress={() =>
                  onSubmitReview({
                    body: reviewBody.trim(),
                    headline: reviewHeadline.trim(),
                    orderId: selectedReviewOrderId ?? "",
                    rating: reviewRating
                  })
                }
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed ? styles.buttonPressed : null,
                  !selectedReviewOrderId || isSubmittingReview
                    ? styles.buttonDisabled
                    : null
                ]}
              >
                {isSubmittingReview ? (
                  <ActivityIndicator color={palette.card} />
                ) : (
                  <Text style={styles.primaryButtonText}>Submit review</Text>
                )}
              </Pressable>
            </>
          ) : (
            <Text style={styles.disclosureValue}>
              Reviewing unlocks after this product has been delivered in one of your recent orders.
            </Text>
          )}
        </View>
      ) : null}
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
  bundleCard: {
    backgroundColor: "#fffefb",
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 16
  },
  bundleList: {
    gap: 12
  },
  bundleTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "700"
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
  ratingChip: {
    backgroundColor: "#fffefb",
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  ratingChipSelected: {
    backgroundColor: palette.accent,
    borderColor: palette.accent
  },
  ratingChipText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "700"
  },
  ratingChipTextSelected: {
    color: palette.card
  },
  ratingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  quickActionButton: {
    backgroundColor: palette.sunMuted,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  quickActionButtonText: {
    color: palette.sun,
    fontSize: 13,
    fontWeight: "700"
  },
  quickActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  reviewBody: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 21
  },
  reviewBuyer: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "700"
  },
  reviewCard: {
    backgroundColor: "#fffefb",
    borderColor: palette.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 16
  },
  reviewHeader: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  reviewHeadline: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "700"
  },
  reviewList: {
    gap: 12
  },
  reviewMeta: {
    color: palette.muted,
    fontSize: 12
  },
  reviewInput: {
    backgroundColor: "#fffefb",
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  reviewOrderChip: {
    backgroundColor: "#fffefb",
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  reviewOrderChipSelected: {
    backgroundColor: palette.sun,
    borderColor: palette.sun
  },
  reviewOrderChipText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "700"
  },
  reviewOrderChipTextSelected: {
    color: palette.card
  },
  reviewOrderRow: {
    gap: 10
  },
  reviewTextarea: {
    minHeight: 110
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
