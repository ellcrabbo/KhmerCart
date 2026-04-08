import type { AuthSession, RequestOtpResponse } from "../api/client";
import type { BuyerLocale } from "../lib/i18n";
import { getBuyerDictionary } from "../lib/i18n";
import { palette } from "../lib/theme";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type AuthPanelProps = {
  apiBaseUrl: string;
  authError: string | null;
  authMessage: string | null;
  code: string;
  identifier: string;
  isSubmitting: boolean;
  locale: BuyerLocale;
  otpRequest: RequestOtpResponse | null;
  session: AuthSession | null;
  onChangeCode: (value: string) => void;
  onChangeIdentifier: (value: string) => void;
  onRequestOtp: () => void;
  onSignOut: () => void;
  onVerifyOtp: () => void;
};

function resolveSessionLabel(session: AuthSession) {
  return session.user.email ?? session.user.phone ?? session.user.id;
}

export function AuthPanel({
  apiBaseUrl,
  authError,
  authMessage,
  code,
  identifier,
  isSubmitting,
  locale,
  otpRequest,
  session,
  onChangeCode,
  onChangeIdentifier,
  onRequestOtp,
  onSignOut,
  onVerifyOtp
}: AuthPanelProps) {
  const dictionary = getBuyerDictionary(locale);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.copyBlock}>
          <Text style={styles.eyebrow}>{dictionary.authTitle}</Text>
          <Text style={styles.body}>{dictionary.authBody}</Text>
        </View>

        {session ? (
          <Pressable
            onPress={onSignOut}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed ? styles.buttonPressed : null
            ]}
          >
            <Text style={styles.secondaryButtonText}>{dictionary.signOut}</Text>
          </Pressable>
        ) : null}
      </View>

      {session ? (
        <View style={styles.sessionBadge}>
          <Text style={styles.sessionLabel}>{dictionary.sessionSignedIn}</Text>
          <Text style={styles.sessionValue}>{resolveSessionLabel(session)}</Text>
        </View>
      ) : (
        <View style={styles.form}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={onChangeIdentifier}
            placeholder={dictionary.identifierPlaceholder}
            placeholderTextColor={palette.muted}
            style={styles.input}
            value={identifier}
          />

          <View style={styles.inlineRow}>
            <View style={styles.codeInputWrap}>
              <TextInput
                keyboardType="number-pad"
                onChangeText={onChangeCode}
                placeholder={dictionary.otpCodePlaceholder}
                placeholderTextColor={palette.muted}
                style={styles.input}
                value={code}
              />
            </View>

            <Pressable
              disabled={isSubmitting}
              onPress={onVerifyOtp}
              style={({ pressed }) => [
                styles.primaryButton,
                isSubmitting ? styles.buttonDisabled : null,
                pressed ? styles.buttonPressed : null
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={palette.card} />
              ) : (
                <Text style={styles.primaryButtonText}>{dictionary.verifyOtp}</Text>
              )}
            </Pressable>
          </View>

          <Pressable
            disabled={isSubmitting}
            onPress={onRequestOtp}
            style={({ pressed }) => [
              styles.secondaryButton,
              isSubmitting ? styles.buttonDisabled : null,
              pressed ? styles.buttonPressed : null
            ]}
          >
            <Text style={styles.secondaryButtonText}>{dictionary.requestOtp}</Text>
          </Pressable>
        </View>
      )}

      {otpRequest?.devCode ? (
        <View style={styles.devCodeBadge}>
          <Text style={styles.devCodeLabel}>{dictionary.devCode}</Text>
          <Text style={styles.devCodeValue}>{otpRequest.devCode}</Text>
        </View>
      ) : null}

      {authMessage ? <Text style={styles.message}>{authMessage}</Text> : null}
      {authError ? <Text style={styles.error}>{authError}</Text> : null}

      <View style={styles.apiRow}>
        <Text style={styles.apiLabel}>{dictionary.apiBaseUrl}</Text>
        <Text style={styles.apiValue}>{apiBaseUrl}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  apiLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  apiRow: {
    borderTopColor: palette.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
    marginTop: 18,
    paddingTop: 18
  },
  apiValue: {
    color: palette.ink,
    fontSize: 14
  },
  body: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonPressed: {
    opacity: 0.88
  },
  card: {
    backgroundColor: palette.card,
    borderColor: palette.border,
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    shadowColor: palette.shadow,
    shadowOffset: {
      height: 14,
      width: 0
    },
    shadowOpacity: 1,
    shadowRadius: 30
  },
  codeInputWrap: {
    flex: 1
  },
  copyBlock: {
    flex: 1,
    gap: 6
  },
  devCodeBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: palette.sunMuted,
    borderRadius: 999,
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  devCodeLabel: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  devCodeValue: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1
  },
  error: {
    color: palette.danger,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12
  },
  eyebrow: {
    color: palette.sun,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase"
  },
  form: {
    gap: 12,
    marginTop: 18
  },
  header: {
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between"
  },
  inlineRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  input: {
    backgroundColor: "#fffefb",
    borderColor: palette.border,
    borderRadius: 18,
    borderWidth: 1,
    color: palette.ink,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  message: {
    color: palette.accent,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: palette.accent,
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 52,
    minWidth: 120,
    paddingHorizontal: 16
  },
  primaryButtonText: {
    color: palette.card,
    fontSize: 14,
    fontWeight: "700"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: palette.sunMuted,
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16
  },
  secondaryButtonText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "700"
  },
  sessionBadge: {
    backgroundColor: palette.accentMuted,
    borderRadius: 22,
    gap: 4,
    marginTop: 18,
    padding: 16
  },
  sessionLabel: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  sessionValue: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "700"
  }
});
