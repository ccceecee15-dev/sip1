import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronDown, ChevronRight,
  MapPin, ShoppingCart, Search, AlertCircle,
  Building2, Store, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Mock data ────────────────────────────────────────────────────────────────
const VENDORS = [
  { name: "INGRAM MICRO, INC.",         code: "011286", brand: "APPLE" },
  { name: "BOSE CORPORATION",           code: "024501", brand: "BOSE" },
  { name: "SONY ELECTRONICS INC.",      code: "038812", brand: "SONY" },
  { name: "HARMAN INTERNATIONAL",       code: "052193", brand: "JBL" },
  { name: "SAMSUNG ELECTRONICS AMERICA",code: "061744", brand: "SAMSUNG" },
  { name: "ANKER INNOVATIONS LIMITED",  code: "073328", brand: "ANKER" },
];

const LOCATION_TYPES = ["WAREHOUSE", "STORE", "STORE", "STORE", "STORE"];
const LOCATION_NAMES: Record<string, string[]> = {
  WAREHOUSE: [
    "DC NORTHEAST - NEWARK NJ", "DC WEST - ONTARIO CA", "DC CENTRAL - MEMPHIS TN",
    "DC SOUTHEAST - ATLANTA GA", "DC NORTH - CHICAGO IL",
  ],
  STORE: [
    "TECH CENTRAL-JFK T4", "GADGET ZONE-LAX T7", "DIGITAL HUB-ATL CONCOURSE B",
    "SMART STORE-ORD T2", "MOBILE WORLD-DFW TERMINAL D", "CONNECT-DEN A-WEST",
    "TECH WORLD-SFO INTL G", "MOBILE PLUS-SEA CENTRAL", "CONNECT-MIA NORTH",
    "TECH HUB-LAS T1", "LICK-HORSESHOE", "HARLEY-LINQ",
    "RUBY BLUE-LINQ", "WELCOME LAS VEGAS-FORUM SHOPS", "LICK-EXCALIBUR",
  ],
};

function rnd(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface LocationRow {
  locationId:      string;
  locationName:    string;
  locationType:    string;
  totalDeficit:    number;
  suggestedOrderQty: number;
  stylesImpacted:  number;
}

interface VendorGroup {
  vendor:     typeof VENDORS[number];
  locations:  LocationRow[];
  totDeficit: number;
  totQty:     number;
  totStyles:  number;
}

const VENDOR_GROUPS: VendorGroup[] = VENDORS.map((vendor) => {
  const locCount = rnd(4, 8);
  const usedStores = new Set<string>();
  const locations: LocationRow[] = Array.from({ length: locCount }, (_, i) => {
    const typeIdx = i % LOCATION_TYPES.length;
    const locType = LOCATION_TYPES[typeIdx];
    const namePool = locType === "WAREHOUSE" ? LOCATION_NAMES.WAREHOUSE : LOCATION_NAMES.STORE;
    let name = namePool[rnd(0, namePool.length - 1)];
    while (usedStores.has(name)) name = namePool[rnd(0, namePool.length - 1)];
    usedStores.add(name);
    const deficit = locType === "WAREHOUSE" ? rnd(500, 8000) : rnd(20, 600);
    const styles  = locType === "WAREHOUSE" ? rnd(5, 20) : rnd(1, 8);
    const order   = Math.ceil(deficit / rnd(5, 20)) * rnd(5, 20);
    return {
      locationId:       `LOC-${vendor.code}-${String(i).padStart(3, "0")}`,
      locationName:     name,
      locationType:     locType,
      totalDeficit:     deficit,
      suggestedOrderQty: order,
      stylesImpacted:   styles,
    };
  });
  return {
    vendor,
    locations,
    totDeficit: locations.reduce((s, l) => s + l.totalDeficit, 0),
    totQty:     locations.reduce((s, l) => s + l.suggestedOrderQty, 0),
    totStyles:  Math.max(...locations.map((l) => l.stylesImpacted)),
  };
});

function defLevel(v: number): "high" | "medium" | "none" {
  if (v > 2000) return "high";
  if (v > 500)  return "medium";
  return "none";
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DeficitByLocation() {
  const [, navigate] = useLocation();

  const [search, setSearch]           = useState("");
  const [filterVendor, setFilterVendor] = useState("all");
  const [filterType, setFilterType]   = useState("all");
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(
    new Set(VENDORS.map((v) => v.code))
  );

  const toggleVendor = (code: string) =>
    setExpandedVendors((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });

  const filtered = useMemo(() => {
    let groups = VENDOR_GROUPS;
    if (filterVendor !== "all") groups = groups.filter((g) => g.vendor.code === filterVendor);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      groups = groups
        .map((g) => ({
          ...g,
          locations: g.locations.filter(
            (l) => l.locationName.toLowerCase().includes(q) || l.locationId.toLowerCase().includes(q)
          ),
        }))
        .filter((g) => g.locations.length > 0);
    }
    if (filterType !== "all") {
      groups = groups
        .map((g) => ({ ...g, locations: g.locations.filter((l) => l.locationType === filterType) }))
        .filter((g) => g.locations.length > 0);
    }
    return groups;
  }, [search, filterVendor, filterType]);

  const grandTotal = useMemo(() => ({
    deficit: filtered.reduce((s, g) => s + g.totDeficit, 0),
    qty:     filtered.reduce((s, g) => s + g.totQty, 0),
  }), [filtered]);

  return (
    <MainLayout>
      <div className="space-y-5 animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => navigate("/reports/sip-planning")}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <ChevronLeft size={14} /> SIP Planning
              </button>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Deficit by Location</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {filtered.length} vendors · {grandTotal.deficit.toLocaleString()} units total deficit · {grandTotal.qty.toLocaleString()} units to order
            </p>
          </div>
          <Button
            size="sm" className="gap-1.5 text-xs font-bold bg-primary"
            onClick={() => navigate("/reports/sip-planning/create-po")}
          >
            <ShoppingCart className="h-3.5 w-3.5" /> Create PO — All Vendors
          </Button>
        </div>

        {/* Filters */}
        <Card className="border-border/60 shadow-none">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1 min-w-[180px]">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Vendor</label>
                <Select value={filterVendor} onValueChange={setFilterVendor}>
                  <SelectTrigger className="h-8 text-[11px] border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-[11px]">All Vendors</SelectItem>
                    {VENDORS.map((v) => <SelectItem key={v.code} value={v.code} className="text-[11px]">{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1 min-w-[140px]">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Location Type</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-8 text-[11px] border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-[11px]">All Types</SelectItem>
                    <SelectItem value="WAREHOUSE" className="text-[11px]">Warehouse</SelectItem>
                    <SelectItem value="STORE" className="text-[11px]">Store</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1 min-w-[220px]">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Search Location</label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Location name or ID…" className="h-8 pl-7 text-[11px] border-slate-200 bg-white" />
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => { setSearch(""); setFilterVendor("all"); setFilterType("all"); }}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Vendors Impacted", value: filtered.length, icon: Building2, color: "text-primary",    bg: "bg-primary/10" },
            { label: "Total Deficit Units", value: grandTotal.deficit.toLocaleString(), icon: AlertCircle, color: "text-red-600",  bg: "bg-red-50" },
            { label: "Total Units to Order", value: grandTotal.qty.toLocaleString(), icon: ShoppingCart, color: "text-emerald-600", bg: "bg-emerald-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="border-border/60 shadow-none">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", bg)}>
                  <Icon size={16} className={color} />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className={cn("text-lg font-bold tabular-nums", color)}>{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Vendor groups */}
        <div className="space-y-3">
          {filtered.map((group) => {
            const isExpanded = expandedVendors.has(group.vendor.code);
            const totLevel   = defLevel(group.totDeficit);
            return (
              <Card key={group.vendor.code} className="border-border/60 shadow-none overflow-hidden">
                {/* Vendor header */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-border/40">
                  <div
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => toggleVendor(group.vendor.code)}
                  >
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      totLevel === "high" ? "bg-red-100" : totLevel === "medium" ? "bg-orange-50" : "bg-slate-100"
                    )}>
                      <Building2 size={15} className={totLevel === "high" ? "text-red-600" : totLevel === "medium" ? "text-orange-500" : "text-slate-500"} />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{group.vendor.name}</p>
                      <p className="text-[11px] text-slate-500">
                        Code: {group.vendor.code} · Brand: {group.vendor.brand} · {group.locations.length} locations
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 flex-shrink-0">
                    <div
                      className="text-right cursor-pointer"
                      onClick={() => toggleVendor(group.vendor.code)}
                    >
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Total Deficit</p>
                      <p className={cn("text-base font-bold tabular-nums",
                        totLevel === "high" ? "text-red-600" : totLevel === "medium" ? "text-orange-500" : "text-slate-700"
                      )}>{group.totDeficit.toLocaleString()}</p>
                    </div>
                    <div
                      className="text-right cursor-pointer"
                      onClick={() => toggleVendor(group.vendor.code)}
                    >
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Order Qty</p>
                      <p className="text-base font-bold tabular-nums text-emerald-700">{group.totQty.toLocaleString()}</p>
                    </div>
                    <Button
                      size="sm" className="h-8 text-xs gap-1.5 bg-primary shrink-0"
                      onClick={() => navigate(`/reports/sip-planning/create-po?vendor=${encodeURIComponent(group.vendor.name)}`)}
                    >
                      <ShoppingCart size={13} /> Create PO
                    </Button>
                    <div
                      className="cursor-pointer"
                      onClick={() => toggleVendor(group.vendor.code)}
                    >
                      {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                    </div>
                  </div>
                </div>

                {/* Location rows */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="text-xs w-full border-collapse">
                      <thead>
                        <tr className="bg-white border-b border-border/40">
                          <th className="px-5 py-2 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20">Location ID</th>
                          <th className="px-4 py-2 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20">Location Name</th>
                          <th className="px-4 py-2 text-left font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20">Type</th>
                          <th className="px-4 py-2 text-right font-semibold text-[10px] uppercase tracking-wide text-red-600 border-r border-border/20">Total Deficit</th>
                          <th className="px-4 py-2 text-right font-semibold text-[10px] uppercase tracking-wide text-slate-500 border-r border-border/20">Suggested Order Qty</th>
                          <th className="px-4 py-2 text-right font-semibold text-[10px] uppercase tracking-wide text-slate-500">Styles Impacted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.locations.map((loc, li) => {
                          const level = defLevel(loc.totalDeficit);
                          return (
                            <tr key={li} className="border-b border-border/20 hover:bg-slate-50/60 transition-colors">
                              <td className="px-5 py-2.5 font-mono text-[10px] text-slate-500 border-r border-border/20">
                                {loc.locationId}
                              </td>
                              <td className="px-4 py-2.5 border-r border-border/20">
                                <div className="flex items-center gap-2">
                                  {loc.locationType === "WAREHOUSE"
                                    ? <Building2 size={12} className="text-slate-400 flex-shrink-0" />
                                    : <Store size={12} className="text-slate-400 flex-shrink-0" />}
                                  <span className="font-medium text-slate-700">{loc.locationName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 border-r border-border/20">
                                <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5",
                                  loc.locationType === "WAREHOUSE" ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-blue-50 text-blue-700 border-blue-200"
                                )}>
                                  {loc.locationType}
                                </Badge>
                              </td>
                              <td className={cn("px-4 py-2.5 text-right tabular-nums font-bold border-r border-border/20",
                                level === "high" ? "text-red-600 bg-red-50/50" : level === "medium" ? "text-orange-500 bg-orange-50/40" : "text-slate-500"
                              )}>
                                {loc.totalDeficit.toLocaleString()}
                              </td>
                              <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-emerald-700 border-r border-border/20">
                                {loc.suggestedOrderQty.toLocaleString()}
                              </td>
                              <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                                {loc.stylesImpacted}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Sub-total row */}
                        <tr className="border-t-2 border-border/40 bg-slate-50/80">
                          <td colSpan={3} className="px-5 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 border-r border-border/20">
                            Subtotal — {group.vendor.name}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums font-bold text-red-700 border-r border-border/20">
                            {group.totDeficit.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums font-bold text-emerald-700 border-r border-border/20">
                            {group.totQty.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums font-bold text-slate-600">
                            —
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}

          {filtered.length === 0 && (
            <Card className="border-border/60 shadow-none">
              <CardContent className="py-16 text-center">
                <MapPin size={32} className="mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm font-semibold text-muted-foreground">No results match your filters.</p>
                <Button size="sm" variant="outline" className="mt-4 text-xs"
                  onClick={() => { setSearch(""); setFilterVendor("all"); setFilterType("all"); }}>
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Bottom CTA */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div>
              <p className="text-sm font-bold text-slate-800">Ready to place orders?</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Review the {grandTotal.qty.toLocaleString()} units across {filtered.length} vendor{filtered.length > 1 ? "s" : ""} and create purchase orders.
              </p>
            </div>
            <Button
              className="gap-1.5 text-xs font-bold"
              onClick={() => navigate("/reports/sip-planning/create-po")}
            >
              <ArrowRight size={14} /> Create Purchase Orders
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
