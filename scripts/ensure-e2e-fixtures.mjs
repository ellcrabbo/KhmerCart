import { config as loadEnv } from "dotenv";
import pg from "pg";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ override: true, path: "apps/web/.env.local", quiet: true });

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required for local E2E fixtures.");
  process.exit(1);
}

const now = new Date();
const ids = {
  buyer: "e2e_buyer",
  cart: "e2e_cart",
  image: "e2e_product_image_krama",
  inventory: "e2e_inventory_krama_crimson",
  product: "e2e_product_krama_scarf",
  seller: "e2e_seller",
  sellerUser: "e2e_seller_user",
  variant: "e2e_variant_krama_crimson",
};

const client = new Client({
  connectionString: databaseUrl,
});

await client.connect();

try {
  await client.query("BEGIN");

  await client.query(
    `
      INSERT INTO "User" ("id", "email", "phone", "fullName", "isActive", "createdAt", "updatedAt")
      VALUES ($1, 'buyer@khmercart.local', '+85510000002', 'E2E Buyer', true, $2, $2)
      ON CONFLICT ("email") DO UPDATE
      SET "fullName" = EXCLUDED."fullName",
          "isActive" = true,
          "updatedAt" = EXCLUDED."updatedAt"
    `,
    [ids.buyer, now],
  );

  const buyer = await client.query(
    `SELECT "id" FROM "User" WHERE "email" = 'buyer@khmercart.local' LIMIT 1`,
  );
  const buyerId = buyer.rows[0]?.id;

  await client.query(
    `
      INSERT INTO "UserRoleAssignment" ("userId", "role", "createdAt")
      VALUES ($1, 'BUYER', $2)
      ON CONFLICT ("userId", "role") DO NOTHING
    `,
    [buyerId, now],
  );

  await client.query(
    `
      INSERT INTO "Cart" ("id", "buyerId", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $3)
      ON CONFLICT ("buyerId") DO UPDATE
      SET "updatedAt" = EXCLUDED."updatedAt"
      RETURNING "id"
    `,
    [ids.cart, buyerId, now],
  );

  const cart = await client.query(
    `SELECT "id" FROM "Cart" WHERE "buyerId" = $1 LIMIT 1`,
    [buyerId],
  );
  const cartId = cart.rows[0]?.id;

  await client.query(`DELETE FROM "CartItem" WHERE "cartId" = $1`, [cartId]);

  await client.query(
    `
      INSERT INTO "User" ("id", "email", "phone", "fullName", "isActive", "createdAt", "updatedAt")
      VALUES ($1, 'seller-e2e@khmercart.local', '+85510000003', 'E2E Seller', true, $2, $2)
      ON CONFLICT ("email") DO UPDATE
      SET "fullName" = EXCLUDED."fullName",
          "isActive" = true,
          "updatedAt" = EXCLUDED."updatedAt"
    `,
    [ids.sellerUser, now],
  );

  const sellerUser = await client.query(
    `SELECT "id" FROM "User" WHERE "email" = 'seller-e2e@khmercart.local' LIMIT 1`,
  );
  const sellerUserId = sellerUser.rows[0]?.id;

  await client.query(
    `
      INSERT INTO "UserRoleAssignment" ("userId", "role", "createdAt")
      VALUES ($1, 'SELLER', $2)
      ON CONFLICT ("userId", "role") DO NOTHING
    `,
    [sellerUserId, now],
  );

  await client.query(
    `
      INSERT INTO "Seller" (
        "id", "userId", "slug", "displayName", "legalName", "businessDescription",
        "supportEmail", "supportPhone", "defaultCurrency", "kycStatus", "riskTier",
        "isActive", "createdAt", "updatedAt"
      )
      VALUES (
        $1, $2, 'mekong-made', 'Mekong Made', 'Mekong Made Co.',
        'E2E seller for mobile web checkout smoke.',
        'seller-e2e@khmercart.local', '+85510000003', 'KHR', 'APPROVED', 'LOW',
        true, $3, $3
      )
      ON CONFLICT ("slug") DO UPDATE
      SET "displayName" = EXCLUDED."displayName",
          "kycStatus" = 'APPROVED',
          "isActive" = true,
          "updatedAt" = EXCLUDED."updatedAt"
    `,
    [ids.seller, sellerUserId, now],
  );

  const seller = await client.query(
    `SELECT "id" FROM "Seller" WHERE "slug" = 'mekong-made'`,
  );
  const sellerId = seller.rows[0]?.id;

  await client.query(
    `
      INSERT INTO "Product" (
        "id", "sellerId", "name", "slug", "description", "category", "returnPolicy",
        "status", "moderationStatus", "publishedAt", "defaultCurrency", "createdAt", "updatedAt"
      )
      VALUES (
        $1, $2, 'Krama Scarf', 'krama-scarf',
        'Handwoven cotton krama scarf for daily wear and gifting.',
        'Accessories',
        'Returns accepted within 7 days if unused and in original packaging.',
        'ACTIVE', 'APPROVED', $3, 'KHR', $3, $3
      )
      ON CONFLICT ("sellerId", "slug") DO UPDATE
      SET "name" = EXCLUDED."name",
          "description" = EXCLUDED."description",
          "category" = EXCLUDED."category",
          "status" = 'ACTIVE',
          "moderationStatus" = 'APPROVED',
          "publishedAt" = EXCLUDED."publishedAt",
          "updatedAt" = EXCLUDED."updatedAt"
    `,
    [ids.product, sellerId, now],
  );

  const product = await client.query(
    `SELECT "id" FROM "Product" WHERE "sellerId" = $1 AND "slug" = 'krama-scarf' LIMIT 1`,
    [sellerId],
  );
  const productId = product.rows[0]?.id;

  await client.query(
    `
      INSERT INTO "ProductVariant" (
        "id", "productId", "sku", "name", "currency", "priceMinor",
        "compareAtPriceMinor", "attributes", "isActive", "isDefault", "position",
        "createdAt", "updatedAt"
      )
      VALUES (
        $1, $2, 'MKC-KRAMA-CRIMSON', 'Crimson Classic', 'KHR', 25000,
        28000, '{"color":"Crimson","weave":"Classic"}'::jsonb, true, true, 0,
        $3, $3
      )
      ON CONFLICT ("sku") DO UPDATE
      SET "productId" = EXCLUDED."productId",
          "name" = EXCLUDED."name",
          "currency" = 'KHR',
          "priceMinor" = 25000,
          "compareAtPriceMinor" = 28000,
          "isActive" = true,
          "isDefault" = true,
          "updatedAt" = EXCLUDED."updatedAt"
    `,
    [ids.variant, productId, now],
  );

  const variant = await client.query(
    `SELECT "id" FROM "ProductVariant" WHERE "sku" = 'MKC-KRAMA-CRIMSON' LIMIT 1`,
  );
  const variantId = variant.rows[0]?.id;

  await client.query(
    `
      INSERT INTO "Inventory" (
        "id", "variantId", "sellerId", "onHandQuantity", "reservedQuantity",
        "availableQuantity", "createdAt", "updatedAt"
      )
      VALUES ($1, $2, $3, 26, 0, 26, $4, $4)
      ON CONFLICT ("variantId") DO UPDATE
      SET "sellerId" = EXCLUDED."sellerId",
          "onHandQuantity" = 26,
          "reservedQuantity" = 0,
          "availableQuantity" = 26,
          "updatedAt" = EXCLUDED."updatedAt"
    `,
    [ids.inventory, variantId, sellerId, now],
  );

  await client.query(`DELETE FROM "ProductImage" WHERE "id" = $1`, [ids.image]);
  await client.query(
    `
      INSERT INTO "ProductImage" (
        "id", "productId", "url", "altText", "position", "isPrimary", "createdAt", "updatedAt"
      )
      VALUES (
        $1, $2,
        'https://placehold.co/1200x1600/f3ecdf/10342d/png?text=Krama+Scarf',
        'Krama Scarf', 0, true, $3, $3
      )
    `,
    [ids.image, productId, now],
  );

  await client.query("COMMIT");
  console.log(`E2E fixtures ready (${buyerId}, ${productId}, ${variantId}).`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
