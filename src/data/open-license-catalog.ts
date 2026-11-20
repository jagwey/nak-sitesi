import catalog from "@/data/open-license-catalog.json";

export type OpenLicenseFormat = "VP3" | "PES" | "DST" | "JEF";

export interface OpenLicenseDesign {
  slug: string;
  name: string;
  summary: string;
  kind: "monogram" | "motif";
  letter: string | null;
  widthMm: number;
  heightMm: number;
  stitchCount: number;
  formats: OpenLicenseFormat[];
  files: Record<OpenLicenseFormat, string>;
  preview: string;
  sourceName: string;
  license: string;
  licenseId: "original-commercial";
  commercialUse: true;
  resaleAllowed: true;
  saleStatus: "preview";
  physicalProof: false;
  note: string;
}

export const OPEN_LICENSE_CATALOG = catalog.designs as OpenLicenseDesign[];

export function findOpenLicenseDesign(slug: string): OpenLicenseDesign | null {
  return OPEN_LICENSE_CATALOG.find((design) => design.slug === slug) ?? null;
}
