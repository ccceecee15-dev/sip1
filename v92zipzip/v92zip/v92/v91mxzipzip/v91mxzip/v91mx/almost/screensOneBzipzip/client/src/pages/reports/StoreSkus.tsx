import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft, ShoppingCart, Search,
  ChevronsUpDown, ChevronDown, ChevronUp, Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Seeded RNG (same as StyleStores) ────────────────────────────────────────
function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
function seededRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

// ─── SKU data ─────────────────────────────────────────────────────────────────
const COLORS  = ["BLACK", "WHITE", "SILVER", "MIDNIGHT", "STARLIGHT", "BLUE", "GREEN", "RED", "GOLD", "SPACE GREY"];
const SIZES   = ["S", "M", "L", "XL", "ONE SIZE"];

const VENDOR_STYLE_DESCRIPTORS = [
  "APPLE LB AIRPODS PRO GEN 3",
  "APPLE MAGSAFE CHARGER 2",
  "APPLE USB-C CABLE 2M",
  "APPLE LIGHTNING ADAPTER",
  "APPLE WATCH BAND SPORT",
  "APPLE PENCIL TIP REPLACEMENT",
  "APPLE SMART KEYBOARD COVER",
  "APPLE TV SIRI REMOTE",
  "APPLE HOMEPOD MINI SPEAKER",
  "APPLE AIRTAG 4-PACK",
  "INGRAM USB-C HUB 7-IN-1",
  "INGRAM PORTABLE SSD 1TB",
  "INGRAM WIRELESS CHARGER",
  "INGRAM BLUETOOTH MOUSE",
  "INGRAM LAPTOP STAND ALU",
];

interface VendorStyle { styleCode: string; styleDesc: string; }

function generateVendorStyles(
  vendorCode: string,
  currentStyleCode: string,
  currentStyleDesc: string,
): VendorStyle[] {
  const rng    = seededRng(hashStr(vendorCode + "STYLES"));
  const count  = 6 + Math.floor(rng() * 5);
  const descs  = [...VENDOR_STYLE_DESCRIPTORS].sort(() => rng() - 0.5).slice(0, count);
  const others = descs.map((desc) => ({
    styleCode: String(1000000 + (hashStr(vendorCode + desc) % 999999)),
    styleDesc: desc,
  }));
  return [
    { styleCode: currentStyleCode, styleDesc: currentStyleDesc },
    ...others.filter((s) => s.styleCode !== currentStyleCode),
  ];
}

interface SkuRow {
  upc:         string;
  variant:     string;
  description: string;
  styleCode:   string;
  styleDesc:   string;
  stock:       number;
  sales:       number;
  wos:         number;
  required:    number;
  deficit:     number;
  suggestedQty:number;
  vendor:      string;
  vendorCode:  string;
}

function generateSkus(styleCode: string, storeName: string, styleDesc: string, vendor: string, vendorCode: string): SkuRow[] {
  const seed = hashStr(styleCode + storeName);
  const rng  = seededRng(seed);

  const count   = 3 + Math.floor(rng() * 4); // 3–6 SKUs
  const colors  = [...COLORS].sort(() => rng() - 0.5).slice(0, count);

  return colors.map((color, i) => {
    const stock   = Math.floor(rng() * 30) + 1;
    const sales   = Math.floor(rng() * 15) + 1;
    const wos     = sales > 0 ? +(stock / sales).toFixed(1) : 0;
    const required = Math.floor(sales * (rng() * 5 + 3));
    const deficit  = required - stock;
    const mult     = [6, 10, 12, 24][Math.floor(rng() * 4)];
    const suggestedQty = deficit > 0 ? Math.ceil(deficit / mult) * mult : 0;
    const upc     = String(190000000000 + hashStr(styleCode + color + i) % 900000000000);
    const hasSize = rng() > 0.6;
    const size    = hasSize ? SIZES[Math.floor(rng() * SIZES.length)] : null;
    const variant = size ? `${color} / ${size}` : color;
    return {
      upc,
      variant,
      description: `${styleDesc} ${variant}`,
      styleCode,
      styleDesc,
      stock,
      sales,
      wos,
      required,
      deficit,
      suggestedQty,
      vendor,
      vendorCode,
    };
  }).sort((a, b) => b.deficit - a.deficit);
}

function defLevel(v: number): "high" | "medium" | "none" {
  if (v > 100) return "high";
  if (v > 20)  return "medium";
  return "none";
}

type SortDir = "asc" | "desc" | null;

// ─── Component ────────────────────────────────────────────────────────────────
export default function StoreSkus() {
  const [location, navigate] = useLocation();

  const params    = useMemo(() => new URLSearchParams(window.location.search), [location]);
  const styleCode  = params.get("style")     ?? "—";
  const styleDesc  = params.get("desc")      ?? "—";
  const storeName  = params.get("store")     ?? "—";
  const storeId    = params.get("storeId")   ?? "—";
  const vendorName = params.get("vendor")    ?? "—";
  const vendorCode = params.get("vendorCode") ?? "—";

  const [search, setSearch]     = useState("");
  const [sortCol, setSortCol]   = useState<string>("deficit");
  const [sortDir, setSortDir]   = useState<SortDir>("desc");
  const [showAllSkus, setShowAllSkus] = useState(false);
  const [scope, setScope] = useState<"style" | "vendor">("style");

  const styleSkus = useMemo(
    () => generateSkus(styleCode, storeName, styleDesc, vendorName, vendorCode),
    [styleCode, storeName, styleDesc, vendorName, vendorCode]
  );

  const vendorStyles = useMemo(
    () => generateVendorStyles(vendorCode, styleCode, styleDesc),
    [vendorCode, styleCode, styleDesc],
  );

  const vendorSkus = useMemo(
    () => vendorStyles.flatMap((st) =>
      generateSkus(st.styleCode, storeName, st.styleDesc, vendorName, vendorCode)
    ),
    [vendorStyles, storeName, vendorName, vendorCode],
  );

  const allSkus = scope === "vendor" ? vendorSkus : styleSkus;

  const skuData = useMemo(() => {
    let rows = showAllSkus ? allSkus : allSkus.filter((s) => s.deficit > 0);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((s) =>
        s.upc.includes(q) ||
        s.variant.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.styleCode.includes(q) ||
        s.styleDesc.toLowerCase().includes(q)
      );
    }
    if (sortCol && sortDir) {
      rows = [...rows].sort((a, b) => {
        const av = (a as any)[sortCol], bv = (b as any)[sortCol];
        if (typeof av === "number" && typeof bv === "number")
          return sortDir === "asc" ? av - bv : bv - av;
        return sortDir === "asc"
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }
    return rows;
  }, [allSkus, search, sortCol, sortDir, showAllSkus]);

  const totals = useMemo(() => ({
    deficit:  skuData.reduce((s, r) => s + Math.max(0, r.deficit), 0),
    orderQty: skuData.reduce((s, r) => s + r.suggestedQty, 0),
  }), [skuData]);

  const handleSort = (col: string) => {
    if (sortCol !== col) { setSortCol(col); setSortDir("desc"); }
    else if (sortDir === "desc") setSortDir("asc");
    else { setSortCol("deficit"); setSortDir("desc"); }
  };

  const SortIcon = ({ col }: { col: string }) => (
    <span className="ml-1 inline-flex opacity-60">
      {sortCol === col
        ? sortDir === "asc" ? <ChevronUp size={9} /> : <ChevronDown size={9} />
        : <ChevronsUpDown size={9} className="opacity-50" />}
    </span>
  );

  const backToStores = () => {
    navigate(
      `/reports/sip-planning/style-stores?style=${styleCode}` +
      `&desc=${encodeURIComponent(styleDesc)}` +
      `&vendor=${encodeURIComponent(vendorName)}` +
      `&vendorCode=${vendorCode}`
    );
  };

  const buildCreatePoUrl = () =>
    `/reports/sip-planning/create-po?vendor=${encodeURIComponent(vendorName)}` +
    `&vendorCode=${vendorCode}` +
    `&loc=store` +
    `&code=${encodeURIComponent(storeId)}` +
    `&name=${encodeURIComponent(storeName)}` +
    `&style=${styleCode}` +
    `&desc=${encodeURIComponent(styleDesc)}`;

  const openCreatePO = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(buildCreatePoUrl());
  };

  return (
    <MainLayout>
      <div className="space-y-5 animate-in fade-in duration-500">

        {/* Breadcrumb */}
        <div>
          <button
            onClick={backToStores}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mb-2"
          >
            <ChevronLeft size={14} /> Store Performance
          </button>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">SKU Detail</h1>
              <p className="text-sm text-slate-500 mt-0.5 truncate max-w-xl">
                Style <span className="font-mono font-bold text-primary">{styleCode}</span> — {styleDesc}
              </p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-slate-400">Store: <strong className="text-slate-600">{storeName}</strong> ({storeId})</span>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-400">Vendor: <strong className="text-slate-600">{vendorName}</strong> ({vendorCode})</span>
              </div>
            </div>
            <Button
              size="sm" className="gap-1.5 text-xs font-bold bg-primary shrink-0"
              onClick={() => navigate(buildCreatePoUrl())}
            >
              <ShoppingCart size={13} /> Create PO for {vendorName.split(",")[0]}
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: "SKUs with deficit",  value: allSkus.filter((s) => s.deficit > 0).length, color: "text-red-600 bg-red-50 border-red-200" },
            { label: "Total deficit units", value: totals.deficit.toLocaleString(), color: "text-orange-600 bg-orange-50 border-orange-200" },
            { label: "Units to order",      value: totals.orderQty.toLocaleString(), color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
          ].map(({ label, value, color }) => (
            <div key={label} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold", color)}>
              {label}: <span className="text-sm font-bold">{value}</span>
            </div>
          ))}
        </div>

        {/* Filters + toggle */}
        <Card className="border-border/60 shadow-none">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Scope</label>
                <div className="inline-flex rounded-md border border-slate-200 overflow-hidden bg-white" role="tablist">
                  <button
                    role="tab"
                    aria-selected={scope === "style"}
                    onClick={() => setScope("style")}
                    className={cn(
                      "px-3 h-8 text-[11px] font-semibold transition-colors inline-flex items-center gap-1.5",
                      scope === "style"
                        ? "bg-primary text-primary-foreground"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Package size={12} /> This Style
                  </button>
                  <button
                    role="tab"
                    aria-selected={scope === "vendor"}
                    onClick={() => setScope("vendor")}
                    className={cn(
                      "px-3 h-8 text-[11px] font-semibold transition-colors inline-flex items-center gap-1.5 border-l border-slate-200",
                      scope === "vendor"
                        ? "bg-primary text-primary-foreground"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    All Vendor SKUs
                    <Badge variant="outline" className={cn(
                      "text-[9px] h-4 px-1 ml-0.5",
                      scope === "vendor" ? "bg-white/20 text-primary-foreground border-white/30" : "bg-slate-100 text-slate-500 border-slate-200"
                    )}>
                      {vendorStyles.length}
                    </Badge>
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1 min-w-[220px]">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Search SKU / Variant</label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder={scope === "vendor" ? "UPC, style, colour…" : "UPC, colour or description…"}
                    className="h-8 pl-7 text-[11px] border-slate-200 bg-white" />
                </div>
              </div>
              <button
                onClick={() => setShowAllSkus((v) => !v)}
                className={cn(
                  "h-8 px-3 rounded-md text-[11px] font-semibold border transition-all",
                  showAllSkus ? "bg-slate-100 border-slate-300 text-slate-700" : "bg-primary/10 border-primary/30 text-primary"
                )}
              >
                {showAllSkus ? "Showing all SKUs" : "Showing deficit SKUs only"}
              </button>
              {search && (
                <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => setSearch("")}>
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-border/60 shadow-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-xs w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-border/50">
                  <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20">UPC</th>
                  {scope === "vendor" && (
                    <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20 whitespace-nowrap">Style</th>
                  )}
                  <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20">Variant</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20 min-w-[200px]">Description</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20">Vendor</th>
                  {[
                    { col: "stock",        label: "Stock"    },
                    { col: "sales",        label: "Sales"    },
                    { col: "wos",          label: "WOS"      },
                    { col: "required",     label: "Required" },
                    { col: "deficit",      label: "Deficit"  },
                    { col: "suggestedQty", label: "Sugg. Qty" },
                  ].map(({ col, label }) => (
                    <th key={col}
                      onClick={() => handleSort(col)}
                      className={cn(
                        "px-4 py-2.5 text-right font-semibold text-[10px] uppercase tracking-wide border-r border-border/20 cursor-pointer hover:bg-slate-100 whitespace-nowrap select-none",
                        col === "deficit" ? "text-red-600" : "text-slate-500",
                        sortCol === col && "bg-slate-100",
                      )}
                    >
                      <span className="inline-flex items-center justify-end">
                        {label} <SortIcon col={col} />
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-center font-semibold text-[10px] uppercase tracking-wide text-slate-500 w-28">Action</th>
                </tr>
              </thead>
              <tbody>
                {skuData.map((sku, i) => {
                  const level = defLevel(sku.deficit);
                  const isCurrentStyle = sku.styleCode === styleCode;
                  return (
                    <tr key={`${sku.styleCode}-${sku.upc}`}
                      className={cn(
                        "border-b border-border/20 transition-colors",
                        i % 2 === 0 ? "bg-background hover:bg-slate-50/60" : "bg-muted/[0.02] hover:bg-slate-50/60"
                      )}
                    >
                      <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500 border-r border-border/20 whitespace-nowrap">{sku.upc}</td>
                      {scope === "vendor" && (
                        <td className="px-4 py-2.5 border-r border-border/20 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "font-mono text-[10px] font-semibold",
                              isCurrentStyle ? "text-primary" : "text-slate-500"
                            )}>{sku.styleCode}</span>
                            {isCurrentStyle && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1 bg-primary/10 text-primary border-primary/30">selected</Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[200px]" title={sku.styleDesc}>
                            {sku.styleDesc}
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-2.5 border-r border-border/20">
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-slate-50 text-slate-700 border-slate-200 whitespace-nowrap">
                          {sku.variant}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 border-r border-border/20 text-slate-600 max-w-[240px] truncate" title={sku.description}>
                        {sku.description}
                      </td>
                      <td className="px-3 py-2.5 border-r border-border/20 text-slate-500 whitespace-nowrap max-w-[140px] truncate" title={sku.vendor}>
                        {sku.vendor.split(",")[0]}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 border-r border-border/20">{sku.stock}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 border-r border-border/20">{sku.sales}</td>
                      <td className={cn("px-4 py-2.5 text-right tabular-nums border-r border-border/20",
                        sku.wos < 2 ? "text-red-500 font-semibold" : "text-slate-600"
                      )}>{sku.wos}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-500 border-r border-border/20">{sku.required}</td>
                      <td className={cn("px-4 py-2.5 text-right tabular-nums font-bold border-r border-border/20",
                        level === "high" ? "text-red-600 bg-red-50/60"
                        : level === "medium" ? "text-orange-500 bg-orange-50/40"
                        : "text-slate-400"
                      )}>
                        {sku.deficit > 0 ? sku.deficit : <span className="text-emerald-600 font-medium text-[10px]">OK</span>}
                      </td>
                      <td className={cn("px-4 py-2.5 text-right tabular-nums font-bold border-r border-border/20",
                        sku.suggestedQty > 0 ? "text-primary" : "text-slate-300"
                      )}>
                        {sku.suggestedQty > 0 ? sku.suggestedQty : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Button
                          size="sm" className="h-7 text-[11px] gap-1 font-semibold bg-primary"
                          disabled={sku.deficit <= 0}
                          onClick={(e) => openCreatePO(e)}
                        >
                          <ShoppingCart size={11} /> Create PO
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {skuData.length === 0 && (
                  <tr>
                    <td colSpan={scope === "vendor" ? 12 : 11} className="py-12 text-center">
                      <Package size={28} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-xs text-slate-400">
                        {showAllSkus ? "No SKUs found." : "No SKUs with deficit. Toggle to show all SKUs."}
                      </p>
                    </td>
                  </tr>
                )}

                {/* Totals row */}
                {skuData.length > 0 && (
                  <tr className="border-t-2 border-border/50 bg-slate-50 font-semibold">
                    <td colSpan={scope === "vendor" ? 5 : 4} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 border-r border-border/20">
                      Total ({skuData.length} SKUs)
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700 border-r border-border/20">
                      {skuData.reduce((s, r) => s + r.stock, 0)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700 border-r border-border/20">
                      {skuData.reduce((s, r) => s + r.sales, 0)}
                    </td>
                    <td className="border-r border-border/20" />
                    <td className="border-r border-border/20" />
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-red-700 border-r border-border/20">
                      {totals.deficit}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-primary border-r border-border/20">
                      {totals.orderQty}
                    </td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-[11px] text-muted-foreground">
          Showing {showAllSkus ? "all" : "deficit"} SKUs for style <strong>{styleCode}</strong> at <strong>{storeName}</strong>.
          Click <strong>Create PO</strong> on any row to raise a purchase order for {vendorName.split(",")[0]}.
        </p>
      </div>
    </MainLayout>
  );
}
