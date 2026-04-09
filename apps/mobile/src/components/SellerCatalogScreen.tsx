import type { CreateSellerProductInput, SellerCatalogData } from "../api/client";
import type { BuyerLocale } from "../lib/i18n";
import { getBuyerDictionary } from "../lib/i18n";
import { palette } from "../lib/theme";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

type SellerCatalogScreenProps = {
  catalog: SellerCatalogData | null;
  draft: CreateSellerProductInput;
  errorMessage: string | null;
  isCreating: boolean;
  isLoading: boolean;
  locale: BuyerLocale;
  message: string | null;
  onChangeDraft: (
    field:
      | keyof CreateSellerProductInput
      | "inventoryQuantity"
      | "priceMinor",
    value: string
  ) => void;
  onCreate: () => void;
};

export function SellerCatalogScreen({
  catalog,
  draft,
  errorMessage,
  isCreating,
  isLoading,
  locale,
  message,
  onChangeDraft,
  onCreate
}: SellerCatalogScreenProps) {
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
        <Text style={styles.title}>{dictionary.sellerCatalogTab}</Text>
        <Text style={styles.body}>{dictionary.sellerQuickListingBody}</Text>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      {message ? <Text style={styles.messageText}>{message}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{dictionary.sellerCreateListing}</Text>
        <View style={styles.form}>
          <TextInput
            onChangeText={(value) => onChangeDraft("name", value)}
            placeholder={dictionary.sellerProductName}
            placeholderTextColor={palette.muted}
            style={styles.input}
            value={draft.name ?? ""}
          />
          <TextInput
            onChangeText={(value) => onChangeDraft("category", value)}
            placeholder={dictionary.categoryFilter}
            placeholderTextColor={palette.muted}
            style={styles.input}
            value={draft.category ?? ""}
          />
          <TextInput
            onChangeText={(value) => onChangeDraft("description", value)}
            placeholder={dictionary.sellerDescription}
            placeholderTextColor={palette.muted}
            style={[styles.input, styles.multilineInput]}
            multiline
            value={draft.description ?? ""}
          />
          <TextInput
            onChangeText={(value) => onChangeDraft("sellerContact", value)}
            placeholder={dictionary.contactSeller}
            placeholderTextColor={palette.muted}
            style={styles.input}
            value={draft.sellerContact ?? ""}
          />
          <TextInput
            onChangeText={(value) => onChangeDraft("sellerAddress", value)}
            placeholder={dictionary.sellerAddress}
            placeholderTextColor={palette.muted}
            style={styles.input}
            value={draft.sellerAddress ?? ""}
          />
          <TextInput
            keyboardType="number-pad"
            onChangeText={(value) => onChangeDraft("priceMinor", value)}
            placeholder={dictionary.sellerPriceMinor}
            placeholderTextColor={palette.muted}
            style={styles.input}
            value={`${draft.variants?.[0]?.priceMinor ?? ""}`}
          />
          <TextInput
            keyboardType="number-pad"
            onChangeText={(value) => onChangeDraft("inventoryQuantity", value)}
            placeholder={dictionary.sellerInventory}
            placeholderTextColor={palette.muted}
            style={styles.input}
            value={`${draft.variants?.[0]?.inventoryQuantity ?? ""}`}
          />
        </View>

        <Pressable
          disabled={isCreating}
          onPress={onCreate}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.buttonPressed : null,
            isCreating ? styles.buttonDisabled : null
          ]}
        >
          <Text style={styles.primaryButtonText}>{dictionary.sellerCreateListing}</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {catalog?.products.map((product) => (
          <View key={product.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.statusPill}>
                {product.status}
              </Text>
            </View>
            <Text style={styles.productMeta}>{product.category}</Text>
            <Text style={styles.productMeta}>
              {product.variants[0]?.priceMinor ?? "--"} · {product.variants[0]?.inventory?.availableQuantity ?? 0} {dictionary.stockUnits}
            </Text>
            {product.validationIssues.length > 0 ? (
              <Text style={styles.warningText}>{product.validationIssues[0]?.message}</Text>
            ) : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  form: {
    gap: 12
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
    minHeight: 96,
    textAlignVertical: "top"
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: palette.accent,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 48
  },
  primaryButtonText: {
    color: palette.card,
    fontSize: 14,
    fontWeight: "700"
  },
  productMeta: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19
  },
  productName: {
    color: palette.ink,
    flex: 1,
    fontSize: 18,
    fontWeight: "700"
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  sectionLabel: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  stateScreen: {
    alignItems: "center",
    flex: 1,
    gap: 14,
    justifyContent: "center",
    paddingHorizontal: 28
  },
  stateText: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center"
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
  warningText: {
    color: palette.danger,
    fontSize: 13,
    lineHeight: 19
  }
});
