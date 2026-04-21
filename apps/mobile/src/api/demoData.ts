import type { BuyerProductDetail, BuyerVideoFeedResult } from "./client";

const now = new Date().toISOString();

export const demoVideoFeed: BuyerVideoFeedResult = {
  items: [
    {
      caption: "Mekong Crafts launch drop",
      campaignBadges: ["FEATURED_DROP"],
      id: "demo-mekong-krama-drop",
      isPinned: true,
      product: {
        category: "Accessories",
        description:
          "Handwoven cotton krama scarf for daily wear, gifting, and festival styling.",
        featuredImageUrl:
          "https://placehold.co/1200x1600/f3ecdf/10342d/png?text=Krama+Scarf",
        id: "demo-product-krama-scarf",
        leadVariant: {
          availableQuantity: 26,
          compareAtPriceMinor: 28000,
          currency: "KHR",
          id: "demo-variant-krama-crimson",
          name: "Crimson Classic",
          priceMinor: 25000,
          sku: "MKC-KRAMA-CRIMSON",
        },
        name: "Krama Scarf",
        pricing: {
          compareAtPriceMinor: 28000,
          currency: "KHR",
          priceMinor: 25000,
        },
        seller: {
          contact: "mekong-crafts@khmercart.local",
          displayName: "Mekong Crafts",
          id: "demo-seller-mekong-crafts",
          slug: "mekong-crafts",
        },
        slug: "krama-scarf",
        stock: {
          availableQuantity: 44,
          state: "IN_STOCK",
        },
        variants: [
          {
            availableQuantity: 26,
            compareAtPriceMinor: 28000,
            currency: "KHR",
            id: "demo-variant-krama-crimson",
            name: "Crimson Classic",
            priceMinor: 25000,
            sku: "MKC-KRAMA-CRIMSON",
          },
          {
            availableQuantity: 18,
            compareAtPriceMinor: null,
            currency: "KHR",
            id: "demo-variant-krama-indigo",
            name: "Indigo Classic",
            priceMinor: 25000,
            sku: "MKC-KRAMA-INDIGO",
          },
        ],
      },
      publishedAt: now,
      seller: {
        contact: "mekong-crafts@khmercart.local",
        displayName: "Mekong Crafts",
        id: "demo-seller-mekong-crafts",
        slug: "mekong-crafts",
      },
      shoppableProducts: [
        {
          id: "demo-product-krama-scarf",
          name: "Krama Scarf",
          slug: "krama-scarf",
        },
      ],
      video: {
        aspectRatio: 0.5625,
        durationSec: 15,
        posterUrl:
          "https://placehold.co/720x1280/125b50/f4f0e8/png?text=Mekong+Crafts+Drop",
        url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
      },
    },
    {
      caption: "Small-batch pantry restock",
      campaignBadges: ["SELLER_PICK"],
      id: "demo-tonle-prahok-drop",
      isPinned: false,
      product: {
        category: "Cooking Kits",
        description:
          "Prahok spice kit with herbs for classic Khmer cooking and quick weeknight dishes.",
        featuredImageUrl:
          "https://placehold.co/1200x1600/f7efe2/5b3a12/png?text=Prahok+Kit",
        id: "demo-product-prahok-spice-kit",
        leadVariant: {
          availableQuantity: 14,
          compareAtPriceMinor: 1099,
          currency: "USD",
          id: "demo-variant-prahok-home",
          name: "Home Cook Medium",
          priceMinor: 949,
          sku: "TLG-PRAHOK-HOME",
        },
        name: "Prahok Spice Kit",
        pricing: {
          compareAtPriceMinor: 1099,
          currency: "USD",
          priceMinor: 949,
        },
        seller: {
          contact: "tonle-gourmet@khmercart.local",
          displayName: "Tonle Gourmet",
          id: "demo-seller-tonle-gourmet",
          slug: "tonle-gourmet",
        },
        slug: "prahok-spice-kit",
        stock: {
          availableQuantity: 21,
          state: "IN_STOCK",
        },
        variants: [
          {
            availableQuantity: 14,
            compareAtPriceMinor: 1099,
            currency: "USD",
            id: "demo-variant-prahok-home",
            name: "Home Cook Medium",
            priceMinor: 949,
            sku: "TLG-PRAHOK-HOME",
          },
          {
            availableQuantity: 7,
            compareAtPriceMinor: null,
            currency: "USD",
            id: "demo-variant-prahok-chef",
            name: "Chef Pack Hot",
            priceMinor: 1499,
            sku: "TLG-PRAHOK-CHEF",
          },
        ],
      },
      publishedAt: now,
      seller: {
        contact: "tonle-gourmet@khmercart.local",
        displayName: "Tonle Gourmet",
        id: "demo-seller-tonle-gourmet",
        slug: "tonle-gourmet",
      },
      shoppableProducts: [
        {
          id: "demo-product-prahok-spice-kit",
          name: "Prahok Spice Kit",
          slug: "prahok-spice-kit",
        },
      ],
      video: {
        aspectRatio: 0.5625,
        durationSec: 15,
        posterUrl:
          "https://placehold.co/720x1280/5b3a12/f7efe2/png?text=Tonle+Gourmet+Drop",
        url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      },
    },
  ],
  nextCursor: null,
};

function toProductDetail(slug: string): BuyerProductDetail | null {
  const feedItem = demoVideoFeed.items.find((item) => item.product.slug === slug);

  if (!feedItem) {
    return null;
  }

  const product = feedItem.product;

  return {
    category: product.category,
    description: product.description,
    disclosures: {
      returnPolicy: "7-day return support for eligible marketplace orders.",
      sellerAddress: "Phnom Penh, Cambodia",
      sellerContact: product.seller.contact,
    },
    featuredImage: product.featuredImageUrl
      ? {
          altText: product.name,
          id: `${product.id}-featured`,
          isPrimary: true,
          url: product.featuredImageUrl,
        }
      : null,
    id: product.id,
    images: product.featuredImageUrl
      ? [
          {
            altText: product.name,
            id: `${product.id}-featured`,
            isPrimary: true,
            url: product.featuredImageUrl,
          },
        ]
      : [],
    leadVariant: {
      ...product.leadVariant,
      attributes: null,
      isDefault: true,
      weightGrams: null,
    },
    name: product.name,
    pricing: product.pricing,
    publishedAt: feedItem.publishedAt,
    reviewSummary: {
      averageRating: 4.8,
      reviewCount: product.slug === "krama-scarf" ? 128 : 46,
    },
    seller: product.seller,
    sellerRating: {
      averageRating: 4.9,
      reviewCount: product.slug === "krama-scarf" ? 312 : 89,
    },
    slug: product.slug,
    stock: product.stock,
    variants: product.variants.map((variant, index) => ({
      ...variant,
      attributes: null,
      isDefault: index === 0,
      weightGrams: null,
    })),
    bundles: [],
  };
}

export function readDemoProduct(slug: string) {
  return toProductDetail(slug);
}
