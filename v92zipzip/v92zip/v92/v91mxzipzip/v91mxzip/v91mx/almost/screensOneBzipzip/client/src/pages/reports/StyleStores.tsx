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
  ChevronLeft, ChevronRight, ShoppingCart, Search,
  Store, ChevronsUpDown, ChevronDown, ChevronUp, ArrowRight,
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
  presStock:     number;
  storeOnhand:   number;
  storeSales:    number;
  storeWos:      number;
  requiredStock: number;
  deficit:       number;
  suggestedQty:  number;
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
    return {
      storeId:       `S${String(100 + i).padStart(3, "0")}`,
      storeName:     s.name,
      format:        s.format,
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

  const allStores = useMemo(() => generateStores(styleCode), [styleCode]);

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

  const createPO = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/reports/sip-planning/create-po?vendor=${encodeURIComponent(vendorName)}`);
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
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Store Performance</h1>
              <p className="text-sm text-slate-500 mt-0.5 truncate max-w-xl">
                Style <span className="font-mono font-bold text-primary">{styleCode}</span> — {styleDesc}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">Vendor: {vendorName} ({vendorCode})</p>
            </div>
            <Button
              size="sm" className="gap-1.5 text-xs font-bold bg-primary shrink-0"
              onClick={() => navigate(`/reports/sip-planning/create-po?vendor=${encodeURIComponent(vendorName)}`)}
            >
              <ShoppingCart size={13} /> Create PO — All Stores
            </Button>
          </div>
        </div>

        {/* Summary pills */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Stores with deficit", value: totals.stores, color: "text-red-600 bg-red-50 border-red-200" },
            { label: "Total deficit units",  value: totals.deficit.toLocaleString(), color: "text-orange-600 bg-orange-50 border-orange-200" },
            { label: "Units to order",       value: totals.orderQty.toLocaleString(), color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
          ].map(({ label, value, color }) => (
            <div key={label} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-semibold", color)}>
              {label}: <span className="text-sm font-bold">{value}</span>
            </div>
          ))}
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
                  <th className="px-4 py-2.5 text-center font-semibold text-[10px] uppercase tracking-wide text-slate-500 w-28">Action</th>
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
                      <td className={cn("px-4 py-2.5 text-right tabular-nums font-bold border-r border-border/20",
                        store.suggestedQty > 0 ? "text-primary" : "text-slate-300"
                      )}>
                        {store.suggestedQty > 0 ? store.suggestedQty.toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm" className="h-7 text-[11px] gap-1 font-semibold bg-primary"
                          onClick={(e) => createPO(e)}
                        >
                          <ShoppingCart size={11} /> Create PO
                        </Button>
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
                    <td colSpan={3} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 border-r border-border/20">
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
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-primary border-r border-border/20">
                      {totals.orderQty.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5" />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-[11px] text-muted-foreground">
          Click any store row to drill into SKU-level detail. Click <strong>Create PO</strong> to open the purchase order for this style's vendor.
        </p>
      </div>
    </MainLayout>
  );
}
