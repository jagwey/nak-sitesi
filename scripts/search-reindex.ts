// Rebuild Product.searchText for every product:  npm run search:reindex
// Imports no "server-only" modules (tsx does not use the react-server condition).
import { createScriptClient } from "../prisma/script-client";
import { reindexProducts } from "../src/server/modules/search/reindex";

async function main() {
  const db = createScriptClient();
  try {
    const n = await reindexProducts(db);
    console.log(`searchText rebuilt for ${n} product(s).`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
