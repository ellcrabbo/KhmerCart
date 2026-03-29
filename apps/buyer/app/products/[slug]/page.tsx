import { BuyerShell } from "../../buyer-shell";
import {
  readDefaultBuyerLocale,
  readSupportedBuyerLocales,
  resolveBuyerLocale
} from "../../lib/i18n";
import { ProductDetailView } from "../../product-detail-view";

type BuyerProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    locale?: string;
  }>;
};

export default async function BuyerProductPage({
  params,
  searchParams
}: BuyerProductPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const supportedLocales = readSupportedBuyerLocales(process.env);
  const locale = resolveBuyerLocale(
    query.locale,
    supportedLocales,
    readDefaultBuyerLocale(process.env)
  );

  return (
    <BuyerShell locale={locale} supportedLocales={supportedLocales}>
      <ProductDetailView locale={locale} slug={slug} />
    </BuyerShell>
  );
}
