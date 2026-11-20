import { copyFile, mkdir } from "node:fs/promises";
import { CATEGORIES, CURATED_COLLECTIONS } from "../src/data/categories";
import { PRODUCTS } from "../src/data/products";

const images = new Set([
  "/images/hero-atelier-linen.webp",
  "/images/atelier-workbench.webp",
  ...CATEGORIES.map((category) => category.image),
  ...CURATED_COLLECTIONS.map((collection) => collection.image),
  ...PRODUCTS.flatMap((product) => product.images.map((image) => image.url)),
]);

async function stageImages() {
  await mkdir("storefront/out/images", { recursive: true });
  for (const image of images) {
    if (!/^\/images\/[a-z0-9-]+\.webp$/.test(image)) {
      throw new Error(`Vitrin görseli geçersiz: ${image}`);
    }
    await copyFile(`public${image}`, `storefront/out${image}`);
  }
}

void stageImages().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
