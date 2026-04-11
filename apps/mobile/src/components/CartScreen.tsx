import type {
  BuyerCart,
  BuyerCheckoutPreview,
  CheckoutAddressInput,
  PaymentMethod
} from "../api/client";
import { formatDateTime, formatMoney } from "../lib/format";
import type { BuyerLocale } from "../lib/i18n";
import {
  getBuyerDictionary,
  resolvePaymentMethodLabel
} from "../lib/i18n";
import { palette } from "../lib/theme";
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

type AddressField =
  | "city"
  | "country"
  | "deliveryNotes"
  | "fullName"
  | "line1"
  | "line2"
  | "phone"
  | "postalCode"
  | "stateProvince";

type CartScreenProps = {
  cart: BuyerCart;
  checkoutPreview: BuyerCheckoutPreview | null;
  appliedCouponCode: string;
  couponCodeDraft: string;
  errorMessage: string | null;
  isLoading: boolean;
  isMutatingCart: boolean;
  isPreviewLoading: boolean;
  isSubmittingCheckout: boolean;
  locale: BuyerLocale;
  notes: string;
  paymentMethods: PaymentMethod[];
  selectedPaymentMethod: PaymentMethod | null;
  shippingAddress: CheckoutAddressInput;
  onBack: () => void;
  onChangeAddressField: (field: AddressField, value: string) => void;
  onChangeCouponCode: (value: string) => void;
  onChangeNotes: (value: string) => void;
  onDecreaseItem: (variantId: string) => void;
  onIncreaseItem: (variantId: string) => void;
  onRefreshPreview: () => void;
  onRemoveItem: (variantId: string) => void;
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  onSubmitCheckout: () => void;
};

const addressFields: Array<{
  field: AddressField;
  keyboardType?: "default" | "number-pad" | "phone-pad";
}> = [
  {
    field: "fullName"
  },
  {
    field: "phone",
    keyboardType: "phone-pad"
  },
  {
    field: "line1"
  },
  {
    field: "line2"
  },
  {
    field: "city"
  },
  {
    field: "stateProvince"
  },
  {
    field: "postalCode",
    keyboardType: "number-pad"
  },
  {
    field: "country"
  },
  {
    field: "deliveryNotes"
  }
];

function resolveFieldLabel(locale: BuyerLocale, field: AddressField) {
  const dictionary = getBuyerDictionary(locale);

  if (field === "fullName") {
    return dictionary.fullName;
  }

  if (field === "phone") {
    return dictionary.phone;
  }

  if (field === "line1") {
    return dictionary.line1;
  }

  if (field === "line2") {
    return dictionary.line2;
  }

  if (field === "city") {
    return dictionary.city;
  }

  if (field === "stateProvince") {
    return dictionary.stateProvince;
  }

  if (field === "postalCode") {
    return dictionary.postalCode;
  }

  if (field === "country") {
    return dictionary.country;
  }

  return dictionary.deliveryNotes;
}

export function CartScreen({
  appliedCouponCode,
  cart,
  checkoutPreview,
  couponCodeDraft,
  errorMessage,
  isLoading,
  isMutatingCart,
  isPreviewLoading,
  isSubmittingCheckout,
  locale,
  notes,
  paymentMethods,
  selectedPaymentMethod,
  shippingAddress,
  onBack,
  onChangeAddressField,
  onChangeCouponCode,
  onChangeNotes,
  onDecreaseItem,
  onIncreaseItem,
  onRefreshPreview,
  onRemoveItem,
  onSelectPaymentMethod,
  onSubmitCheckout
}: CartScreenProps) {
  const dictionary = getBuyerDictionary(locale);
  const updatedAt = formatDateTime(locale, cart.updatedAt);
  const isBusy = isMutatingCart || isSubmittingCheckout;
  const canCheckout =
    cart.itemCount > 0 &&
    paymentMethods.length > 0 &&
    selectedPaymentMethod !== null &&
    !isLoading &&
    !isBusy;

  if (isLoading) {
    return (
      <View style={styles.stateScreen}>
        <ActivityIndicator color={palette.accent} size="large" />
        <Text style={styles.stateText}>{dictionary.cartLoading}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>{dictionary.continueShopping}</Text>
      </Pressable>

      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>{dictionary.cartTitle}</Text>
        <Text style={styles.heroBody}>{dictionary.checkoutBody}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryLabel}>{dictionary.itemsLabel}</Text>
            <Text style={styles.summaryValue}>{cart.itemCount}</Text>
          </View>

          {cart.currency ? (
            <View style={styles.summaryChip}>
              <Text style={styles.summaryLabel}>{dictionary.total}</Text>
              <Text style={styles.summaryValue}>
                {formatMoney(locale, cart.currency, cart.totalMinor)}
              </Text>
            </View>
          ) : null}
        </View>
        {updatedAt ? <Text style={styles.metaLine}>{updatedAt}</Text> : null}
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {cart.items.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>{dictionary.cartEmpty}</Text>
        </View>
      ) : (
        <View style={styles.section}>
          {cart.items.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.itemRow}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.image} />
                ) : (
                  <View style={styles.placeholder}>
                    <Text style={styles.placeholderText}>KC</Text>
                  </View>
                )}

                <View style={styles.itemCopy}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <Text style={styles.itemVariant}>{item.variantName}</Text>
                  <Text style={styles.itemSeller}>{item.seller.displayName}</Text>
                  {item.currency && item.lineSubtotalMinor !== null ? (
                    <Text style={styles.itemTotal}>
                      {formatMoney(locale, item.currency, item.lineSubtotalMinor)}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.itemFooter}>
                <View style={styles.quantityRow}>
                  <Pressable
                    accessibilityLabel={dictionary.quantityDecrease}
                    disabled={isBusy}
                    onPress={() => onDecreaseItem(item.variantId)}
                    style={({ pressed }) => [
                      styles.quantityButton,
                      pressed ? styles.buttonPressed : null,
                      isBusy ? styles.buttonDisabled : null
                    ]}
                  >
                    <Text style={styles.quantityButtonText}>-</Text>
                  </Pressable>

                  <Text style={styles.quantityValue}>
                    {dictionary.itemQuantity} {item.quantity}
                  </Text>

                  <Pressable
                    accessibilityLabel={dictionary.quantityIncrease}
                    disabled={isBusy || item.quantity >= item.availableQuantity}
                    onPress={() => onIncreaseItem(item.variantId)}
                    style={({ pressed }) => [
                      styles.quantityButton,
                      pressed ? styles.buttonPressed : null,
                      isBusy || item.quantity >= item.availableQuantity
                        ? styles.buttonDisabled
                        : null
                    ]}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </Pressable>
                </View>

                <Pressable
                  disabled={isBusy}
                  onPress={() => onRemoveItem(item.variantId)}
                  style={({ pressed }) => [
                    styles.removeButton,
                    pressed ? styles.buttonPressed : null,
                    isBusy ? styles.buttonDisabled : null
                  ]}
                >
                  <Text style={styles.removeButtonText}>{dictionary.removeItem}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{dictionary.shippingAddress}</Text>
        <Text style={styles.helperText}>{dictionary.billingSameAsShipping}</Text>

        <View style={styles.form}>
          {addressFields.map((fieldConfig) => (
            <View key={fieldConfig.field} style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                {resolveFieldLabel(locale, fieldConfig.field)}
              </Text>
              <TextInput
                keyboardType={fieldConfig.keyboardType ?? "default"}
                multiline={fieldConfig.field === "deliveryNotes"}
                onChangeText={(value) =>
                  onChangeAddressField(fieldConfig.field, value)
                }
                placeholder={resolveFieldLabel(locale, fieldConfig.field)}
                placeholderTextColor={palette.muted}
                style={[
                  styles.input,
                  fieldConfig.field === "deliveryNotes" ? styles.multilineInput : null
                ]}
                value={(shippingAddress[fieldConfig.field] ?? "") as string}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{dictionary.paymentMethodLabel}</Text>
        <View style={styles.methodGrid}>
          {paymentMethods.map((method) => {
            const isSelected = selectedPaymentMethod === method;

            return (
              <Pressable
                key={method}
                disabled={isSubmittingCheckout}
                onPress={() => onSelectPaymentMethod(method)}
                style={({ pressed }) => [
                  styles.methodChip,
                  isSelected ? styles.methodChipSelected : null,
                  pressed ? styles.buttonPressed : null
                ]}
              >
                <Text
                  style={[
                    styles.methodChipText,
                    isSelected ? styles.methodChipTextSelected : null
                  ]}
                >
                  {resolvePaymentMethodLabel(locale, method)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{dictionary.notesLabel}</Text>
        <TextInput
          multiline
          onChangeText={onChangeNotes}
          placeholder={dictionary.notesLabel}
          placeholderTextColor={palette.muted}
          style={[styles.input, styles.multilineInput]}
          value={notes}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Coupon</Text>
        <View style={styles.couponRow}>
          <TextInput
            autoCapitalize="characters"
            onChangeText={onChangeCouponCode}
            placeholder="Enter promo code"
            placeholderTextColor={palette.muted}
            style={[styles.input, styles.couponInput]}
            value={couponCodeDraft}
          />
          <Pressable
            disabled={isBusy || isPreviewLoading}
            onPress={onRefreshPreview}
            style={({ pressed }) => [
              styles.applyButton,
              pressed ? styles.buttonPressed : null,
              isBusy || isPreviewLoading ? styles.buttonDisabled : null
            ]}
          >
            {isPreviewLoading ? (
              <ActivityIndicator color={palette.card} />
            ) : (
              <Text style={styles.applyButtonText}>Apply</Text>
            )}
          </Pressable>
        </View>
        {checkoutPreview?.coupon ? (
          <Text style={styles.helperText}>{checkoutPreview.coupon.title} applied.</Text>
        ) : appliedCouponCode ? (
          <Text style={styles.helperText}>No valid coupon is currently applied.</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{dictionary.orderSummary}</Text>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{dictionary.subtotal}</Text>
          <Text style={styles.totalValue}>
            {cart.currency
              ? formatMoney(locale, cart.currency, cart.subtotalMinor)
              : "--"}
          </Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Shipping estimate</Text>
          <Text style={styles.totalValue}>
            {cart.currency
              ? formatMoney(locale, cart.currency, checkoutPreview?.shippingMinor ?? 0)
              : "--"}
          </Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Discount</Text>
          <Text style={styles.totalValue}>
            {cart.currency
              ? `-${formatMoney(locale, cart.currency, checkoutPreview?.discountMinor ?? 0)}`
              : "--"}
          </Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{dictionary.total}</Text>
          <Text style={styles.grandTotalValue}>
            {cart.currency
              ? formatMoney(
                  locale,
                  cart.currency,
                  checkoutPreview?.totalMinor ?? cart.totalMinor
                )
              : "--"}
          </Text>
        </View>

        <Pressable
          disabled={!canCheckout}
          onPress={onSubmitCheckout}
          style={({ pressed }) => [
            styles.checkoutButton,
            pressed ? styles.buttonPressed : null,
            !canCheckout ? styles.buttonDisabled : null
          ]}
        >
          {isSubmittingCheckout ? (
            <ActivityIndicator color={palette.card} />
          ) : (
            <Text style={styles.checkoutButtonText}>{dictionary.checkoutNow}</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  applyButton: {
    alignItems: "center",
    backgroundColor: palette.accent,
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 52,
    minWidth: 88,
    paddingHorizontal: 16
  },
  applyButtonText: {
    color: palette.card,
    fontSize: 14,
    fontWeight: "700"
  },
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 8,
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
    gap: 14,
    padding: 20
  },
  checkoutButton: {
    alignItems: "center",
    backgroundColor: palette.accent,
    borderRadius: 999,
    justifyContent: "center",
    marginTop: 8,
    minHeight: 54
  },
  checkoutButtonText: {
    color: palette.card,
    fontSize: 15,
    fontWeight: "700"
  },
  content: {
    gap: 16,
    paddingBottom: 48,
    paddingHorizontal: 20,
    paddingTop: 18
  },
  couponInput: {
    flex: 1
  },
  couponRow: {
    flexDirection: "row",
    gap: 10
  },
  emptyText: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22
  },
  errorText: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20
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
    fontSize: 12,
    fontWeight: "700"
  },
  form: {
    gap: 12
  },
  grandTotalValue: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: "700"
  },
  helperText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20
  },
  heroBody: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 23
  },
  heroCard: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 32,
    borderWidth: 1,
    gap: 14,
    padding: 20
  },
  image: {
    backgroundColor: palette.sunMuted,
    borderRadius: 20,
    height: 92,
    width: 92
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
  itemCopy: {
    flex: 1,
    gap: 4
  },
  itemFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  itemName: {
    color: palette.ink,
    fontSize: 17,
    fontWeight: "700"
  },
  itemRow: {
    flexDirection: "row",
    gap: 14
  },
  itemSeller: {
    color: palette.muted,
    fontSize: 13
  },
  itemTotal: {
    color: palette.accent,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4
  },
  itemVariant: {
    color: palette.ink,
    fontSize: 14
  },
  metaLine: {
    color: palette.muted,
    fontSize: 13
  },
  methodChip: {
    backgroundColor: "#fffefb",
    borderColor: palette.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  methodChipSelected: {
    backgroundColor: palette.accent,
    borderColor: palette.accent
  },
  methodChipText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "700"
  },
  methodChipTextSelected: {
    color: palette.card
  },
  methodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: "top"
  },
  placeholder: {
    alignItems: "center",
    backgroundColor: palette.sunMuted,
    borderRadius: 20,
    height: 92,
    justifyContent: "center",
    width: 92
  },
  placeholderText: {
    color: palette.sun,
    fontSize: 16,
    fontWeight: "700"
  },
  quantityButton: {
    alignItems: "center",
    backgroundColor: palette.accentMuted,
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  quantityButtonText: {
    color: palette.accent,
    fontSize: 20,
    fontWeight: "700"
  },
  quantityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  quantityValue: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "700"
  },
  removeButton: {
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  removeButtonText: {
    color: palette.danger,
    fontSize: 13,
    fontWeight: "700"
  },
  section: {
    gap: 14
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
  summaryChip: {
    backgroundColor: "#fffefb",
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    padding: 14
  },
  summaryLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12
  },
  summaryValue: {
    color: palette.ink,
    fontSize: 19,
    fontWeight: "700"
  },
  totalLabel: {
    color: palette.muted,
    fontSize: 14
  },
  totalRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  totalValue: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "700"
  }
});
