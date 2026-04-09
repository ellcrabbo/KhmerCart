import type { SellerDashboardData, SaveSellerOnboardingInput } from "../api/client";
import type { BuyerLocale } from "../lib/i18n";
import { getBuyerDictionary } from "../lib/i18n";
import { palette } from "../lib/theme";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

type SellerOverviewScreenProps = {
  data: SellerDashboardData | null;
  errorMessage: string | null;
  form: SaveSellerOnboardingInput;
  isLoading: boolean;
  isSaving: boolean;
  locale: BuyerLocale;
  message: string | null;
  onChangeField: (field: keyof SaveSellerOnboardingInput, value: string) => void;
  onSave: () => void;
  onSubmitForReview: () => void;
};

const profileFields: Array<{
  field: keyof SaveSellerOnboardingInput;
  multiline?: boolean;
}> = [
  { field: "displayName" },
  { field: "slug" },
  { field: "legalName" },
  { field: "businessDescription", multiline: true },
  { field: "supportEmail" },
  { field: "supportPhone" },
  { field: "payoutBankName" },
  { field: "payoutAccountName" },
  { field: "payoutAccountNumber" }
];

function labelForField(locale: BuyerLocale, field: keyof SaveSellerOnboardingInput) {
  const dictionary = getBuyerDictionary(locale);

  switch (field) {
    case "displayName":
      return dictionary.sellerDisplayName;
    case "slug":
      return dictionary.sellerSlug;
    case "legalName":
      return dictionary.sellerLegalName;
    case "businessDescription":
      return dictionary.sellerDescription;
    case "supportEmail":
      return dictionary.sellerSupportEmail;
    case "supportPhone":
      return dictionary.sellerSupportPhone;
    case "payoutBankName":
      return dictionary.sellerPayoutBank;
    case "payoutAccountName":
      return dictionary.sellerPayoutName;
    case "payoutAccountNumber":
      return dictionary.sellerPayoutNumber;
    default:
      return field;
  }
}

export function SellerOverviewScreen({
  data,
  errorMessage,
  form,
  isLoading,
  isSaving,
  locale,
  message,
  onChangeField,
  onSave,
  onSubmitForReview
}: SellerOverviewScreenProps) {
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
        <Text style={styles.title}>{dictionary.sellerOverviewTab}</Text>
        <Text style={styles.body}>{dictionary.sellerOverviewBody}</Text>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      {message ? <Text style={styles.messageText}>{message}</Text> : null}

      {data ? (
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{dictionary.sellerKycStatus}</Text>
            <Text style={styles.summaryValue}>{data.seller.kycStatus}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{dictionary.sellerDocuments}</Text>
            <Text style={styles.summaryValue}>{data.documents.length}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{dictionary.sellerMissingRequirements}</Text>
            <Text style={styles.summaryValue}>{data.missingRequirements.length}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{dictionary.sellerDefaultCurrency}</Text>
            <Text style={styles.summaryValue}>{data.seller.defaultCurrency}</Text>
          </View>
        </View>
      ) : null}

      {data?.missingRequirements?.length ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{dictionary.sellerMissingRequirements}</Text>
          {data.missingRequirements.map((item) => (
            <Text key={item} style={styles.listItem}>
              • {item}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{dictionary.sellerDisplayName}</Text>
        <View style={styles.form}>
          {profileFields.map((fieldConfig) => (
            <View key={fieldConfig.field} style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{labelForField(locale, fieldConfig.field)}</Text>
              <TextInput
                multiline={fieldConfig.multiline}
                onChangeText={(value) => onChangeField(fieldConfig.field, value)}
                placeholder={labelForField(locale, fieldConfig.field)}
                placeholderTextColor={palette.muted}
                style={[styles.input, fieldConfig.multiline ? styles.multilineInput : null]}
                value={(form[fieldConfig.field] ?? "") as string}
              />
            </View>
          ))}
        </View>

        <View style={styles.actionRow}>
          <Pressable
            disabled={isSaving}
            onPress={onSave}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.buttonPressed : null,
              isSaving ? styles.buttonDisabled : null
            ]}
          >
            <Text style={styles.secondaryButtonText}>{dictionary.sellerSaveProfile}</Text>
          </Pressable>

          <Pressable
            disabled={isSaving}
            onPress={onSubmitForReview}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.buttonPressed : null,
              isSaving ? styles.buttonDisabled : null
            ]}
          >
            <Text style={styles.primaryButtonText}>{dictionary.sellerGoLive}</Text>
          </Pressable>
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
    gap: 16,
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
    gap: 6
  },
  fieldLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700"
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
  listItem: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 21
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
    flex: 1,
    justifyContent: "center",
    minHeight: 48
  },
  primaryButtonText: {
    color: palette.card,
    fontSize: 14,
    fontWeight: "700"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: palette.accentMuted,
    borderRadius: 999,
    flex: 1,
    justifyContent: "center",
    minHeight: 48
  },
  secondaryButtonText: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: "700"
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
  summaryCard: {
    backgroundColor: palette.sunMuted,
    borderRadius: 22,
    flexBasis: "47%",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 20
  },
  summaryLabel: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  summaryValue: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: "700"
  },
  title: {
    color: palette.ink,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 38
  }
});
