import { BuyerShell } from "./buyer-shell";
import { DiscoveryFeed } from "./discovery-feed";
import {
  readDefaultBuyerLocale,
  readSupportedBuyerLocales,
  resolveBuyerLocale
} from "./lib/i18n";

type BuyerPageProps = {
  searchParams: Promise<{
    locale?: string;
  }>;
};

export default async function BuyerPage({ searchParams }: BuyerPageProps) {
  const params = await searchParams;
  const supportedLocales = readSupportedBuyerLocales(process.env);
  const locale = resolveBuyerLocale(
    params.locale,
    supportedLocales,
    readDefaultBuyerLocale(process.env)
  );

  return (
    <BuyerShell locale={locale} supportedLocales={supportedLocales}>
      <DiscoveryFeed locale={locale} />
    </BuyerShell>
  );
}
