import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft, ShoppingCart, CheckCircle2,
  Package, AlertCircle, Search, Warehouse, Store, MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Seeded RNG (matches StyleStores / WarehouseSkus) ─────────────────────────
function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function seededRng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

// ─── SKU-level mock catalogue per vendor ──────────────────────────────────────
interface SkuLine {
  upc:          string;
  styleCode:    string;
  variant:      string;
  description:  string;
  moq:          number;
  orderMultiple:number;
  deficit:      number;
  suggestedQty: number;
  cost:         number;
}

const VENDOR_SKUS: Record<string, SkuLine[]> = {
  "INGRAM MICRO, INC.": [
    { upc: "190199001234", styleCode: "1000007", variant: "WHITE",     description: "APPLE LB AIRPODS PRO GEN 3 TRUE WIRELESS EARBUDS WHITE",           moq: 12, orderMultiple: 6,  deficit: 98,  suggestedQty: 120, cost: 189.99 },
    { upc: "190199001235", styleCode: "1000007", variant: "MIDNIGHT",  description: "APPLE LB AIRPODS PRO GEN 3 TRUE WIRELESS EARBUDS MIDNIGHT",         moq: 12, orderMultiple: 6,  deficit: 55,  suggestedQty: 60,  cost: 189.99 },
    { upc: "190199001236", styleCode: "1000014", variant: "WHITE",     description: "APPLE AIRPODS 4 ANC TRUE WIRELESS EARBUDS WHITE",                   moq: 10, orderMultiple: 10, deficit: 72,  suggestedQty: 80,  cost: 124.99 },
    { upc: "190199001237", styleCode: "1000014", variant: "BLACK",     description: "APPLE AIRPODS 4 ANC TRUE WIRELESS EARBUDS BLACK",                   moq: 10, orderMultiple: 10, deficit: 33,  suggestedQty: 40,  cost: 124.99 },
    { upc: "190199001238", styleCode: "1000021", variant: "MIDNIGHT",  description: "APPLE AIRPODS MAX OVER EAR WIRELESS HEADPHONES MIDNIGHT",           moq: 6,  orderMultiple: 6,  deficit: 30,  suggestedQty: 36,  cost: 349.99 },
    { upc: "190199001239", styleCode: "1000021", variant: "STARLIGHT", description: "APPLE AIRPODS MAX OVER EAR WIRELESS HEADPHONES STARLIGHT",          moq: 6,  orderMultiple: 6,  deficit: 18,  suggestedQty: 24,  cost: 349.99 },
    { upc: "190199001240", styleCode: "1000028", variant: "WHITE 1M",  description: "APPLE MAGSAFE CHARGER 1M USB-C WHITE",                              moq: 24, orderMultiple: 12, deficit: 210, suggestedQty: 240, cost: 24.99  },
    { upc: "190199001241", styleCode: "1000035", variant: "WHITE 1M",  description: "APPLE USB-C TO LIGHTNING CABLE 1M WHITE",                           moq: 24, orderMultiple: 12, deficit: 130, suggestedQty: 144, cost: 18.99  },
    { upc: "190199001242", styleCode: "1000042", variant: "WHITE",     description: "APPLE 20W USB-C POWER ADAPTER WHITE",                               moq: 24, orderMultiple: 24, deficit: 175, suggestedQty: 192, cost: 15.99  },
    { upc: "190199001243", styleCode: "1000042", variant: "BLACK",     description: "APPLE 20W USB-C POWER ADAPTER BLACK",                               moq: 24, orderMultiple: 24, deficit: 88,  suggestedQty: 96,  cost: 15.99  },
  ],
  "BOSE CORPORATION": [
    { upc: "017817825320", styleCode: "1000049", variant: "BLACK",     description: "BOSE QUIETCOMFORT 45 WIRELESS HEADPHONES BLACK",                    moq: 6,  orderMultiple: 6,  deficit: 52,  suggestedQty: 60,  cost: 209.95 },
    { upc: "017817825321", styleCode: "1000049", variant: "WHITE",     description: "BOSE QUIETCOMFORT 45 WIRELESS HEADPHONES WHITE",                    moq: 6,  orderMultiple: 6,  deficit: 28,  suggestedQty: 30,  cost: 209.95 },
    { upc: "017817825322", styleCode: "1000056", variant: "BLACK",     description: "BOSE QUIETCOMFORT EARBUDS II TRUE WIRELESS BLACK",                  moq: 6,  orderMultiple: 6,  deficit: 40,  suggestedQty: 48,  cost: 179.95 },
    { upc: "017817825323", styleCode: "1000063", variant: "BLACK",     description: "BOSE SOUNDLINK FLEX PORTABLE SPEAKER BLACK",                        moq: 6,  orderMultiple: 6,  deficit: 63,  suggestedQty: 72,  cost: 94.95  },
    { upc: "017817825324", styleCode: "1000063", variant: "BLUE",      description: "BOSE SOUNDLINK FLEX PORTABLE SPEAKER BLUE",                         moq: 6,  orderMultiple: 6,  deficit: 22,  suggestedQty: 24,  cost: 94.95  },
    { upc: "017817825325", styleCode: "1000070", variant: "BLACK",     description: "BOSE SPORT EARBUDS TRUE WIRELESS IN EAR BLACK",                    moq: 6,  orderMultiple: 6,  deficit: 31,  suggestedQty: 36,  cost: 114.95 },
  ],
  "SONY ELECTRONICS INC.": [
    { upc: "027242924819", styleCode: "1000077", variant: "BLACK",     description: "SONY WH-1000XM5 NOISE CANCELLING HEADPHONES BLACK",                 moq: 6,  orderMultiple: 6,  deficit: 48,  suggestedQty: 54,  cost: 224.99 },
    { upc: "027242924820", styleCode: "1000077", variant: "SILVER",    description: "SONY WH-1000XM5 NOISE CANCELLING HEADPHONES SILVER",                moq: 6,  orderMultiple: 6,  deficit: 21,  suggestedQty: 24,  cost: 224.99 },
    { upc: "027242924821", styleCode: "1000084", variant: "BLACK",     description: "SONY WF-1000XM5 TRUE WIRELESS EARBUDS BLACK",                       moq: 6,  orderMultiple: 6,  deficit: 42,  suggestedQty: 48,  cost: 179.99 },
    { upc: "027242924822", styleCode: "1000084", variant: "SILVER",    description: "SONY WF-1000XM5 TRUE WIRELESS EARBUDS SILVER",                      moq: 6,  orderMultiple: 6,  deficit: 19,  suggestedQty: 24,  cost: 179.99 },
    { upc: "027242924823", styleCode: "1000091", variant: "WHITE",     description: "SONY LINKBUDS S NOISE CANCELLING EARBUDS WHITE",                    moq: 12, orderMultiple: 12, deficit: 85,  suggestedQty: 96,  cost: 94.99  },
    { upc: "027242924824", styleCode: "1000098", variant: "BLACK",     description: "SONY SRS-XB100 COMPACT PORTABLE SPEAKER BLACK",                     moq: 12, orderMultiple: 12, deficit: 132, suggestedQty: 144, cost: 37.99  },
    { upc: "027242924825", styleCode: "1000098", variant: "BLUE",      description: "SONY SRS-XB100 COMPACT PORTABLE SPEAKER BLUE",                      moq: 12, orderMultiple: 12, deficit: 44,  suggestedQty: 48,  cost: 37.99  },
  ],
  "HARMAN INTERNATIONAL": [
    { upc: "050036381350", styleCode: "1000105", variant: "BLACK",     description: "JBL TUNE 770NC WIRELESS NOISE CANCELLING HEADPHONES BLACK",         moq: 10, orderMultiple: 10, deficit: 72,  suggestedQty: 80,  cost: 82.99  },
    { upc: "050036381351", styleCode: "1000105", variant: "WHITE",     description: "JBL TUNE 770NC WIRELESS NOISE CANCELLING HEADPHONES WHITE",         moq: 10, orderMultiple: 10, deficit: 38,  suggestedQty: 40,  cost: 82.99  },
    { upc: "050036381352", styleCode: "1000112", variant: "BLACK",     description: "JBL LIVE FREE 2 TWS WIRELESS EARBUDS BLACK",                        moq: 10, orderMultiple: 10, deficit: 55,  suggestedQty: 60,  cost: 62.99  },
    { upc: "050036381353", styleCode: "1000119", variant: "BLACK",     description: "JBL CHARGE 5 WATERPROOF BLUETOOTH SPEAKER BLACK",                   moq: 6,  orderMultiple: 6,  deficit: 43,  suggestedQty: 48,  cost: 112.99 },
    { upc: "050036381354", styleCode: "1000119", variant: "RED",       description: "JBL CHARGE 5 WATERPROOF BLUETOOTH SPEAKER RED",                     moq: 6,  orderMultiple: 6,  deficit: 17,  suggestedQty: 18,  cost: 112.99 },
    { upc: "050036381355", styleCode: "1000126", variant: "BLACK",     description: "JBL FLIP 6 WATERPROOF BLUETOOTH SPEAKER BLACK",                     moq: 6,  orderMultiple: 6,  deficit: 50,  suggestedQty: 54,  cost: 76.99  },
    { upc: "050036381356", styleCode: "1000133", variant: "BLACK",     description: "JBL TOUR PRO 2 NOISE CANCELLING EARBUDS BLACK",                     moq: 6,  orderMultiple: 6,  deficit: 26,  suggestedQty: 30,  cost: 139.99 },
  ],
  "SAMSUNG ELECTRONICS AMERICA": [
    { upc: "887276703305", styleCode: "1000140", variant: "SILVER",    description: "SAMSUNG GALAXY BUDS3 PRO TRUE WIRELESS EARBUDS SILVER",             moq: 6,  orderMultiple: 6,  deficit: 36,  suggestedQty: 42,  cost: 159.99 },
    { upc: "887276703306", styleCode: "1000140", variant: "BLACK",     description: "SAMSUNG GALAXY BUDS3 PRO TRUE WIRELESS EARBUDS BLACK",              moq: 6,  orderMultiple: 6,  deficit: 22,  suggestedQty: 24,  cost: 159.99 },
    { upc: "887276703307", styleCode: "1000147", variant: "SILVER",    description: "SAMSUNG GALAXY BUDS3 TRUE WIRELESS EARBUDS SILVER",                 moq: 6,  orderMultiple: 6,  deficit: 55,  suggestedQty: 60,  cost: 109.99 },
    { upc: "887276703308", styleCode: "1000154", variant: "BLACK",     description: "SAMSUNG 45W USB-C POWER ADAPTER SUPER FAST CHARGING BLACK",         moq: 24, orderMultiple: 12, deficit: 132, suggestedQty: 144, cost: 24.99  },
    { upc: "887276703309", styleCode: "1000161", variant: "BLACK 1.8M",description: "SAMSUNG USB-C TO USB-C CABLE 1.8M 5A FAST CHARGING BLACK",          moq: 24, orderMultiple: 12, deficit: 108, suggestedQty: 120, cost: 18.99  },
  ],
  "ANKER INNOVATIONS LIMITED": [
    { upc: "194644086572", styleCode: "1000168", variant: "BLACK",     description: "ANKER SOUNDCORE LIFE Q35 NOISE CANCELLING HEADPHONES BLACK",        moq: 10, orderMultiple: 10, deficit: 54,  suggestedQty: 60,  cost: 49.99  },
    { upc: "194644086573", styleCode: "1000175", variant: "BLACK",     description: "ANKER SOUNDCORE LIBERTY 4 NC TRUE WIRELESS EARBUDS BLACK",           moq: 10, orderMultiple: 10, deficit: 63,  suggestedQty: 70,  cost: 56.99  },
    { upc: "194644086574", styleCode: "1000175", variant: "WHITE",     description: "ANKER SOUNDCORE LIBERTY 4 NC TRUE WIRELESS EARBUDS WHITE",           moq: 10, orderMultiple: 10, deficit: 31,  suggestedQty: 40,  cost: 56.99  },
    { upc: "194644086575", styleCode: "1000182", variant: "BLACK",     description: "ANKER 737 POWER BANK 24000MAH 140W PORTABLE CHARGER BLACK",          moq: 10, orderMultiple: 10, deficit: 44,  suggestedQty: 50,  cost: 62.99  },
    { upc: "194644086576", styleCode: "1000189", variant: "BLACK",     description: "ANKER NANO 65W USB-C COMPACT FAST CHARGER BLACK",                   moq: 20, orderMultiple: 10, deficit: 73,  suggestedQty: 80,  cost: 28.99  },
    { upc: "194644086577", styleCode: "1000196", variant: "DARK BLUE", description: "ANKER 548 USB-C HUB 7-IN-1 DATA HUB DARK BLUE",                     moq: 10, orderMultiple: 10, deficit: 37,  suggestedQty: 40,  cost: 31.99  },
  ],
};

const DEFAULT_VENDOR   = "INGRAM MICRO, INC.";
const ALL_VENDOR_NAMES = Object.keys(VENDOR_SKUS);

// ─── Per-delivery-point deficit generator ────────────────────────────────────
// Deterministic per (deliveryPointKey, upc). Returns 0 ⇒ SKU not in deficit at
// this delivery point (filtered out).
function deliveryPointDeficit(
  dpKey: string,
  upc: string,
  baseSuggested: number,
  multiple: number,
): { deficit: number; suggestedQty: number } {
  const rng = seededRng(hashStr(dpKey + "::" + upc));
  if (rng() < 0.30) return { deficit: 0, suggestedQty: 0 };
  const scale       = 0.08 + rng() * 0.32;
  const rawDeficit  = Math.max(1, Math.round(baseSuggested * 0.85 * scale));
  const suggestedQty = Math.ceil(rawDeficit / Math.max(1, multiple)) * Math.max(1, multiple);
  return { deficit: rawDeficit, suggestedQty };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CreatePO() {
  const [location, navigate] = useLocation();

  // Parse all URL params once per location change
  const urlParams = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    return {
      vendor:     p.get("vendor")     ?? DEFAULT_VENDOR,
      vendorCode: p.get("vendorCode") ?? "",
      loc:        (p.get("loc") ?? "").toLowerCase(),     // "warehouse" | "store" | ""
      code:       p.get("code")       ?? "",              // whCode or storeId
      name:       p.get("name")       ?? "",              // whName or storeName
      region:     p.get("region")     ?? "",
      style:      p.get("style")      ?? "",
      desc:       p.get("desc")       ?? "",
    };
  }, [location]);

  const [vendor, setVendor]       = useState(urlParams.vendor);
  const [search, setSearch]       = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [poNumber] = useState(
    () => `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`
  );

  // Resolve effective delivery point (only when loc + name provided)
  const deliveryPoint = useMemo(() => {
    if (!urlParams.loc || !urlParams.name) return null;
    return {
      kind:   urlParams.loc as "warehouse" | "store",
      code:   urlParams.code,
      name:   urlParams.name,
      region: urlParams.region,
    };
  }, [urlParams]);

  // SKUs for the chosen vendor, with per-delivery-point deficit applied (and filtered)
  const dpSkus = useMemo<SkuLine[]>(() => {
    const base = VENDOR_SKUS[vendor] ?? VENDOR_SKUS[DEFAULT_VENDOR];
    if (!deliveryPoint) return base; // legacy / "all vendor" mode
    const dpKey = `${deliveryPoint.kind}:${deliveryPoint.code || deliveryPoint.name}`;
    return base
      .map((s) => {
        const { deficit, suggestedQty } = deliveryPointDeficit(
          dpKey, s.upc, s.suggestedQty, s.orderMultiple,
        );
        return { ...s, deficit, suggestedQty };
      })
      .filter((s) => s.deficit > 0);
  }, [vendor, deliveryPoint]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(dpSkus.map((s) => s.upc)));
  const [editQty, setEditQty]   = useState<Record<string, number>>(
    () => Object.fromEntries(dpSkus.map((s) => [s.upc, s.suggestedQty]))
  );

  useEffect(() => {
    setSelected(new Set(dpSkus.map((s) => s.upc)));
    setEditQty(Object.fromEntries(dpSkus.map((s) => [s.upc, s.suggestedQty])));
    setSearch("");
    setSubmitted(false);
  }, [dpSkus]);

  const filteredSkus = useMemo(() => {
    if (!search.trim()) return dpSkus;
    const q = search.trim().toLowerCase();
    return dpSkus.filter(
      (s) =>
        s.upc.includes(q) ||
        s.styleCode.includes(q) ||
        s.variant.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }, [dpSkus, search]);

  const allSelected  = selected.size === dpSkus.length && dpSkus.length > 0;
  const someSelected = selected.size > 0 && selected.size < dpSkus.length;

  const toggleAll = () => {
    if (selected.size === dpSkus.length) setSelected(new Set());
    else setSelected(new Set(dpSkus.map((s) => s.upc)));
  };

  const toggleSku = (upc: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(upc) ? next.delete(upc) : next.add(upc);
      return next;
    });

  const updateQty = (upc: string, raw: string) => {
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 0) setEditQty((prev) => ({ ...prev, [upc]: n }));
  };

  const snapToMultiple = (upc: string, multiple: number) => {
    const current = editQty[upc] ?? 0;
    const snapped = Math.ceil(current / multiple) * multiple;
    setEditQty((prev) => ({ ...prev, [upc]: snapped }));
  };

  const summary = useMemo(() => {
    const sel          = dpSkus.filter((s) => selected.has(s.upc));
    const totalQty     = sel.reduce((sum, s) => sum + (editQty[s.upc] ?? 0), 0);
    const totalCost    = sel.reduce((sum, s) => sum + (editQty[s.upc] ?? 0) * s.cost, 0);
    const totalDeficit = sel.reduce((sum, s) => sum + s.deficit, 0);
    return { count: sel.length, totalQty, totalCost, totalDeficit };
  }, [selected, editQty, dpSkus]);

  if (submitted) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-32 space-y-6 animate-in fade-in duration-500">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 size={40} className="text-emerald-600" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-800">Purchase Order Submitted</h2>
            <p className="text-sm text-slate-500 mt-1">
              PO Number: <span className="font-mono font-bold text-primary">{poNumber}</span>
            </p>
            {deliveryPoint && (
              <p className="text-xs text-slate-400 mt-1">
                Ship to <span className="font-semibold text-slate-600">{deliveryPoint.name}</span>
                {deliveryPoint.code && <> ({deliveryPoint.code})</>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4 p-5 rounded-xl bg-slate-50 border border-border/50 min-w-[340px]">
            <div className="text-center flex-1 border-r border-border/50">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">SKUs</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{summary.count}</p>
            </div>
            <div className="text-center flex-1 border-r border-border/50">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Total Units</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{summary.totalQty.toLocaleString()}</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Total Cost</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                ${summary.totalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/reports/sip-planning/deficit-by-location")}>
              Back to Deficit View
            </Button>
            <Button size="sm" onClick={() => navigate("/reports/sip-planning")}>
              Return to SIP Planning
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const dpIcon       = deliveryPoint?.kind === "warehouse" ? Warehouse : Store;
  const DpIcon       = dpIcon;
  const dpKindLabel  = deliveryPoint?.kind === "warehouse" ? "Warehouse" : "Direct-Shipped Store";
  const dpAccentBg   = deliveryPoint?.kind === "warehouse" ? "bg-violet-50"  : "bg-blue-50";
  const dpAccentText = deliveryPoint?.kind === "warehouse" ? "text-violet-700" : "text-blue-700";
  const dpAccentBorder = deliveryPoint?.kind === "warehouse" ? "border-violet-200" : "border-blue-200";

  return (
    <MainLayout>
      <div className="space-y-5 animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <button
              onClick={() => navigate("/reports/sip-planning/deficit-by-location")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mb-1"
            >
              <ChevronLeft size={14} /> Deficit by Location
            </button>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Create Purchase Order</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {deliveryPoint
                ? <>{dpSkus.length} SKU{dpSkus.length === 1 ? "" : "s"} in deficit at this delivery point · Adjust quantities and submit</>
                : <>{dpSkus.length} SKUs with deficit · Select and adjust quantities before submitting</>}
            </p>
          </div>
          <Badge variant="outline" className="text-[11px] h-7 px-3 font-mono self-start mt-1">{poNumber}</Badge>
        </div>

        {/* Delivery Point Card */}
        {deliveryPoint && (
          <Card className={cn("border shadow-none", dpAccentBorder, dpAccentBg)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border", dpAccentBorder)}>
                    <DpIcon size={18} className={dpAccentText} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ship To · {dpKindLabel}</p>
                      {deliveryPoint.code && (
                        <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 font-mono", dpAccentBg, dpAccentText, dpAccentBorder)}>
                          {deliveryPoint.code}
                        </Badge>
                      )}
                    </div>
                    <p className="text-base font-bold text-slate-800 mt-0.5 truncate">{deliveryPoint.name}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap text-[11px] text-slate-500">
                      {deliveryPoint.region && (
                        <span className="flex items-center gap-1">
                          <MapPin size={10} className="text-slate-400" />
                          Region: <strong className="text-slate-700">{deliveryPoint.region}</strong>
                        </span>
                      )}
                      <span>Vendor: <strong className="text-slate-700">{vendor}</strong>{urlParams.vendorCode && <> ({urlParams.vendorCode})</>}</span>
                      {urlParams.style && (
                        <span>Origin Style: <span className="font-mono font-semibold text-primary">{urlParams.style}</span></span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-5 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">SKUs in Deficit</p>
                    <p className="text-lg font-bold text-slate-800 tabular-nums">{dpSkus.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Total Deficit</p>
                    <p className="text-lg font-bold text-red-600 tabular-nums">
                      {dpSkus.reduce((s, x) => s + x.deficit, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Suggested Units</p>
                    <p className="text-lg font-bold text-emerald-700 tabular-nums">
                      {dpSkus.reduce((s, x) => s + x.suggestedQty, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vendor + Search */}
        <Card className="border-border/60 shadow-none">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1 min-w-[260px]">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vendor</label>
                <select
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="h-8 px-3 text-[11px] border border-slate-200 rounded-md bg-white font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {ALL_VENDOR_NAMES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1 min-w-[240px]">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Search SKU</label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="UPC, style, variant or description…"
                    className="h-8 pl-7 text-[11px] border-slate-200 bg-white"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 items-start">
          {/* Table */}
          <div className="flex-1 min-w-0">
            <Card className="border-border/60 shadow-none overflow-hidden">
              <div className="overflow-x-auto">
                <table className="text-xs w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b-2 border-border/50">
                      <th className="px-3 py-2.5 border-r border-border/20 w-10">
                        <Checkbox
                          checked={allSelected}
                          ref={(el) => { if (el) (el as any).indeterminate = someSelected; }}
                          onCheckedChange={toggleAll}
                          className="h-3.5 w-3.5"
                        />
                      </th>
                      <th className="px-3 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20 whitespace-nowrap">UPC</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20 whitespace-nowrap">Style</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20">Variant</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20">Description</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20">Cost</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20">MOQ</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20 whitespace-nowrap">Order Mult.</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-[10px] uppercase tracking-wide text-red-500 border-r border-border/20">Deficit</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20 whitespace-nowrap">Sugg. Qty</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-[10px] uppercase tracking-wide text-primary whitespace-nowrap">Order Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSkus.map((s, i) => {
                      const isSelected = selected.has(s.upc);
                      const qty        = editQty[s.upc] ?? s.suggestedQty;
                      const isBelowMoq = qty < s.moq && qty > 0;
                      return (
                        <tr
                          key={s.upc}
                          className={cn(
                            "border-b border-border/20 transition-colors",
                            isSelected
                              ? "bg-primary/5 hover:bg-primary/8"
                              : "opacity-50 hover:opacity-70 hover:bg-slate-50/50",
                            i % 2 !== 0 && "bg-muted/[0.02]",
                          )}
                        >
                          <td className="px-3 py-2.5 border-r border-border/20">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSku(s.upc)}
                              className="h-3.5 w-3.5"
                            />
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[10px] text-slate-400 whitespace-nowrap border-r border-border/20">
                            {s.upc}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-[10px] font-medium text-primary whitespace-nowrap border-r border-border/20">
                            {s.styleCode}
                          </td>
                          <td className="px-3 py-2.5 border-r border-border/20">
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5 px-1.5 bg-slate-50 text-slate-700 border-slate-200 whitespace-nowrap"
                            >
                              {s.variant}
                            </Badge>
                          </td>
                          <td
                            className="px-3 py-2.5 max-w-[240px] truncate border-r border-border/20 text-slate-700"
                            title={s.description}
                          >
                            {s.description}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 border-r border-border/20 whitespace-nowrap">
                            ${s.cost.toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-500 border-r border-border/20">
                            {s.moq}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-500 border-r border-border/20">
                            {s.orderMultiple}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-bold text-red-600 border-r border-border/20">
                            {s.deficit.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-500 border-r border-border/20">
                            {s.suggestedQty}
                          </td>
                          <td className="px-3 py-2.5 border-r-0">
                            <div className="flex items-center justify-end gap-1.5">
                              {isBelowMoq && (
                                <AlertCircle
                                  size={12}
                                  className="text-amber-500 flex-shrink-0"
                                />
                              )}
                              <Input
                                type="number"
                                min={0}
                                value={qty}
                                disabled={!isSelected}
                                onChange={(e) => updateQty(s.upc, e.target.value)}
                                onBlur={() => snapToMultiple(s.upc, s.orderMultiple)}
                                className={cn(
                                  "h-7 w-[72px] text-right text-[11px] font-bold tabular-nums border focus:ring-1",
                                  isBelowMoq
                                    ? "border-amber-300 focus:ring-amber-400 text-amber-700"
                                    : "border-primary/40 focus:ring-primary text-primary"
                                )}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredSkus.length === 0 && (
                      <tr>
                        <td colSpan={11} className="py-10 text-center text-xs text-slate-400">
                          {dpSkus.length === 0
                            ? "No SKUs from this vendor are in deficit at this delivery point."
                            : "No SKUs match your search."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
            <p className="text-[10px] text-slate-400 mt-2 ml-1">
              Qty auto-snaps to order multiple on blur. MOQ warnings shown with{" "}
              <AlertCircle size={10} className="inline text-amber-500" />.
            </p>
          </div>

          {/* Summary Panel */}
          <div className="w-64 flex-shrink-0 space-y-3">
            <Card className="border-border/60 shadow-none">
              <CardContent className="p-4 space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                  <Package size={13} /> Order Summary
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Vendor</span>
                    <span className="text-[11px] font-bold text-slate-700 text-right max-w-[120px] leading-tight">
                      {vendor.split(",")[0]}
                    </span>
                  </div>
                  {deliveryPoint && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500 flex-shrink-0">Ship To</span>
                      <span className="text-[11px] font-bold text-slate-700 text-right truncate max-w-[140px]" title={deliveryPoint.name}>
                        {deliveryPoint.name}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">PO Number</span>
                    <span className="text-[11px] font-mono font-bold text-primary">{poNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">SKUs Selected</span>
                    <span className="text-sm font-bold text-slate-800">{summary.count} / {dpSkus.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Total Deficit</span>
                    <span className="text-sm font-bold text-red-600 tabular-nums">{summary.totalDeficit.toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-border/50" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Total Units</span>
                    <span className="text-lg font-bold text-slate-800 tabular-nums">{summary.totalQty.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Total Cost</span>
                    <span className="text-lg font-bold text-emerald-700 tabular-nums">
                      ${summary.totalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
                <Button
                  className="w-full gap-1.5 text-xs font-bold"
                  disabled={summary.count === 0 || summary.totalQty === 0}
                  onClick={() => setSubmitted(true)}
                >
                  <ShoppingCart size={14} /> Submit PO
                </Button>
                <Button
                  variant="outline" size="sm" className="w-full text-xs"
                  onClick={() => navigate("/reports/sip-planning/deficit-by-location")}
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>

            {summary.count > 0 && (
              <Card className="border-amber-200 bg-amber-50/50 shadow-none">
                <CardContent className="p-3">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1">Checklist</p>
                  {[
                    "All quantities above MOQ",
                    "Quantities snap to order multiple",
                    "Vendor terms confirmed",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-1.5 text-[10px] text-amber-800 py-0.5">
                      <CheckCircle2 size={10} className="text-amber-500 flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
