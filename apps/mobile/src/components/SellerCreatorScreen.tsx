import type {
  CreateSellerProductInput,
  SellerCatalogData,
  SellerDashboardData,
  SellerVideoPostsData,
} from "../api/client";
import { formatMoney } from "../lib/format";
import type { BuyerLocale } from "../lib/i18n";
import { getBuyerDictionary } from "../lib/i18n";
import { palette } from "../lib/theme";
import type { SellerVideoDraftState } from "./SellerPostsScreen";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type SellerProductDraftField =
  | keyof CreateSellerProductInput
  | "inventoryQuantity"
  | "priceMinor";

type SellerCreatorScreenProps = {
  catalog: SellerCatalogData | null;
  dashboard: SellerDashboardData | null;
  errorMessage: string | null;
  isSaving: boolean;
  isLoading: boolean;
  locale: BuyerLocale;
  message: string | null;
  posts: SellerVideoPostsData | null;
  productDraft: CreateSellerProductInput;
  videoDraft: SellerVideoDraftState;
  onChangeCaption: (value: string) => void;
  onChangeProductDraft: (field: SellerProductDraftField, value: string) => void;
  onCreateProduct: () => void;
  onOpenCatalog: () => void;
  onOpenPosts: () => void;
  onOpenStorefront: () => void;
  onPickPoster: () => void;
  onPickVideo: () => void;
  onPublish: () => void;
  onSaveDraft: () => void;
  onSelectProduct: (productId: string) => void;
};

function isPublicPostReadyProduct(
  product: SellerCatalogData["products"][number],
) {
  return product.status === "ACTIVE" && product.moderationStatus === "APPROVED";
}

function formatProductPrice(
  locale: BuyerLocale,
  product: SellerCatalogData["products"][number],
) {
  const variant = product.variants[0];

  if (!variant?.currency || typeof variant.priceMinor !== "number") {
    return product.status;
  }

  return formatMoney(locale, variant.currency, variant.priceMinor);
}

export function SellerCreatorScreen({
  catalog,
  dashboard,
  errorMessage,
  isSaving,
  isLoading,
  locale,
  message,
  posts,
  productDraft,
  videoDraft,
  onChangeCaption,
  onChangeProductDraft,
  onCreateProduct,
  onOpenCatalog,
  onOpenPosts,
  onOpenStorefront,
  onPickPoster,
  onPickVideo,
  onPublish,
  onSaveDraft,
  onSelectProduct,
}: SellerCreatorScreenProps) {
  const dictionary = getBuyerDictionary(locale);
  const products = catalog?.products ?? [];
  const publicReadyProducts = products.filter(isPublicPostReadyProduct);
  const publishedPosts =
    posts?.posts.filter((post) => post.status === "PUBLISHED").length ?? 0;
  const selectedProduct = products.find(
    (product) => product.id === videoDraft.productId,
  );
  const canPublishSelectedProduct = selectedProduct
    ? isPublicPostReadyProduct(selectedProduct)
    : false;
  const publishReadiness = [
    Boolean(productDraft.name?.trim()),
    Boolean(videoDraft.caption.trim()),
    Boolean(videoDraft.videoLabel),
    Boolean(videoDraft.productId),
  ].filter(Boolean).length;

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
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>{dictionary.sellerCenter}</Text>
        <Text style={styles.title}>{dictionary.sellerCreateTab}</Text>
        <Text style={styles.body}>{dictionary.sellerCreatorBody}</Text>

        <View style={styles.metricRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {dashboard?.seller.kycStatus ?? "--"}
            </Text>
            <Text style={styles.metricLabel}>{dictionary.sellerKycStatus}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{publicReadyProducts.length}</Text>
            <Text style={styles.metricLabel}>
              {dictionary.sellerCreatorProductReady}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{publishedPosts}</Text>
            <Text style={styles.metricLabel}>
              {dictionary.sellerCreatorPostReady}
            </Text>
          </View>
        </View>

        <View style={styles.milestoneCard}>
          <View style={styles.milestoneHeader}>
            <Text style={styles.milestoneTitle}>Creator studio</Text>
            <Text style={styles.milestoneValue}>{publishReadiness}/4</Text>
          </View>
          <Text style={styles.helperText}>
            Build one product, attach one shoppable clip, then jump back to the
            buyer feed to verify the storefront loop.
          </Text>
        </View>
      </View>

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
      {message ? <Text style={styles.messageText}>{message}</Text> : null}

      <View style={styles.card}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepNumber}>1</Text>
          <View style={styles.stepCopy}>
            <Text style={styles.sectionLabel}>
              {dictionary.sellerCreatorStepListing}
            </Text>
            <Text style={styles.helperText}>
              {dictionary.sellerQuickListingBody}
            </Text>
          </View>
        </View>

        <View style={styles.form}>
          <TextInput
            onChangeText={(value) => onChangeProductDraft("name", value)}
            placeholder={dictionary.sellerProductName}
            placeholderTextColor={palette.muted}
            style={styles.input}
            value={productDraft.name ?? ""}
          />
          <TextInput
            onChangeText={(value) => onChangeProductDraft("category", value)}
            placeholder={dictionary.categoryFilter}
            placeholderTextColor={palette.muted}
            style={styles.input}
            value={productDraft.category ?? ""}
          />
          <TextInput
            multiline
            onChangeText={(value) => onChangeProductDraft("description", value)}
            placeholder={dictionary.sellerDescription}
            placeholderTextColor={palette.muted}
            style={[styles.input, styles.multilineInput]}
            value={productDraft.description ?? ""}
          />
          <View style={styles.splitRow}>
            <TextInput
              keyboardType="number-pad"
              onChangeText={(value) =>
                onChangeProductDraft("priceMinor", value)
              }
              placeholder={dictionary.sellerPriceMinor}
              placeholderTextColor={palette.muted}
              style={[styles.input, styles.splitInput]}
              value={`${productDraft.variants?.[0]?.priceMinor ?? ""}`}
            />
            <TextInput
              keyboardType="number-pad"
              onChangeText={(value) =>
                onChangeProductDraft("inventoryQuantity", value)
              }
              placeholder={dictionary.sellerInventory}
              placeholderTextColor={palette.muted}
              style={[styles.input, styles.splitInput]}
              value={`${productDraft.variants?.[0]?.inventoryQuantity ?? ""}`}
            />
          </View>
          <TextInput
            onChangeText={(value) =>
              onChangeProductDraft("sellerContact", value)
            }
            placeholder={dictionary.contactSeller}
            placeholderTextColor={palette.muted}
            style={styles.input}
            value={productDraft.sellerContact ?? ""}
          />
        </View>

        <Pressable
          disabled={isSaving}
          onPress={onCreateProduct}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.buttonPressed : null,
            isSaving ? styles.buttonDisabled : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {dictionary.sellerCreateListing}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepNumber}>2</Text>
          <View style={styles.stepCopy}>
            <Text style={styles.sectionLabel}>
              {dictionary.sellerCreatorStepVideo}
            </Text>
            <Text style={styles.helperText}>{dictionary.sellerPostsBody}</Text>
          </View>
        </View>

        <TextInput
          multiline
          onChangeText={onChangeCaption}
          placeholder={dictionary.sellerCaption}
          placeholderTextColor={palette.muted}
          style={[styles.input, styles.captionInput]}
          value={videoDraft.caption}
        />

        <View style={styles.uploadRow}>
          <Pressable
            disabled={isSaving}
            onPress={onPickVideo}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.buttonPressed : null,
              isSaving ? styles.buttonDisabled : null,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              {dictionary.sellerPickVideo}
            </Text>
          </Pressable>
          <Pressable
            disabled={isSaving}
            onPress={onPickPoster}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.buttonPressed : null,
              isSaving ? styles.buttonDisabled : null,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              {dictionary.sellerPickPoster}
            </Text>
          </Pressable>
        </View>

        <View style={styles.assetStack}>
          <Text style={styles.assetLabel}>
            {videoDraft.videoLabel ?? dictionary.sellerNoVideoSelected}
          </Text>
          <Text style={styles.assetLabel}>
            {videoDraft.posterLabel ?? dictionary.sellerNoPosterSelected}
          </Text>
        </View>

        {videoDraft.posterPreviewUrl || selectedProduct ? (
          <View style={styles.previewCard}>
            {videoDraft.posterPreviewUrl ? (
              <Image
                source={{ uri: videoDraft.posterPreviewUrl }}
                style={styles.previewPoster}
              />
            ) : (
              <View style={[styles.previewPoster, styles.previewPosterFallback]}>
                <Text style={styles.previewPosterFallbackText}>KC</Text>
              </View>
            )}
            <View style={styles.previewCopy}>
              <Text style={styles.previewEyebrow}>Buyer feed preview</Text>
              <Text numberOfLines={2} style={styles.previewTitle}>
                {videoDraft.caption.trim() || "Add your seller hook"}
              </Text>
              <Text style={styles.previewMeta}>
                {selectedProduct?.name ?? "Attach a product"}{" "}
                {videoDraft.durationSec ? `· ${videoDraft.durationSec}s` : ""}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>
            {dictionary.sellerAttachedProduct}
          </Text>
          {products.length ? (
            <ScrollView
              contentContainerStyle={styles.productGrid}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {products.map((product) => {
                const isSelected = videoDraft.productId === product.id;
                const isReady = isPublicPostReadyProduct(product);

                return (
                  <Pressable
                    key={product.id}
                    onPress={() => onSelectProduct(product.id)}
                    style={[
                      styles.productChip,
                      isSelected ? styles.productChipSelected : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.productChipTitle,
                        isSelected ? styles.productChipTitleSelected : null,
                      ]}
                    >
                      {product.name}
                    </Text>
                    <Text
                      style={[
                        styles.productChipMeta,
                        isSelected ? styles.productChipMetaSelected : null,
                      ]}
                    >
                      {formatProductPrice(locale, product)}
                    </Text>
                    <Text
                      style={[
                        styles.productStatus,
                        isReady ? styles.readyStatus : styles.pendingStatus,
                        isSelected ? styles.productChipMetaSelected : null,
                      ]}
                    >
                      {isReady
                        ? "Ready for feed"
                        : `${product.status} / ${product.moderationStatus}`}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.helperText}>
              {dictionary.sellerCreatorNoApprovedProducts}
            </Text>
          )}
        </View>

        {!canPublishSelectedProduct && selectedProduct ? (
          <Text style={styles.warningText}>
            {dictionary.sellerCreatorNoApprovedProducts}
          </Text>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable
            disabled={isSaving}
            onPress={onSaveDraft}
            style={({ pressed }) => [
              styles.secondaryButton,
              styles.actionButton,
              pressed ? styles.buttonPressed : null,
              isSaving ? styles.buttonDisabled : null,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              {dictionary.sellerSaveVideoDraft}
            </Text>
          </Pressable>
          <Pressable
            disabled={isSaving}
            onPress={onPublish}
            style={({ pressed }) => [
              styles.primaryButton,
              styles.actionButton,
              pressed ? styles.buttonPressed : null,
              isSaving ? styles.buttonDisabled : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {dictionary.sellerPublishVideoPost}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepNumber}>3</Text>
          <View style={styles.stepCopy}>
            <Text style={styles.sectionLabel}>
              {dictionary.sellerCreatorStepLive}
            </Text>
            <Text style={styles.helperText}>
              {dictionary.sellerCreatorMilestone}
            </Text>
          </View>
        </View>

        <View style={styles.linkRow}>
          <Pressable onPress={onOpenCatalog} style={styles.linkButton}>
            <Text style={styles.linkButtonText}>
              {dictionary.sellerCatalogTab}
            </Text>
          </Pressable>
          <Pressable onPress={onOpenPosts} style={styles.linkButton}>
            <Text style={styles.linkButtonText}>
              {dictionary.sellerPostsTab}
            </Text>
          </Pressable>
          <Pressable onPress={onOpenStorefront} style={styles.linkButton}>
            <Text style={styles.linkButtonText}>{dictionary.homeTab}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  assetLabel: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  assetStack: {
    gap: 4,
  },
  body: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  captionInput: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  card: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 20,
  },
  content: {
    gap: 16,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  errorText: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  eyebrow: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  fieldGroup: {
    gap: 10,
  },
  fieldLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  form: {
    gap: 12,
  },
  helperText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  heroCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 32,
    borderWidth: 1,
    gap: 14,
    padding: 20,
  },
  input: {
    backgroundColor: "#fffefb",
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  linkButton: {
    alignItems: "center",
    backgroundColor: palette.sunMuted,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 16,
  },
  linkButtonText: {
    color: palette.sun,
    fontSize: 13,
    fontWeight: "700",
  },
  linkRow: {
    flexDirection: "row",
    gap: 10,
  },
  messageText: {
    color: palette.accent,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  milestoneCard: {
    backgroundColor: palette.accentMuted,
    borderRadius: 22,
    gap: 8,
    padding: 14,
  },
  milestoneHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  milestoneTitle: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  milestoneValue: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  metricCard: {
    backgroundColor: palette.sunMuted,
    borderRadius: 20,
    flex: 1,
    gap: 4,
    padding: 14,
  },
  metricLabel: {
    color: palette.sun,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricValue: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  multilineInput: {
    minHeight: 84,
    textAlignVertical: "top",
  },
  pendingStatus: {
    color: palette.sun,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: palette.accent,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: palette.card,
    fontSize: 14,
    fontWeight: "700",
  },
  productChip: {
    backgroundColor: "#fffefb",
    borderColor: palette.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 6,
    padding: 14,
    width: 190,
  },
  productChipMeta: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  productChipMetaSelected: {
    color: palette.card,
  },
  productChipSelected: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  productChipTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  productChipTitleSelected: {
    color: palette.card,
  },
  productGrid: {
    gap: 10,
    paddingRight: 6,
  },
  previewCard: {
    alignItems: "center",
    backgroundColor: palette.accentMuted,
    borderRadius: 24,
    flexDirection: "row",
    gap: 14,
    padding: 14,
  },
  previewCopy: {
    flex: 1,
    gap: 4,
  },
  previewEyebrow: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  previewMeta: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  previewPoster: {
    backgroundColor: palette.card,
    borderRadius: 20,
    height: 120,
    width: 92,
  },
  previewPosterFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  previewPosterFallbackText: {
    color: palette.accent,
    fontSize: 20,
    fontWeight: "800",
  },
  previewTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  productStatus: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  readyStatus: {
    color: palette.accent,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: palette.accentMuted,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  sectionLabel: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  splitInput: {
    flex: 1,
  },
  splitRow: {
    flexDirection: "row",
    gap: 10,
  },
  stateScreen: {
    alignItems: "center",
    flex: 1,
    gap: 14,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  stateText: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  stepCopy: {
    flex: 1,
    gap: 4,
  },
  stepHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  stepNumber: {
    backgroundColor: palette.accent,
    borderRadius: 999,
    color: palette.card,
    fontSize: 14,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  title: {
    color: palette.ink,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 38,
  },
  uploadRow: {
    flexDirection: "row",
    gap: 12,
  },
  warningText: {
    color: palette.danger,
    fontSize: 13,
    lineHeight: 19,
  },
});
