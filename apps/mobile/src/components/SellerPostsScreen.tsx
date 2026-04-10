import type {
  SellerCatalogData,
  SellerVideoPostsData
} from "../api/client";
import { formatMoney } from "../lib/format";
import type { BuyerLocale } from "../lib/i18n";
import { getBuyerDictionary } from "../lib/i18n";
import { palette } from "../lib/theme";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

export type SellerVideoDraftState = {
  caption: string;
  posterLabel: string | null;
  productId: string | null;
  status: "DRAFT" | "PUBLISHED";
  videoLabel: string | null;
};

type SellerPostsScreenProps = {
  catalog: SellerCatalogData | null;
  draft: SellerVideoDraftState;
  errorMessage: string | null;
  isCreating: boolean;
  isLoading: boolean;
  locale: BuyerLocale;
  message: string | null;
  posts: SellerVideoPostsData | null;
  onChangeCaption: (value: string) => void;
  onPickPoster: () => void;
  onPickVideo: () => void;
  onPublish: () => void;
  onSaveDraft: () => void;
  onSelectProduct: (productId: string) => void;
};

export function SellerPostsScreen({
  catalog,
  draft,
  errorMessage,
  isCreating,
  isLoading,
  locale,
  message,
  posts,
  onChangeCaption,
  onPickPoster,
  onPickVideo,
  onPublish,
  onSaveDraft,
  onSelectProduct
}: SellerPostsScreenProps) {
  const dictionary = getBuyerDictionary(locale);

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
        <Text style={styles.title}>{dictionary.sellerPostsTab}</Text>
        <Text style={styles.body}>{dictionary.sellerPostsBody}</Text>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      {message ? <Text style={styles.messageText}>{message}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{dictionary.sellerCreateVideoPost}</Text>

        <TextInput
          multiline
          onChangeText={onChangeCaption}
          placeholder={dictionary.sellerCaption}
          placeholderTextColor={palette.muted}
          style={[styles.input, styles.multilineInput]}
          value={draft.caption}
        />

        <View style={styles.uploadRow}>
          <Pressable
            disabled={isCreating}
            onPress={onPickVideo}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.buttonPressed : null
            ]}
          >
            <Text style={styles.secondaryButtonText}>{dictionary.sellerPickVideo}</Text>
          </Pressable>

          <Pressable
            disabled={isCreating}
            onPress={onPickPoster}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.buttonPressed : null
            ]}
          >
            <Text style={styles.secondaryButtonText}>{dictionary.sellerPickPoster}</Text>
          </Pressable>
        </View>

        <Text style={styles.assetLabel}>
          {draft.videoLabel ?? dictionary.sellerNoVideoSelected}
        </Text>
        <Text style={styles.assetLabel}>
          {draft.posterLabel ?? dictionary.sellerNoPosterSelected}
        </Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{dictionary.sellerAttachedProduct}</Text>
          <ScrollView
            contentContainerStyle={styles.productGrid}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {catalog?.products.map((product) => {
              const isSelected = draft.productId === product.id;
              const variant = product.variants[0];

              return (
                <Pressable
                  key={product.id}
                  onPress={() => onSelectProduct(product.id)}
                  style={[
                    styles.productChip,
                    isSelected ? styles.productChipSelected : null
                  ]}
                >
                  <Text
                    style={[
                      styles.productChipTitle,
                      isSelected ? styles.productChipTitleSelected : null
                    ]}
                  >
                    {product.name}
                  </Text>
                  <Text
                    style={[
                      styles.productChipMeta,
                      isSelected ? styles.productChipMetaSelected : null
                    ]}
                  >
                    {variant?.currency && typeof variant.priceMinor === "number"
                      ? formatMoney(locale, variant.currency, variant.priceMinor)
                      : product.status}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            disabled={isCreating}
            onPress={onSaveDraft}
            style={({ pressed }) => [
              styles.secondaryButton,
              styles.actionButton,
              pressed ? styles.buttonPressed : null,
              isCreating ? styles.buttonDisabled : null
            ]}
          >
            <Text style={styles.secondaryButtonText}>{dictionary.sellerSaveVideoDraft}</Text>
          </Pressable>

          <Pressable
            disabled={isCreating}
            onPress={onPublish}
            style={({ pressed }) => [
              styles.primaryButton,
              styles.actionButton,
              pressed ? styles.buttonPressed : null,
              isCreating ? styles.buttonDisabled : null
            ]}
          >
            <Text style={styles.primaryButtonText}>{dictionary.sellerPublishVideoPost}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.list}>
        {posts?.posts.length ? (
          posts.posts.map((post) => (
            <View key={post.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.productChipTitle}>{post.product.name}</Text>
                <Text style={styles.statusPill}>{post.status}</Text>
              </View>
              <Text style={styles.captionPreview}>{post.caption}</Text>
              <Text style={styles.productChipMeta}>
                {post.product.currency && typeof post.product.priceMinor === "number"
                  ? formatMoney(locale, post.product.currency, post.product.priceMinor)
                  : post.product.status}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.card}>
            <Text style={styles.assetLabel}>{dictionary.sellerNoPosts}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    flex: 1
  },
  actionRow: {
    flexDirection: "row",
    gap: 12
  },
  assetLabel: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18
  },
  body: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonPressed: {
    opacity: 0.9
  },
  captionPreview: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 21
  },
  card: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 12,
    padding: 20
  },
  content: {
    gap: 16,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 18
  },
  errorText: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20
  },
  eyebrow: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  fieldGroup: {
    gap: 10
  },
  fieldLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  heroCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 32,
    borderWidth: 1,
    gap: 10,
    padding: 20
  },
  input: {
    backgroundColor: "#fffefb",
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  list: {
    gap: 12
  },
  messageText: {
    color: palette.accent,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20
  },
  multilineInput: {
    minHeight: 110,
    textAlignVertical: "top"
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: palette.accent,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16
  },
  primaryButtonText: {
    color: palette.card,
    fontSize: 14,
    fontWeight: "700"
  },
  productChip: {
    backgroundColor: "#fffefb",
    borderColor: palette.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 6,
    padding: 14,
    width: 180
  },
  productChipMeta: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17
  },
  productChipMetaSelected: {
    color: "#d7f0e7"
  },
  productChipSelected: {
    backgroundColor: palette.accent
  },
  productChipTitle: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "700"
  },
  productChipTitleSelected: {
    color: palette.card
  },
  productGrid: {
    gap: 10
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  sectionLabel: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: palette.accentMuted,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16
  },
  secondaryButtonText: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: "700"
  },
  stateScreen: {
    alignItems: "center",
    flex: 1,
    gap: 14,
    justifyContent: "center"
  },
  stateText: {
    color: palette.muted,
    fontSize: 15
  },
  statusPill: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: "700"
  },
  title: {
    color: palette.ink,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38
  },
  uploadRow: {
    flexDirection: "row",
    gap: 12
  }
});
