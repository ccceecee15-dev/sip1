import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft, Search,
  Store, ChevronsUpDown, ChevronDown, ChevronUp, ArrowRight,
  Warehouse,
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

// ─── Mock store data ──────────────────────────────────────────────────────────
const STORE_POOL = [
  { name: "TECH CENTRAL-DOWNTOWN",       format: "FLAGSHIP"  },
  { name: "GADGET ZONE-LAKESIDE",        format: "STANDARD"  },
  { name: "DIGITAL HUB-CANARY WHARF",   format: "FLAGSHIP"  },
  { name: "SMART STORE-BLUEWATER",      format: "STANDARD"  },
  { name: "MOBILE WORLD-WESTFIELD",     format: "STANDARD"  },
  { name: "CONNECT-HEATHROW T5",        format: "TRAVEL"    },
  { name: "TECH WORLD-BULLRING",        format: "FLAGSHIP"  },
  { name: "MOBILE PLUS-TRAFFORD CTR",   format: "STANDARD"  },
  { name: "CONNECT-GATWICK SOUTH",      format: "TRAVEL"    },
  { name: "TECH HUB-GLASGOW BUCHANAN",  format: "FLAGSHIP"  },
  { name: "LICK-HORSESHOE",             format: "SPECIALTY" },
  { name: "HARLEY-LINQ",                format: "WTLV"      },
  { name: "RUBY BLUE-LINQ",             format: "SPECIALTY" },
  { name: "LICK-EXCALIBUR",             format: "SPECIALTY" },
  { name: "GADGET PRO-BRAEHEAD",        format: "STANDARD"  },
  { name: "CONNECT-STANSTED",           format: "TRAVEL"    },
  { name: "MOBILE CENTRAL-ARNDALE",     format: "STANDARD"  },
  { name: "CONNECT-EDINBURGH AIRPORT",  format: "TRAVEL"    },
];

// ─── Mock warehouse data ──────────────────────────────────────────────────────
const WAREHOUSE_POOL = [
  { code: "DC-NORTH",    name: "Sheffield DC",      region: "North"    },
  { code: "DC-SOUTH",    name: "Reading DC",        region: "South"    },
  { code: "DC-MIDLANDS", name: "Birmingham DC",     region: "Midlands" },
  { code: "DC-EAST",     name: "Norwich DC",        region: "East"     },
];

const FORMAT_COLORS: Record<string, string> = {
  FLAGSHIP:  "bg-primary/10 text-primary border-primary/20",
  STANDARD:  "bg-slate-100 text-slate-600 border-slate-200",
  TRAVEL:    "bg-blue-50 text-blue-700 border-blue-200",
  SPECIALTY: "bg-violet-50 text-violet-700 border-violet-200",
  WTLV:      "bg-amber-50 text-amber-700 border-amber-200",
};

interface StoreRow {
  storeId:       string;
  storeName:     string;
  format:        string;
  warehouseCode: string;
  presStock:     number;
  storeOnhand:   number;
  storeSales:    number;
  storeWos:      number;
  requiredStock: number;
  deficit:       number;
  suggestedQty:  number;
}

interface WarehouseRow {
  code:           string;
  name:           string;
  region:         string;
  storesServiced: number;
  storesDeficit:  number;
  whOnhand:       number;
  totalDeficit:   number;
  suggestedQty:   number;
}

function generateStores(styleCode: string): StoreRow[] {
  const rng   = seededRng(hashStr(styleCode));
  const count = 10 + Math.floor(rng() * 8); // 10–17 stores
  const pool  = [...STORE_POOL].sort(() => rng() - 0.5).slice(0, count);

  return pool.map((s, i) => {
    const presStock   = Math.floor(rng() * 40) + 2;
    const storeOnhand = Math.floor(rng() * 80) + presStock;
    const storeSales  = Math.floor(rng() * 30) + 3;
    const storeWos    = storeSales > 0 ? +(storeOnhand / storeSales).toFixed(1) : 0;
    const required    = Math.floor(storeSales * (rng() * 6 + 4) + presStock);
    const deficit     = required - storeOnhand;
    const orderMult   = [6, 10, 12, 24][Math.floor(rng() * 4)];
    const suggestedQty = deficit > 0 ? Math.ceil(deficit / orderMult) * orderMult : 0;
    // Deterministic store→warehouse assignment
    const whIdx = hashStr(s.name) % WAREHOUSE_POOL.length;
    return {
      storeId:       `S${String(100 + i).padStart(3, "0")}`,
      storeName:     s.name,
      format:        s.format,
      warehouseCode: WAREHOUSE_POOL[whIdx].code,
      presStock,
      storeOnhand,
      storeSales,
      storeWos,
      requiredStock: required,
      deficit,
      suggestedQty,
    };
  }).sort((a, b) => b.deficit - a.deficit); // default: highest deficit first
}

function aggregateWarehouses(stores: StoreRow[], styleCode: string): WarehouseRow[] {
  const rng = seededRng(hashStr(styleCode + "WH"));

  const byCode = new Map<string, StoreRow[]>();
  for (const s of stores) {
    const arr = byCode.get(s.warehouseCode) ?? [];
    arr.push(s);
    byCode.set(s.warehouseCode, arr);
  }

  const rows: WarehouseRow[] = [];
  for (const wh of WAREHOUSE_POOL) {
    const list = byCode.get(wh.code);
    if (!list || list.length === 0) continue;
    // Only surface warehouses that service multiple stores
    if (list.length < 2) continue;

    const totalDeficit = list.reduce((s, r) => s + Math.max(0, r.deficit), 0);
    const suggestedQty = list.reduce((s, r) => s + r.suggestedQty, 0);
    const storesDeficit = list.filter((r) => r.deficit > 0).length;
    const whOnhand = Math.floor(rng() * 400) + 50;

    if (totalDeficit <= 0) continue;

    rows.push({
      code:           wh.code,
      name:           wh.name,
      region:         wh.region,
      storesServiced: list.length,
      storesDeficit,
      whOnhand,
      totalDeficit,
      suggestedQty,
    });
  }
  return rows.sort((a, b) => b.totalDeficit - a.totalDeficit);
}

function defLevel(v: number): "high" | "medium" | "none" {
  if (v > 200) return "high";
  if (v > 50)  return "medium";
  return "none";
}

type SortDir = "asc" | "desc" | null;

// ─── Component ────────────────────────────────────────────────────────────────
export default function StyleStores() {
  const [location, navigate] = useLocation();

  const params   = useMemo(() => new URLSearchParams(window.location.search), [location]);
  const styleCode  = params.get("style")   ?? "—";
  const styleDesc  = params.get("desc")    ?? "—";
  const vendorName = params.get("vendor")  ?? "—";
  const vendorCode = params.get("vendorCode") ?? "—";

  const [search, setSearch]     = useState("");
  const [filterFormat, setFilterFormat] = useState("all");
  const [sortCol, setSortCol]   = useState<string>("deficit");
  const [sortDir, setSortDir]   = useState<SortDir>("desc");

  const allStores      = useMemo(() => generateStores(styleCode), [styleCode]);
  const warehouseRows  = useMemo(() => aggregateWarehouses(allStores, styleCode), [allStores, styleCode]);

  const formats = useMemo(() =>
    Array.from(new Set(allStores.map((s) => s.format))).sort(), [allStores]);

  const storesData = useMemo(() => {
    let rows = allStores;
    if (filterFormat !== "all") rows = rows.filter((s) => s.format === filterFormat);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((s) => s.storeName.toLowerCase().includes(q) || s.storeId.toLowerCase().includes(q));
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
  }, [allStores, filterFormat, search, sortCol, sortDir]);

  const totals = useMemo(() => ({
    deficit:  storesData.reduce((s, r) => s + Math.max(0, r.deficit), 0),
    orderQty: storesData.reduce((s, r) => s + r.suggestedQty, 0),
    stores:   storesData.filter((r) => r.deficit > 0).length,
  }), [storesData]);

  const warehouseTotals = useMemo(() => ({
    count:    warehouseRows.length,
    deficit:  warehouseRows.reduce((s, r) => s + r.totalDeficit, 0),
    orderQty: warehouseRows.reduce((s, r) => s + r.suggestedQty, 0),
  }), [warehouseRows]);

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

  const navigateToSkus = (store: StoreRow) => {
    navigate(
      `/reports/sip-planning/store-skus?style=${styleCode}` +
      `&desc=${encodeURIComponent(styleDesc)}` +
      `&store=${encodeURIComponent(store.storeName)}` +
      `&storeId=${store.storeId}` +
      `&vendor=${encodeURIComponent(vendorName)}` +
      `&vendorCode=${vendorCode}`
    );
  };

  const navigateToWarehouse = (wh: WarehouseRow) => {
    navigate(
      `/reports/sip-planning/warehouse-skus?style=${styleCode}` +
      `&desc=${encodeURIComponent(styleDesc)}` +
      `&wh=${encodeURIComponent(wh.code)}` +
      `&whName=${encodeURIComponent(wh.name)}` +
      `&region=${encodeURIComponent(wh.region)}` +
      `&vendor=${encodeURIComponent(vendorName)}` +
      `&vendorCode=${vendorCode}`
    );
  };

  return (
    <MainLayout>
      <div className="space-y-5 animate-in fade-in duration-500">

        {/* Breadcrumb back link */}
        <div>
          <button
            onClick={() => navigate("/reports/sip-planning")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mb-2"
          >
            <ChevronLeft size={14} /> SIP Planning
          </button>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Network Deficit</h1>
              <p className="text-sm text-slate-500 mt-0.5 truncate max-w-xl">
                Style <span className="font-mono font-bold text-primary">{styleCode}</span> — {styleDesc}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Vendor: {vendorName} ({vendorCode})</p>
            </div>
          </div>
        </div>

        {/* Summary pills */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Warehouses with deficit", value: warehouseTotals.count, color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
            { label: "Stores with deficit",     value: totals.stores, color: "text-red-600 bg-red-50 border-red-200" },
            { label: "Total deficit units",     value: totals.deficit.toLocaleString(), color: "text-orange-600 bg-orange-50 border-orange-200" },
            { label: "Units to order",          value: totals.orderQty.toLocaleString(), color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
          ].map(({ label, value, color }) => (
            <div key={label} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold", color)}>
              {label}: <span className="text-sm font-bold">{value}</span>
            </div>
          ))}
        </div>

        {/* Warehouses section */}
        {warehouseRows.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Warehouse size={14} className="text-indigo-600" />
                <h2 className="text-sm font-bold tracking-tight text-slate-800">
                  Warehouses with deficit
                </h2>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-indigo-50 text-indigo-700 border-indigo-200">
                  {warehouseRows.length}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400">
                Servicing multiple stores · click to view aggregated SKU deficit
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {warehouseRows.map((wh) => {
                const level = defLevel(wh.totalDeficit);
                return (
                  <Card
                    key={wh.code}
                    onClick={() => navigateToWarehouse(wh)}
                    className={cn(
                      "border shadow-none cursor-pointer transition-all hover:shadow-md hover:border-indigo-300 group",
                      level === "high" ? "border-red-200" : level === "medium" ? "border-orange-200" : "border-border/60",
                    )}
                  >
                    <CardContent className="p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Warehouse size={12} className="text-indigo-500 flex-shrink-0" />
                            <span className="font-mono text-[10px] text-slate-400">{wh.code}</span>
                          </div>
                          <h3 className="text-sm font-semibold text-slate-800 mt-1 truncate group-hover:text-indigo-700 transition-colors">
                            {wh.name}
                          </h3>
                          <p className="text-[10px] text-slate-400 mt-0.5">{wh.region} region</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors mt-0.5 flex-shrink-0" />
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/30">
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Stores</p>
                          <p className="text-sm font-bold text-slate-700 mt-0.5">
                            {wh.storesDeficit}<span className="text-[10px] text-slate-400 font-normal">/{wh.storesServiced}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">WH Stock</p>
                          <p className="text-sm font-bold text-slate-700 mt-0.5 tabular-nums">{wh.whOnhand.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Deficit</p>
                          <p className={cn(
                            "text-sm font-bold mt-0.5 tabular-nums",
                            level === "high" ? "text-red-600" : level === "medium" ? "text-orange-600" : "text-slate-600",
                          )}>
                            {wh.totalDeficit.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Sugg. Qty</p>
                          <p className="text-sm font-bold text-primary mt-0.5 tabular-nums">{wh.suggestedQty.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Stores section header */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Store size={14} className="text-slate-600" />
            <h2 className="text-sm font-bold tracking-tight text-slate-800">
              Stores with deficit
            </h2>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-slate-50 text-slate-700 border-slate-200">
              {totals.stores}
            </Badge>
          </div>
          <p className="text-[11px] text-slate-400">
            Click any row to drill into SKU-level detail
          </p>
        </div>

        {/* Filters */}
        <Card className="border-border/60 shadow-none">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1 min-w-[150px]">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Format</label>
                <Select value={filterFormat} onValueChange={setFilterFormat}>
                  <SelectTrigger className="h-8 text-[11px] border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-[11px]">All Formats</SelectItem>
                    {formats.map((f) => <SelectItem key={f} value={f} className="text-[11px]">{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1 min-w-[220px]">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Search Store</label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Store name or ID…" className="h-8 pl-7 text-[11px] border-slate-200 bg-white" />
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-[11px]"
                onClick={() => { setSearch(""); setFilterFormat("all"); }}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-border/60 shadow-none overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-xs w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-border/50">
                  <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20 w-24">Store ID</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20">Store Name</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20">Format</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20 whitespace-nowrap">Warehouse</th>
                  {[
                    { col: "storeOnhand",   label: "Store Stock" },
                    { col: "storeSales",    label: "Store Sales" },
                    { col: "storeWos",      label: "WOS" },
                    { col: "requiredStock", label: "Required" },
                    { col: "deficit",       label: "Deficit" },
                    { col: "suggestedQty",  label: "Suggested Qty" },
                  ].map(({ col, label }) => (
                    <th key={col}
                      onClick={() => handleSort(col)}
                      className={cn(
                        "px-4 py-2.5 text-right font-semibold text-[10px] uppercase tracking-wide border-r border-border/20 last:border-r-0 cursor-pointer hover:bg-slate-100 whitespace-nowrap select-none",
                        col === "deficit" ? "text-red-600" : "text-slate-500",
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
                {storesData.map((store, i) => {
                  const level = defLevel(store.deficit);
                  return (
                    <tr
                      key={store.storeId}
                      onClick={() => navigateToSkus(store)}
                      className={cn(
                        "border-b border-border/20 cursor-pointer transition-colors group",
                        i % 2 === 0 ? "hover:bg-primary/5 bg-background" : "hover:bg-primary/5 bg-muted/[0.02]"
                      )}
                    >
                      <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500 border-r border-border/20">{store.storeId}</td>
                      <td className="px-4 py-2.5 border-r border-border/20">
                        <div className="flex items-center gap-2">
                          <Store size={12} className="text-slate-400 flex-shrink-0" />
                          <span className="font-medium text-slate-700 group-hover:text-primary transition-colors">{store.storeName}</span>
                          <ArrowRight size={11} className="text-slate-300 group-hover:text-primary/60 transition-colors" />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 border-r border-border/20">
                        <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5", FORMAT_COLORS[store.format] ?? "bg-slate-100 text-slate-600")}>
                          {store.format}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 border-r border-border/20">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500">
                          <Warehouse size={10} className="text-indigo-400" />
                          {store.warehouseCode}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 border-r border-border/20">{store.storeOnhand.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 border-r border-border/20">{store.storeSales.toLocaleString()}</td>
                      <td className={cn("px-4 py-2.5 text-right tabular-nums border-r border-border/20",
                        store.storeWos < 2 ? "text-red-500 font-semibold" : "text-slate-600"
                      )}>{store.storeWos}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-500 border-r border-border/20">{store.requiredStock.toLocaleString()}</td>
                      <td className={cn("px-4 py-2.5 text-right tabular-nums font-bold border-r border-border/20",
                        level === "high" ? "text-red-600 bg-red-50/60" : level === "medium" ? "text-orange-500 bg-orange-50/40" : "text-slate-400"
                      )}>
                        {store.deficit > 0 ? store.deficit.toLocaleString() : <span className="text-emerald-600 font-medium text-[10px]">OK</span>}
                      </td>
                      <td className={cn("px-4 py-2.5 text-right tabular-nums font-bold",
                        store.suggestedQty > 0 ? "text-primary" : "text-slate-300"
                      )}>
                        {store.suggestedQty > 0 ? store.suggestedQty.toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })}

                {storesData.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-xs text-slate-400">
                      No stores match your filters.
                    </td>
                  </tr>
                )}

                {/* Totals row */}
                {storesData.length > 0 && (
                  <tr className="border-t-2 border-border/50 bg-slate-50 font-semibold">
                    <td colSpan={4} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 border-r border-border/20">
                      Total ({storesData.length} stores)
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700 border-r border-border/20">
                      {storesData.reduce((s, r) => s + r.storeOnhand, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700 border-r border-border/20">
                      {storesData.reduce((s, r) => s + r.storeSales, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 border-r border-border/20" />
                    <td className="px-4 py-2.5 border-r border-border/20" />
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
          Click a <strong>warehouse</strong> to see aggregated SKU deficit across the stores it services and create a vendor PO. Click a <strong>store</strong> row to drill into its SKU-level detail.
        </p>
      </div>
    </MainLayout>
  );
}
