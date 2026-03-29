import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import { getSellerCatalogData, getSellerDashboardData } from "@khmercart/db";
import { headers } from "next/headers";
import { AppShell } from "@khmercart/ui";
import { SellerStudio } from "./seller-studio";

export default async function SellerPage() {
  const headerList = await headers();
  const session = await requireRoleFromHeaders(
    headerList,
    readAuthConfig(process.env).jwtSecret,
    "SELLER"
  );
  const [dashboard, catalog] = await Promise.all([
    getSellerDashboardData(session.user.id),
    getSellerCatalogData(session.user.id)
  ]);

  return (
    <AppShell app="seller">
      <SellerStudio
        key={[
          dashboard.seller.id ?? "new",
          dashboard.seller.kycStatus,
          dashboard.documents.map((document) => document.id).join(","),
          dashboard.seller.kycNotes,
          catalog.products.map((product) => `${product.id}:${product.updatedAt}`).join(",")
        ].join(":")}
        initialCatalog={catalog}
        initialData={dashboard}
      />
    </AppShell>
  );
}
