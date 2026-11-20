import type { PrismaClient } from "@/generated/prisma/client";
import type { Tx } from "@/server/db";
import { buildSearchText } from "./buildSearchText";

type Client = PrismaClient | Tx;

/**
 * Recomputes Product.searchText for the given products (all when omitted).
 * No "server-only" import so the `search:reindex` CLI (tsx) can use it with its own client.
 * Machine brands/models come from MachineModelFormat for the product's formats
 * (the formats a machine can read), never from invented compatibility.
 */
export async function reindexProducts(client: Client, productIds?: string[]): Promise<number> {
  const products = await client.product.findMany({
    where: productIds ? { id: { in: productIds } } : undefined,
    include: {
      category: { include: { parent: true } },
      tags: { include: { tag: true } },
      formats: { include: { format: true } },
      embroidery: { include: { hoopSize: true } },
      digitalFiles: { where: { isCurrent: true, status: "ACTIVE" }, include: { format: true } },
    },
  });
  const models = await client.machineModelFormat.findMany({
    include: { model: { include: { brand: true } }, format: true },
  });
  const byFormat = new Map<string, { brands: Set<string>; models: Set<string> }>();
  for (const m of models) {
    const e = byFormat.get(m.format.code) ?? { brands: new Set<string>(), models: new Set<string>() };
    e.brands.add(m.model.brand.name);
    e.models.add(m.model.name);
    byFormat.set(m.format.code, e);
  }

  let n = 0;
  for (const p of products) {
    const formatCodes = new Set<string>([...p.formats.map((f) => f.format.code), ...p.digitalFiles.map((f) => f.format.code)]);
    const brands = new Set<string>();
    const mods = new Set<string>();
    for (const code of formatCodes) {
      byFormat.get(code)?.brands.forEach((b) => brands.add(b));
      byFormat.get(code)?.models.forEach((b) => mods.add(b));
    }
    const text = buildSearchText({
      sku: p.sku,
      name: p.name,
      shortDescription: p.shortDescription,
      description: p.description,
      categoryNames: [p.category?.parent?.name, p.category?.name].filter((x): x is string => !!x),
      tags: p.tags.map((t) => t.tag.name),
      usageAreas: p.usageAreas,
      highlights: p.highlights,
      formats: [...formatCodes],
      machineBrands: [...brands],
      machineModels: [...mods],
      designWidthMm: p.embroidery?.designWidthMm,
      designHeightMm: p.embroidery?.designHeightMm,
      hoopLabel: p.embroidery?.hoopSize?.label,
    });
    await client.product.update({ where: { id: p.id }, data: { searchText: text } });
    n++;
  }
  return n;
}
