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

// ─── Mock store data (US airport locations) ──────────────────────────────────
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

// ─── Mock warehouse data (US distribution centers) ───────────────────────────
export const WAREHOUSE_POOL = [
  { code: "DC-NORTHEAST", name: "Newark DC",   region: "Northeast" },
  { code: "DC-SOUTHEAST", name: "Atlanta DC",  region: "Southeast" },
  { code: "DC-CENTRAL",   name: "Memphis DC",  region: "Central"   },
  { code: "DC-WEST",      name: "Ontario DC",  region: "West"      },
];

const FORMAT_COLORS: Record<string, string> = {
  FLAGSHIP:  "bg-primary/10 text-primary border-primary/20",
  STANDARD:  "bg-slate-100 text-slate-600 border-slate-200",
  TRAVEL:    "bg-blue-50 text-blue-700 border-blue-200",
  SPECIALTY: "bg-violet-50 text-violet-700 border-violet-200",
  WTLV:      "bg-amber-50 text-amber-700 border-amber-200",
};

// Deterministic store→warehouse assignment.
// Returns null when the store is direct-shipped (not serviced by a warehouse).
export function assignWarehouse(storeName: string): string | null {
  const h = hashStr(storeName + "WH");
  // ~25% of stores ship direct from vendor
  if (h % 4 === 0) return null;
  return WAREHOUSE_POOL[h % WAREHOUSE_POOL.length].code;
}

interface StoreCalc {
  storeId:       string;
  storeName:     string;
  format:        string;
  warehouseCode: string | null;
  presStock:     number;
  storeOnhand:   number;
  storeSales:    number;
  storeWos:      number;
  requiredStock: number;
  deficit:       number;
  suggestedQty:  number;
}

function generateStores(styleCode: string): StoreCalc[] {
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
      warehouseCode: assignWarehouse(s.name),
      presStock,
      storeOnhand,
      storeSales,
      storeWos,
      requiredStock: required,
      deficit,
      suggestedQty,
    };
  });
}

// A delivery point is either a single direct-shipped store or an aggregated warehouse
type DeliveryPoint =
  | (StoreCalc & {
      kind: "store";
      pointId:   string;
      pointName: string;
      onhand:    number;
      sales:     number;
      wos:       number;
      required:  number;
    })
  | {
      kind:           "warehouse";
      pointId:        string;     // warehouse code
      pointName:      string;     // warehouse name
      region:         string;
      format:         string;     // "WAREHOUSE"
      storesServiced: number;
      storesDeficit:  number;
      onhand:         number;     // WH onhand
      sales:          number;     // Σ store sales
      wos:            number;     // weighted WOS
      required:       number;     // Σ required
      deficit:        number;     // Σ deficit
      suggestedQty:   number;
    };

function buildDeliveryPoints(stores: StoreCalc[], styleCode: string): DeliveryPoint[] {
  const rng = seededRng(hashStr(styleCode + "WHSTOCK"));
  const points: DeliveryPoint[] = [];

  // Direct stores → one row each
  for (const s of stores) {
    if (s.warehouseCode === null) {
      points.push({
        ...s,
        kind:      "store",
        pointId:   s.storeId,
        pointName: s.storeName,
        onhand:    s.storeOnhand,
        sales:     s.storeSales,
        wos:       s.storeWos,
        required:  s.requiredStock,
      });
    }
  }

  // Group warehouse-served stores by warehouse
  const byCode = new Map<string, StoreCalc[]>();
  for (const s of stores) {
    if (s.warehouseCode === null) continue;
    const arr = byCode.get(s.warehouseCode) ?? [];
    arr.push(s);
    byCode.set(s.warehouseCode, arr);
  }

  for (const wh of WAREHOUSE_POOL) {
    const list = byCode.get(wh.code);
    if (!list || list.length === 0) continue;

    const sales    = list.reduce((s, r) => s + r.storeSales, 0);
    const required = list.reduce((s, r) => s + r.requiredStock, 0);
    const onhand   = Math.floor(rng() * 400) + 50; // warehouse on-hand stock
    const deficit  = Math.max(0, required - onhand);
    const wos      = sales > 0 ? +(onhand / sales).toFixed(1) : 0;
    const orderMult   = [12, 24, 48, 60][Math.floor(rng() * 4)];
    const suggestedQty = deficit > 0 ? Math.ceil(deficit / orderMult) * orderMult : 0;

    points.push({
      kind:           "warehouse",
      pointId:        wh.code,
      pointName:      wh.name,
      region:         wh.region,
      format:         "WAREHOUSE",
      storesServiced: list.length,
      storesDeficit:  list.filter((r) => r.deficit > 0).length,
      onhand,
      sales,
      wos,
      required,
      deficit,
      suggestedQty,
    });
  }

  return points.sort((a, b) => b.deficit - a.deficit);
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
  const [filterType, setFilterType] = useState("all"); // all | warehouse | store
  const [filterFormat, setFilterFormat] = useState("all");
  const [sortCol, setSortCol]   = useState<string>("deficit");
  const [sortDir, setSortDir]   = useState<SortDir>("desc");

  const allStores      = useMemo(() => generateStores(styleCode), [styleCode]);
  const deliveryPoints = useMemo(() => buildDeliveryPoints(allStores, styleCode), [allStores, styleCode]);

  const formats = useMemo(() => {
    const set = new Set<string>();
    for (const dp of deliveryPoints) set.add(dp.format);
    return Array.from(set).sort();
  }, [deliveryPoints]);

  const tableData = useMemo(() => {
    let rows = deliveryPoints;
    if (filterType === "warehouse") rows = rows.filter((r) => r.kind === "warehouse");
    if (filterType === "store")     rows = rows.filter((r) => r.kind === "store");
    if (filterFormat !== "all")     rows = rows.filter((r) => r.format === filterFormat);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) => r.pointName.toLowerCase().includes(q) || r.pointId.toLowerCase().includes(q),
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
  }, [deliveryPoints, filterType, filterFormat, search, sortCol, sortDir]);

  const totals = useMemo(() => {
    const whCount     = deliveryPoints.filter((r) => r.kind === "warehouse").length;
    const storeCount  = deliveryPoints.filter((r) => r.kind === "store").length;
    const deficitPts  = deliveryPoints.filter((r) => r.deficit > 0).length;
    return {
      whCount,
      storeCount,
      deficitPts,
      deficit:  tableData.reduce((s, r) => s + Math.max(0, r.deficit), 0),
      orderQty: tableData.reduce((s, r) => s + r.suggestedQty, 0),
      sales:    tableData.reduce((s, r) => s + r.sales, 0),
      onhand:   tableData.reduce((s, r) => s + r.onhand, 0),
      required: tableData.reduce((s, r) => s + r.required, 0),
    };
  }, [tableData, deliveryPoints]);

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

  const navigateToPoint = (dp: DeliveryPoint) => {
    if (dp.kind === "warehouse") {
      navigate(
        `/reports/sip-planning/warehouse-skus?style=${styleCode}` +
        `&desc=${encodeURIComponent(styleDesc)}` +
        `&wh=${encodeURIComponent(dp.pointId)}` +
        `&whName=${encodeURIComponent(dp.pointName)}` +
        `&region=${encodeURIComponent(dp.region)}` +
        `&vendor=${encodeURIComponent(vendorName)}` +
        `&vendorCode=${vendorCode}`
      );
    } else {
      navigate(
        `/reports/sip-planning/store-skus?style=${styleCode}` +
        `&desc=${encodeURIComponent(styleDesc)}` +
        `&store=${encodeURIComponent(dp.storeName)}` +
        `&storeId=${dp.storeId}` +
        `&vendor=${encodeURIComponent(vendorName)}` +
        `&vendorCode=${vendorCode}`
      );
    }
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
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Delivery Points</h1>
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
            { label: "Warehouses",          value: totals.whCount,    color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
            { label: "Direct stores",       value: totals.storeCount, color: "text-slate-700 bg-slate-50 border-slate-200" },
            { label: "Points with deficit", value: totals.deficitPts, color: "text-red-600 bg-red-50 border-red-200" },
            { label: "Total deficit units", value: totals.deficit.toLocaleString(),  color: "text-orange-600 bg-orange-50 border-orange-200" },
            { label: "Units to order",      value: totals.orderQty.toLocaleString(), color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
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
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Type</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-8 text-[11px] border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all"       className="text-[11px]">All Delivery Points</SelectItem>
                    <SelectItem value="warehouse" className="text-[11px]">Warehouses</SelectItem>
                    <SelectItem value="store"     className="text-[11px]">Direct Stores</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Search</label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name or ID…" className="h-8 pl-7 text-[11px] border-slate-200 bg-white" />
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-[11px]"
                onClick={() => { setSearch(""); setFilterFormat("all"); setFilterType("all"); }}>
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
                  <th className="px-3 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20 w-24">Type</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20 w-24">ID</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20">Delivery Point</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20">Format / Region</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20 whitespace-nowrap">Stores Serviced</th>
                  {[
                    { col: "onhand",       label: "Stock"        },
                    { col: "sales",        label: "Sales"        },
                    { col: "wos",          label: "WOS"          },
                    { col: "required",     label: "Required"     },
                    { col: "deficit",      label: "Deficit"      },
                    { col: "suggestedQty", label: "Suggested Qty" },
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
                {tableData.map((dp, i) => {
                  const level = defLevel(dp.deficit);
                  const isWh  = dp.kind === "warehouse";
                  return (
                    <tr
                      key={`${dp.kind}-${dp.pointId}`}
                      onClick={() => navigateToPoint(dp)}
                      className={cn(
                        "border-b border-border/20 cursor-pointer transition-colors group",
                        isWh ? "bg-indigo-50/30 hover:bg-indigo-50/70"
                             : i % 2 === 0 ? "hover:bg-primary/5 bg-background" : "hover:bg-primary/5 bg-muted/[0.02]",
                      )}
                    >
                      <td className="px-3 py-2.5 border-r border-border/20">
                        {isWh ? (
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-indigo-50 text-indigo-700 border-indigo-200 gap-1 font-semibold">
                            <Warehouse size={10} /> Warehouse
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-slate-50 text-slate-700 border-slate-200 gap-1 font-semibold">
                            <Store size={10} /> Direct Store
                          </Badge>
                        )}
                      </td>
                      <td className={cn("px-4 py-2.5 font-mono text-[10px] border-r border-border/20",
                        isWh ? "text-indigo-600 font-semibold" : "text-slate-500"
                      )}>
                        {dp.pointId}
                      </td>
                      <td className="px-4 py-2.5 border-r border-border/20">
                        <div className="flex items-center gap-2">
                          {isWh
                            ? <Warehouse size={12} className="text-indigo-500 flex-shrink-0" />
                            : <Store size={12} className="text-slate-400 flex-shrink-0" />}
                          <span className={cn(
                            "font-medium transition-colors",
                            isWh ? "text-indigo-800 group-hover:text-indigo-900" : "text-slate-700 group-hover:text-primary",
                          )}>
                            {dp.pointName}
                          </span>
                          <ArrowRight size={11} className={cn(
                            "transition-colors",
                            isWh ? "text-indigo-300 group-hover:text-indigo-600" : "text-slate-300 group-hover:text-primary/60",
                          )} />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 border-r border-border/20">
                        {isWh ? (
                          <span className="text-[10px] text-slate-500">{dp.region} region</span>
                        ) : (
                          <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5", FORMAT_COLORS[dp.format] ?? "bg-slate-100 text-slate-600")}>
                            {dp.format}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[11px] border-r border-border/20">
                        {isWh ? (
                          <span className="font-semibold text-slate-700">
                            {dp.storesDeficit}
                            <span className="text-slate-400 font-normal">/{dp.storesServiced}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 border-r border-border/20">{dp.onhand.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 border-r border-border/20">{dp.sales.toLocaleString()}</td>
                      <td className={cn("px-4 py-2.5 text-right tabular-nums border-r border-border/20",
                        dp.wos < 2 ? "text-red-500 font-semibold" : "text-slate-600"
                      )}>{dp.wos}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-500 border-r border-border/20">{dp.required.toLocaleString()}</td>
                      <td className={cn("px-4 py-2.5 text-right tabular-nums font-bold border-r border-border/20",
                        level === "high" ? "text-red-600 bg-red-50/60" : level === "medium" ? "text-orange-500 bg-orange-50/40" : "text-slate-400"
                      )}>
                        {dp.deficit > 0 ? dp.deficit.toLocaleString() : <span className="text-emerald-600 font-medium text-[10px]">OK</span>}
                      </td>
                      <td className={cn("px-4 py-2.5 text-right tabular-nums font-bold",
                        dp.suggestedQty > 0 ? "text-primary" : "text-slate-300"
                      )}>
                        {dp.suggestedQty > 0 ? dp.suggestedQty.toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })}

                {tableData.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-xs text-slate-400">
                      No delivery points match your filters.
                    </td>
                  </tr>
                )}

                {/* Totals row */}
                {tableData.length > 0 && (
                  <tr className="border-t-2 border-border/50 bg-slate-50 font-semibold">
                    <td colSpan={5} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 border-r border-border/20">
                      Total ({tableData.length} delivery points)
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700 border-r border-border/20">
                      {totals.onhand.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700 border-r border-border/20">
                      {totals.sales.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 border-r border-border/20" />
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700 border-r border-border/20">
                      {totals.required.toLocaleString()}
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
          This table lists every <strong>delivery point</strong> for this style — warehouses (which aggregate the stores they service) and direct-shipped stores. Stores serviced by a warehouse roll up into their warehouse row and don't appear separately. Click a row to drill into its SKU detail.
        </p>
      </div>
    </MainLayout>
  );
}
