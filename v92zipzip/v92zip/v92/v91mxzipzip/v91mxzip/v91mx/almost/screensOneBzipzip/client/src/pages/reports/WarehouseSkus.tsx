import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft, ShoppingCart, Search, Warehouse,
  ChevronsUpDown, ChevronDown, ChevronUp, Package, Store as StoreIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
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

// ─── Mock store + warehouse data (kept in sync with StyleStores) ─────────────
const STORE_POOL = [
  { name: "TECH CENTRAL-JFK T4",            format: "TRAVEL"    },
  { name: "GADGET ZONE-LAX T7",             format: "TRAVEL"    },
  { name: "DIGITAL HUB-ATL CONCOURSE B",    format: "FLAGSHIP"  },
  { name: "SMART STORE-ORD T2",             format: "STANDARD"  },
  { name: "MOBILE WORLD-DFW TERMINAL D",    format: "STANDARD"  },
  { name: "CONNECT-DEN A-WEST",             format: "TRAVEL"    },
  { name: "TECH WORLD-SFO INTL G",          format: "FLAGSHIP"  },
  { name: "MOBILE PLUS-SEA CENTRAL",        format: "STANDARD"  },
  { name: "CONNECT-MIA NORTH",              format: "TRAVEL"    },
  { name: "TECH HUB-LAS T1",                format: "FLAGSHIP"  },
  { name: "LICK-HORSESHOE",                 format: "SPECIALTY" },
  { name: "HARLEY-LINQ",                    format: "WTLV"      },
  { name: "RUBY BLUE-LINQ",                 format: "SPECIALTY" },
  { name: "LICK-EXCALIBUR",                 format: "SPECIALTY" },
  { name: "GADGET PRO-BOS C-INTL",          format: "STANDARD"  },
  { name: "CONNECT-IAH TERMINAL E",         format: "TRAVEL"    },
  { name: "MOBILE CENTRAL-EWR C",           format: "STANDARD"  },
  { name: "CONNECT-MCO B-AIRSIDE",          format: "TRAVEL"    },
];

const WAREHOUSE_POOL = [
  { code: "DC-NORTHEAST", name: "Newark DC",   region: "Northeast" },
  { code: "DC-SOUTHEAST", name: "Atlanta DC",  region: "Southeast" },
  { code: "DC-CENTRAL",   name: "Memphis DC",  region: "Central"   },
  { code: "DC-WEST",      name: "Ontario DC",  region: "West"      },
];

// Must match StyleStores.assignWarehouse — keep in sync
function assignWarehouse(storeName: string): string | null {
  const h = hashStr(storeName + "WH");
  if (h % 4 === 0) return null;
  return WAREHOUSE_POOL[h % WAREHOUSE_POOL.length].code;
}

interface ServicedStore {
  storeId:   string;
  storeName: string;
  format:    string;
  deficit:   number;
}

function getServicedStores(styleCode: string, whCode: string): ServicedStore[] {
  const rng   = seededRng(hashStr(styleCode));
  const count = 10 + Math.floor(rng() * 8);
  const pool  = [...STORE_POOL].sort(() => rng() - 0.5).slice(0, count);

  return pool
    .map((s, i) => {
      const presStock   = Math.floor(rng() * 40) + 2;
      const storeOnhand = Math.floor(rng() * 80) + presStock;
      const storeSales  = Math.floor(rng() * 30) + 3;
      const required    = Math.floor(storeSales * (rng() * 6 + 4) + presStock);
      const deficit     = required - storeOnhand;
      return {
        storeId:   `S${String(100 + i).padStart(3, "0")}`,
        storeName: s.name,
        format:    s.format,
        warehouse: assignWarehouse(s.name),
        deficit,
      };
    })
    .filter((s) => s.warehouse === whCode);
}

// ─── SKU aggregation across all serviced stores ──────────────────────────────
const COLORS = ["BLACK", "WHITE", "SILVER", "MIDNIGHT", "STARLIGHT", "BLUE", "GREEN", "RED", "GOLD", "SPACE GREY"];
const SIZES  = ["S", "M", "L", "XL", "ONE SIZE"];

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
  const count  = 6 + Math.floor(rng() * 5); // 6–10 other styles
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
  upc:           string;
  variant:       string;
  description:   string;
  styleCode:     string;
  styleDesc:     string;
  storesNeeding: number;
  totalSales:    number;
  totalRequired: number;
  whOnhand:      number;
  totalDeficit:  number;
  suggestedQty:  number;
  cost:          number;
}

function generateAggregatedSkus(
  styleCode: string,
  styleDesc: string,
  whCode: string,
  servicedStores: number,
): SkuRow[] {
  const rng   = seededRng(hashStr(styleCode + whCode + "SKU"));
  const count = 4 + Math.floor(rng() * 4); // 4–7 SKUs
  const colors = [...COLORS].sort(() => rng() - 0.5).slice(0, count);

  return colors.map((color, i) => {
    // each SKU is needed by a fraction of stores
    const storesNeeding = Math.max(1, Math.floor(servicedStores * (0.4 + rng() * 0.6)));
    const perStoreSales = Math.floor(rng() * 20) + 4;
    const totalSales = perStoreSales * storesNeeding;
    const perStoreReq = Math.floor(perStoreSales * (rng() * 4 + 3));
    const totalRequired = perStoreReq * storesNeeding;
    const whOnhand = Math.floor(rng() * (totalRequired * 0.6));
    const totalDeficit = Math.max(0, totalRequired - whOnhand);
    const mult = [6, 12, 24, 48][Math.floor(rng() * 4)];
    const suggestedQty = totalDeficit > 0 ? Math.ceil(totalDeficit / mult) * mult : 0;
    const cost = +(rng() * 60 + 12).toFixed(2);
    const upc = String(190000000000 + hashStr(styleCode + whCode + color + i) % 900000000000);
    const hasSize = rng() > 0.6;
    const size = hasSize ? SIZES[Math.floor(rng() * SIZES.length)] : null;
    const variant = size ? `${color} / ${size}` : color;

    return {
      upc,
      variant,
      description: `${styleDesc} ${variant}`,
      styleCode,
      styleDesc,
      storesNeeding,
      totalSales,
      totalRequired,
      whOnhand,
      totalDeficit,
      suggestedQty,
      cost,
    };
  }).sort((a, b) => b.totalDeficit - a.totalDeficit);
}

function defLevel(v: number): "high" | "medium" | "none" {
  if (v > 200) return "high";
  if (v > 50)  return "medium";
  return "none";
}

type SortDir = "asc" | "desc" | null;

// ─── Component ────────────────────────────────────────────────────────────────
export default function WarehouseSkus() {
  const [location, navigate] = useLocation();

  const params     = useMemo(() => new URLSearchParams(window.location.search), [location]);
  const styleCode  = params.get("style")      ?? "—";
  const styleDesc  = params.get("desc")       ?? "—";
  const whCode     = params.get("wh")         ?? "—";
  const whName     = params.get("whName")     ?? "—";
  const region     = params.get("region")     ?? "—";
  const vendorName = params.get("vendor")     ?? "—";
  const vendorCode = params.get("vendorCode") ?? "—";

  const [search, setSearch]   = useState("");
  const [sortCol, setSortCol] = useState<string>("totalDeficit");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showAllSkus, setShowAllSkus] = useState(false);
  const [scope, setScope] = useState<"style" | "vendor">("style");
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());

  const servicedStores = useMemo(() => getServicedStores(styleCode, whCode), [styleCode, whCode]);

  const styleSkus = useMemo(
    () => generateAggregatedSkus(styleCode, styleDesc, whCode, servicedStores.length),
    [styleCode, styleDesc, whCode, servicedStores.length],
  );

  const vendorStyles = useMemo(
    () => generateVendorStyles(vendorCode, styleCode, styleDesc),
    [vendorCode, styleCode, styleDesc],
  );

  const vendorSkus = useMemo(
    () => vendorStyles.flatMap((st) =>
      generateAggregatedSkus(st.styleCode, st.styleDesc, whCode, servicedStores.length)
    ),
    [vendorStyles, whCode, servicedStores.length],
  );

  const allSkus = scope === "vendor" ? vendorSkus : styleSkus;

  const skuData = useMemo(() => {
    let rows = showAllSkus ? allSkus : allSkus.filter((s) => s.totalDeficit > 0);
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
    deficit:  skuData.reduce((s, r) => s + r.totalDeficit, 0),
    orderQty: skuData.reduce((s, r) => s + r.suggestedQty, 0),
    skus:     skuData.filter((s) => s.totalDeficit > 0).length,
    value:    skuData.reduce((s, r) => s + r.suggestedQty * r.cost, 0),
  }), [skuData]);

  const selectedTotals = useMemo(() => {
    const sel = skuData.filter((s) => selectedSkus.has(s.upc));
    return {
      count:    sel.length,
      orderQty: sel.reduce((s, r) => s + r.suggestedQty, 0),
      value:    sel.reduce((s, r) => s + r.suggestedQty * r.cost, 0),
    };
  }, [selectedSkus, skuData]);

  const handleSort = (col: string) => {
    if (sortCol !== col) { setSortCol(col); setSortDir("desc"); }
    else if (sortDir === "desc") setSortDir("asc");
    else { setSortCol("totalDeficit"); setSortDir("desc"); }
  };

  const toggleSku = (upc: string) => {
    setSelectedSkus((prev) => {
      const next = new Set(prev);
      next.has(upc) ? next.delete(upc) : next.add(upc);
      return next;
    });
  };

  const allOrderableUpcs = useMemo(
    () => skuData.filter((s) => s.suggestedQty > 0).map((s) => s.upc),
    [skuData],
  );
  const allSelected = allOrderableUpcs.length > 0 && allOrderableUpcs.every((u) => selectedSkus.has(u));

  const toggleAll = () => {
    if (allSelected) setSelectedSkus(new Set());
    else setSelectedSkus(new Set(allOrderableUpcs));
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

  const openCreatePO = () => {
    const upcs = selectedSkus.size > 0 ? Array.from(selectedSkus) : allOrderableUpcs;
    if (upcs.length === 0) return;
    navigate(
      `/reports/sip-planning/create-po?vendor=${encodeURIComponent(vendorName)}` +
      `&vendorCode=${vendorCode}` +
      `&loc=warehouse` +
      `&code=${encodeURIComponent(whCode)}` +
      `&name=${encodeURIComponent(whName)}` +
      `&region=${encodeURIComponent(region)}` +
      `&style=${styleCode}` +
      `&desc=${encodeURIComponent(styleDesc)}`
    );
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
            <ChevronLeft size={14} /> Network Deficit
          </button>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Warehouse size={16} className="text-indigo-600" />
                <h1 className="text-xl font-bold tracking-tight text-slate-900">{whName}</h1>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-indigo-50 text-indigo-700 border-indigo-200 font-mono">
                  {whCode}
                </Badge>
              </div>
              <p className="text-sm text-slate-500 mt-1 truncate max-w-xl">
                Style <span className="font-mono font-bold text-primary">{styleCode}</span> — {styleDesc}
              </p>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                <span className="text-xs text-slate-400">Region: <strong className="text-slate-600">{region}</strong></span>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-400">Vendor: <strong className="text-slate-600">{vendorName}</strong> ({vendorCode})</span>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-400 inline-flex items-center gap-1">
                  <StoreIcon size={11} /> Servicing <strong className="text-slate-600">{servicedStores.length}</strong> stores
                </span>
              </div>
            </div>
            <Button
              size="sm" className="gap-1.5 text-xs font-bold bg-primary shrink-0"
              disabled={allOrderableUpcs.length === 0}
              onClick={openCreatePO}
            >
              <ShoppingCart size={13} />
              {selectedSkus.size > 0
                ? `Create PO (${selectedSkus.size} SKU${selectedSkus.size === 1 ? "" : "s"})`
                : `Create PO — All SKUs`}
            </Button>
          </div>
        </div>

        {/* Summary pills */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: "SKUs with deficit",    value: totals.skus, color: "text-red-600 bg-red-50 border-red-200" },
            { label: "Aggregated deficit",   value: totals.deficit.toLocaleString(), color: "text-orange-600 bg-orange-50 border-orange-200" },
            { label: "Suggested order qty",  value: totals.orderQty.toLocaleString(), color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
            { label: "Estimated PO value",   value: `$${totals.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: "text-primary bg-primary/10 border-primary/30" },
          ].map(({ label, value, color }) => (
            <div key={label} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold", color)}>
              {label}: <span className="text-sm font-bold">{value}</span>
            </div>
          ))}
        </div>

        {/* Stores serviced strip */}
        {servicedStores.length > 0 && (
          <Card className="border-border/60 shadow-none bg-slate-50/40">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <StoreIcon size={12} className="text-slate-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Stores serviced by this warehouse
                </span>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-white border-slate-200 text-slate-600">
                  {servicedStores.length}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {servicedStores.map((s) => (
                  <div
                    key={s.storeId}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] bg-white",
                      s.deficit > 0 ? "border-red-200" : "border-slate-200",
                    )}
                  >
                    <span className="font-mono text-slate-400">{s.storeId}</span>
                    <span className="font-medium text-slate-700">{s.storeName}</span>
                    {s.deficit > 0 && (
                      <span className="text-red-600 font-bold tabular-nums">−{s.deficit}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                    onClick={() => { setScope("style"); setSelectedSkus(new Set()); }}
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
                    onClick={() => { setScope("vendor"); setSelectedSkus(new Set()); }}
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
              {(search || selectedSkus.size > 0) && (
                <Button size="sm" variant="outline" className="h-8 text-[11px]"
                  onClick={() => { setSearch(""); setSelectedSkus(new Set()); }}>
                  Clear
                </Button>
              )}
              {selectedSkus.size > 0 && (
                <div className="ml-auto inline-flex items-center gap-2 text-[11px] text-slate-600 bg-primary/5 border border-primary/20 rounded-md px-2.5 py-1.5">
                  <strong className="text-primary">{selectedTotals.count}</strong> selected ·
                  <span><strong>{selectedTotals.orderQty.toLocaleString()}</strong> units</span> ·
                  <span>est. <strong>${selectedTotals.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></span>
                </div>
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
                  <th className="px-3 py-2.5 text-center font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="h-3.5 w-3.5 cursor-pointer accent-primary"
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20">UPC</th>
                  {scope === "vendor" && (
                    <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20 whitespace-nowrap">Style</th>
                  )}
                  <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20">Variant</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20 min-w-[200px]">Description</th>
                  {[
                    { col: "storesNeeding", label: "Stores"        },
                    { col: "totalSales",    label: "Σ Sales"       },
                    { col: "totalRequired", label: "Σ Required"    },
                    { col: "whOnhand",      label: "WH Onhand"     },
                    { col: "totalDeficit",  label: "Σ Deficit"     },
                    { col: "suggestedQty",  label: "Sugg. Qty"     },
                  ].map(({ col, label }) => (
                    <th key={col}
                      onClick={() => handleSort(col)}
                      className={cn(
                        "px-4 py-2.5 text-right font-semibold text-[10px] uppercase tracking-wide border-r border-border/20 last:border-r-0 cursor-pointer hover:bg-slate-100 whitespace-nowrap select-none",
                        col === "totalDeficit" ? "text-red-600" : "text-slate-500",
                        sortCol === col && "bg-slate-100",
                      )}
                    >
                      <span className="inline-flex items-center justify-end">
                        {label} <SortIcon col={col} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {skuData.map((sku, i) => {
                  const level = defLevel(sku.totalDeficit);
                  const checked = selectedSkus.has(sku.upc);
                  const orderable = sku.suggestedQty > 0;
                  const isCurrentStyle = sku.styleCode === styleCode;
                  return (
                    <tr key={`${sku.styleCode}-${sku.upc}`}
                      className={cn(
                        "border-b border-border/20 transition-colors",
                        checked ? "bg-primary/5" : i % 2 === 0 ? "bg-background hover:bg-slate-50/60" : "bg-muted/[0.02] hover:bg-slate-50/60"
                      )}
                    >
                      <td className="px-3 py-2.5 text-center border-r border-border/20">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!orderable}
                          onChange={() => toggleSku(sku.upc)}
                          className="h-3.5 w-3.5 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label={`Select ${sku.variant}`}
                        />
                      </td>
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
                      <td className="px-4 py-2.5 border-r border-border/20 text-slate-600 max-w-[260px] truncate" title={sku.description}>
                        {sku.description}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 border-r border-border/20">{sku.storesNeeding}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 border-r border-border/20">{sku.totalSales.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-500 border-r border-border/20">{sku.totalRequired.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 border-r border-border/20">{sku.whOnhand.toLocaleString()}</td>
                      <td className={cn("px-4 py-2.5 text-right tabular-nums font-bold border-r border-border/20",
                        level === "high" ? "text-red-600 bg-red-50/60"
                        : level === "medium" ? "text-orange-500 bg-orange-50/40"
                        : "text-slate-400"
                      )}>
                        {sku.totalDeficit > 0 ? sku.totalDeficit.toLocaleString() : <span className="text-emerald-600 font-medium text-[10px]">OK</span>}
                      </td>
                      <td className={cn("px-4 py-2.5 text-right tabular-nums font-bold",
                        sku.suggestedQty > 0 ? "text-primary" : "text-slate-300"
                      )}>
                        {sku.suggestedQty > 0 ? sku.suggestedQty.toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })}

                {skuData.length === 0 && (
                  <tr>
                    <td colSpan={scope === "vendor" ? 11 : 10} className="py-12 text-center">
                      <Package size={28} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-xs text-slate-400">
                        {showAllSkus ? "No SKUs found." : "No SKUs with deficit at this warehouse. Toggle to show all SKUs."}
                      </p>
                    </td>
                  </tr>
                )}

                {/* Totals row */}
                {skuData.length > 0 && (
                  <tr className="border-t-2 border-border/50 bg-slate-50 font-semibold">
                    <td className="border-r border-border/20" />
                    <td colSpan={scope === "vendor" ? 4 : 3} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 border-r border-border/20">
                      Total ({skuData.length} SKUs)
                    </td>
                    <td className="px-4 py-2.5 border-r border-border/20" />
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700 border-r border-border/20">
                      {skuData.reduce((s, r) => s + r.totalSales, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700 border-r border-border/20">
                      {skuData.reduce((s, r) => s + r.totalRequired, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700 border-r border-border/20">
                      {skuData.reduce((s, r) => s + r.whOnhand, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-red-700 border-r border-border/20">
                      {totals.deficit.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-primary">
                      {totals.orderQty.toLocaleString()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-[11px] text-muted-foreground">
          Aggregated SKU deficit across <strong>{servicedStores.length}</strong> stores serviced by <strong>{whName}</strong>.
          Select specific SKUs or use <strong>Create PO — All SKUs</strong> to raise a purchase order with {vendorName.split(",")[0]}.
        </p>
      </div>
    </MainLayout>
  );
}
