import { readAuthConfig, requireRoleFromHeaders } from "@khmercart/core/auth";
import {
  getSellerCatalogData,
  getSellerDashboardData,
  getSellerShippingQueueData,
  getSellerVideoPostsData
} from "@khmercart/db";
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
  const [dashboard, catalog, shipping, videoPosts] = await Promise.all([
    getSellerDashboardData(session.user.id),
    getSellerCatalogData(session.user.id),
    getSellerShippingQueueData(session.user.id),
    getSellerVideoPostsData(session.user.id)
  ]);

  return (
    <AppShell app="seller">
      <SellerStudio
        key={[
          dashboard.seller.id ?? "new",
          dashboard.seller.kycStatus,
          dashboard.documents.map((document) => document.id).join(","),
          dashboard.seller.kycNotes,
          dashboard.campaigns.map((campaign) => `${campaign.id}:${campaign.status}:${campaign.boostScore}`).join(","),
          catalog.products.map((product) => `${product.id}:${product.updatedAt}`).join(","),
          videoPosts.posts.map((post) => `${post.id}:${post.isPinned}:${post.manualBoost}`).join(","),
          shipping.orders
            .map(
              (order) =>
                `${order.orderId}:${order.state}:${order.shipment?.status ?? "NONE"}:${order.shipment?.updates.length ?? 0}`
            )
            .join(",")
        ].join(":")}
        initialCatalog={catalog}
        initialData={dashboard}
        initialShipping={shipping}
        initialVideoPosts={videoPosts}
      />
    </AppShell>
  );
}
