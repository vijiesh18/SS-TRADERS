"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  IndianRupee, TrendingUp, Wallet, AlertTriangle,
  AlertCircle, Users, ShoppingCart, Zap, ArrowRight,
} from "lucide-react";
import { useDashboardSummary, useDashboardCharts } from "@/hooks/use-dashboard";
import { formatCurrency } from "@/lib/utils";

/* ── Animated counter ───────────────────────────────────── */
function AnimatedNumber({ value, duration = 1200, prefix = "₹" }: {
  value: number; duration?: number; prefix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);
  const t0  = useRef<number | null>(null);
  useEffect(() => {
    if (!value) { setDisplay(0); return; }
    t0.current = null;
    const tick = (ts: number) => {
      if (!t0.current) t0.current = ts;
      const p = Math.min((ts - t0.current) / duration, 1);
      setDisplay(Math.floor((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration]);
  return <span>{prefix}{Math.round(display).toLocaleString("en-IN")}</span>;
}

function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number | null>(null);
  const t0  = useRef<number | null>(null);
  useEffect(() => {
    if (!value) { setDisplay(0); return; }
    t0.current = null;
    const tick = (ts: number) => {
      if (!t0.current) t0.current = ts;
      const p = Math.min((ts - t0.current) / duration, 1);
      setDisplay(Math.floor((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value, duration]);
  return <span>{display.toLocaleString("en-IN")}</span>;
}

/* ── Tooltip ────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:"rgba(250,247,242,0.98)", border:"1px solid rgba(180,155,110,0.35)",
      borderRadius:10, padding:"10px 14px", fontSize:13,
      boxShadow:"0 8px 24px rgba(100,80,40,0.15)",
    }}>
      <div style={{ color:"#a8937a", marginBottom:4, fontSize:11 }}>{label}</div>
      <div style={{ color:"#6b7c45", fontWeight:800, fontFamily:"Georgia,serif", fontSize:15 }}>
        {formatCurrency(payload[0]?.value)}
      </div>
    </div>
  );
};

const PERIODS = [
  { key:"daily",   label:"Today" },
  { key:"weekly",  label:"Week"  },
  { key:"monthly", label:"Month" },
  { key:"yearly",  label:"Year"  },
] as const;

const CHART_COLORS = ["#6b7c45","#c47a3a","#7a9e7e","#b8956a","#8fa05a","#d4924a","#a8c07a","#c0a882"];

type Accent = "olive"|"copper"|"sage"|"rust";

const ACCENT: Record<Accent,{ color:string; bg:string; border:string; shadow:string }> = {
  olive:  { color:"#6b7c45", bg:"rgba(107,124,69,0.08)",  border:"rgba(107,124,69,0.25)",  shadow:"rgba(107,124,69,0.12)"  },
  copper: { color:"#c47a3a", bg:"rgba(196,122,58,0.08)",  border:"rgba(196,122,58,0.25)",  shadow:"rgba(196,122,58,0.12)"  },
  sage:   { color:"#7a9e7e", bg:"rgba(122,158,126,0.08)", border:"rgba(122,158,126,0.25)", shadow:"rgba(122,158,126,0.12)" },
  rust:   { color:"#c0552a", bg:"rgba(192,85,42,0.08)",   border:"rgba(192,85,42,0.25)",   shadow:"rgba(192,85,42,0.12)"   },
};

/* ── Metric card ────────────────────────────────────────── */
function MetricCard({ label, value, icon:Icon, accent="olive", delay=0, isLoading, isCurrency=true, change }: {
  label:string; value:number; icon:React.ElementType;
  accent?:Accent; delay?:number; isLoading?:boolean; isCurrency?:boolean; change?:string;
}) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(()=>setVis(true), delay); return ()=>clearTimeout(t); }, [delay]);
  const a = ACCENT[accent];

  return (
    <div style={{
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(20px)",
      background: "rgba(250,247,242,0.85)",
      backdropFilter: "blur(16px)",
      border: `1px solid ${a.border}`,
      borderRadius: 16,
      boxShadow: `0 4px 20px ${a.shadow}, 0 1px 4px rgba(100,80,40,0.06), inset 0 1px 0 rgba(255,255,255,0.7)`,
      padding: "22px 24px",
      position: "relative",
      overflow: "hidden",
      cursor: "default",
      transition: "opacity 0.45s ease, transform 0.45s cubic-bezier(.34,1.1,.64,1), box-shadow 0.25s",
    }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(-4px)";
        el.style.boxShadow = `0 12px 32px ${a.shadow}, 0 2px 8px rgba(100,80,40,0.10), inset 0 1px 0 rgba(255,255,255,0.8)`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = "translateY(0)";
        el.style.boxShadow = `0 4px 20px ${a.shadow}, 0 1px 4px rgba(100,80,40,0.06), inset 0 1px 0 rgba(255,255,255,0.7)`;
      }}
    >
      {/* Shine */}
      <div style={{ position:"absolute", inset:0, borderRadius:"inherit", background:"linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 55%)", pointerEvents:"none" }} />

      {/* Accent top stripe */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg, ${a.color}, transparent)`, borderRadius:"16px 16px 0 0" }} />

      {/* Icon */}
      <div style={{ width:40, height:40, borderRadius:11, background:a.bg, border:`1px solid ${a.border}`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
        <Icon size={17} color={a.color} strokeWidth={2} />
      </div>

      {/* Value */}
      <div style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: 28, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.5px",
        color: a.color, marginBottom: 6,
      }}>
        {isLoading
          ? <div className="shimmer" style={{ width:100, height:28, borderRadius:6 }} />
          : isCurrency
            ? <AnimatedNumber value={value} />
            : <CountUp value={value} />}
      </div>

      {/* Label */}
      <div style={{ fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.9px", color:"#a8937a" }}>
        {label}
      </div>

      {/* Change badge */}
      {change && (
        <div style={{ marginTop:8, fontSize:11, color: change.startsWith("+") ? "#6b7c45" : "#c0552a", fontWeight:600 }}>
          {change} vs last month
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<"daily"|"weekly"|"monthly"|"yearly">("monthly");
  const { data:summary, isLoading:summaryLoading } = useDashboardSummary();
  const { data:charts,  isLoading:chartsLoading  } = useDashboardCharts(period);
  const router = useRouter();

  const hasPendingCredits = (summary?.pendingCredits   || 0) > 0;
  const hasOverdueCredits = (summary?.overdueCredits   || 0) > 0;
  const hasLowStock       = (summary?.lowStockProducts || 0) > 0;

  const today = new Date().toLocaleDateString("en-IN",{ weekday:"long", day:"numeric", month:"long", year:"numeric" });

  return (
    <div className="page-content">

      {/* ── Alerts ──────────────────────────────────────── */}
      {(hasPendingCredits||hasOverdueCredits) && !summaryLoading && (
        <div className={`alert-banner anim-fade-in ${hasOverdueCredits?"alert-banner-coral":"alert-banner-amber"}`}>
          <AlertCircle size={15} style={{ flexShrink:0 }} />
          <div>
            <strong>
              {hasOverdueCredits
                ? `${summary?.overdueCredits} overdue credit${(summary?.overdueCredits||0)>1?"s":""} — needs attention`
                : `${formatCurrency(summary?.pendingCredits||0)} credit pending collection`}
            </strong>
          </div>
          <button onClick={() => router.push("/credit")} className="btn-glass"
            style={{ marginLeft:"auto", padding:"5px 12px", fontSize:12, display:"flex", alignItems:"center", gap:4, borderColor:"rgba(196,122,58,0.4)" }}>
            View Credits <ArrowRight size={12} />
          </button>
        </div>
      )}
      {hasLowStock && !summaryLoading && (
        <div className="alert-banner alert-banner-amber">
          <AlertTriangle size={15} style={{ flexShrink:0 }} />
          <span><strong>{summary?.lowStockProducts}</strong> products below minimum stock level</span>
          <button onClick={() => router.push("/inventory")} className="btn-glass"
            style={{ marginLeft:"auto", padding:"5px 12px", fontSize:12, display:"flex", alignItems:"center", gap:4, borderColor:"rgba(196,122,58,0.4)" }}>
            View Inventory <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* ── Hero panel ──────────────────────────────────── */}
      <div className="anim-fade-up dash-hero" style={{
        background: "linear-gradient(135deg, rgba(250,247,242,0.95) 0%, rgba(245,238,225,0.90) 100%)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(180,155,110,0.30)",
        borderRadius: 22,
        boxShadow: "0 8px 40px rgba(100,80,40,0.12), inset 0 1px 0 rgba(255,255,255,0.8)",
        padding: "32px 36px",
        marginBottom: 20,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Warm watercolour wash top-right */}
        <div style={{ position:"absolute", top:-60, right:-60, width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle, rgba(196,122,58,0.10), transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-40, left:200, width:200, height:200, borderRadius:"50%", background:"radial-gradient(circle, rgba(107,124,69,0.08), transparent 70%)", pointerEvents:"none" }} />

        {/* Top accent line */}
        <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:"linear-gradient(90deg, #6b7c45, #c47a3a, #b8956a, transparent)", borderRadius:"22px 22px 0 0" }} />

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:24, position:"relative" }}>
          {/* Big today number */}
          <div>
            <div style={{ fontSize:11, color:"#a8937a", textTransform:"uppercase", letterSpacing:"1px", fontWeight:600, marginBottom:4 }}>
              {today}
            </div>
            <div style={{ fontSize:11, color:"#a8937a", textTransform:"uppercase", letterSpacing:"1px", fontWeight:600, marginBottom:10 }}>
              Today's Sales
            </div>
            {summaryLoading
              ? <div className="shimmer" style={{ width:240, height:56, borderRadius:10 }} />
              : <div style={{ fontFamily:"Georgia,'Times New Roman',serif", fontSize:52, fontWeight:700, lineHeight:1, letterSpacing:"-2px", color:"#2c2418" }}>
                  <AnimatedNumber value={summary?.todaySales||0} duration={1400} />
                </div>}
            <div style={{ display:"flex", gap:28, marginTop:18, flexWrap:"wrap" }}>
              {[
                { label:"Weekly Sales",  value:summary?.weeklySales  ||0 },
                { label:"Yearly Sales",  value:summary?.yearlySales  ||0 },
                { label:"Total Revenue", value:summary?.totalRevenue ||0 },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ fontSize:10, color:"#a8937a", textTransform:"uppercase", letterSpacing:"0.8px", fontWeight:600, marginBottom:3 }}>{s.label}</div>
                  {summaryLoading
                    ? <div className="shimmer" style={{ width:80, height:18, borderRadius:4 }} />
                    : <div style={{ fontFamily:"Georgia,serif", fontSize:18, fontWeight:700, color:"#6b5d4a", letterSpacing:"-0.5px" }}>
                        {formatCurrency(s.value)}
                      </div>}
                </div>
              ))}
            </div>
          </div>

          {/* This month — right side hero */}
          <div className="dash-hero-right" style={{ textAlign:"right" }}>
            <div style={{ fontSize:11, color:"#a8937a", textTransform:"uppercase", letterSpacing:"1px", fontWeight:600, marginBottom:8 }}>This Month</div>
            {summaryLoading
              ? <div className="shimmer" style={{ width:160, height:40, borderRadius:8, marginLeft:"auto" }} />
              : <div style={{ fontFamily:"Georgia,serif", fontSize:38, fontWeight:700, letterSpacing:"-1.5px", color:"#c47a3a" }}>
                  <AnimatedNumber value={summary?.monthlySales||0} duration={1200} />
                </div>}
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:10, color:"#a8937a", textTransform:"uppercase", letterSpacing:"0.8px", fontWeight:600, marginBottom:3 }}>Total Profit</div>
              {summaryLoading
                ? <div className="shimmer" style={{ width:100, height:16, borderRadius:4, marginLeft:"auto" }} />
                : <div style={{ fontFamily:"Georgia,serif", fontSize:18, fontWeight:700, color:"#6b7c45" }}>
                    {formatCurrency(summary?.totalProfit||0)}
                  </div>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Performance Overview header ─────────────────── */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:15, fontWeight:700, color:"#2c2418", letterSpacing:"-0.3px" }}>Performance Overview</div>
        <div style={{ fontSize:12, color:"#a8937a", marginTop:2 }}>Key metrics across your business</div>
      </div>

      {/* ── Metric cards ────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14, marginBottom:22 }}>
        <MetricCard label="Total Revenue"   value={summary?.totalRevenue    ||0} icon={IndianRupee}   accent="olive"  delay={0}   isLoading={summaryLoading} />
        <MetricCard label="Total Profit"    value={summary?.totalProfit     ||0} icon={TrendingUp}    accent="copper" delay={60}  isLoading={summaryLoading} />
        <MetricCard label="Pending Credits" value={summary?.pendingCredits  ||0} icon={Wallet}        accent="sage"   delay={120} isLoading={summaryLoading} />
        <MetricCard label="Overdue Credits" value={summary?.overdueCredits  ||0} icon={AlertCircle}   accent="rust"   delay={180} isLoading={summaryLoading} isCurrency={false} />
        <MetricCard label="Total Expenses"  value={(summary as any)?.totalExpenses   ||0} icon={ShoppingCart}  accent="copper" delay={240} isLoading={summaryLoading} />
        <MetricCard label="Total Purchases" value={(summary as any)?.totalPurchases  ||0} icon={ShoppingCart}  accent="olive"  delay={300} isLoading={summaryLoading} />
        <MetricCard label="Total Customers" value={summary?.totalCustomers  ||0} icon={Users}         accent="sage"   delay={360} isLoading={summaryLoading} isCurrency={false} />
        <MetricCard label="Low Stock Items" value={summary?.lowStockProducts||0} icon={AlertTriangle} accent="rust"   delay={420} isLoading={summaryLoading} isCurrency={false} />
      </div>

      {/* ── Period selector (above the charts it controls) ── */}
      <div style={{ display:"inline-flex", gap:3, background:"rgba(250,247,242,0.9)", border:"1px solid rgba(180,155,110,0.25)", borderRadius:10, padding:3, marginBottom:14 }}>
        {PERIODS.map((p) => (
          <button key={p.key} onClick={() => setPeriod(p.key)} style={{
            padding:"6px 16px", fontSize:12, fontWeight:700, borderRadius:8, cursor:"pointer",
            border: period===p.key ? "1px solid rgba(107,124,69,0.4)" : "1px solid transparent",
            background: period===p.key ? "linear-gradient(135deg, #6b7c45, #8fa05a)" : "transparent",
            color: period===p.key ? "#fff" : "#6b5d4a",
            transition: "all 0.2s",
            boxShadow: period===p.key ? "0 2px 10px rgba(107,124,69,0.30)" : "none",
          }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Charts row ──────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:16, marginBottom:16 }}>

        {/* Revenue trend */}
        <div style={{
          background:"rgba(250,247,242,0.88)", backdropFilter:"blur(16px)",
          border:"1px solid rgba(180,155,110,0.22)", borderRadius:18,
          boxShadow:"0 4px 20px rgba(100,80,40,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
          padding:24,
        }} className="anim-fade-up-3">
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:15, color:"#2c2418", letterSpacing:"-0.3px" }}>Revenue Trend</div>
              <div style={{ fontSize:12, color:"#a8937a", marginTop:2 }}>Sales performance over time</div>
            </div>
          </div>
          <div style={{ height:220 }}>
            {chartsLoading
              ? <div className="shimmer" style={{ height:"100%", borderRadius:8 }} />
              : !charts?.revenueTrend?.length
                ? <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:8 }}>
                    <div style={{ width:40, height:40, borderRadius:12, background:"rgba(180,155,110,0.10)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <TrendingUp size={18} style={{ color:"#c0a882" }} />
                    </div>
                    <span style={{ fontSize:12, color:"#a8937a" }}>Start billing to see insights here</span>
                  </div>
                : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={charts.revenueTrend} margin={{ top:5, right:5, bottom:0, left:0 }}>
                      <defs>
                        <linearGradient id="oliveGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6b7c45" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#6b7c45" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(180,155,110,0.15)" vertical={false} />
                      <XAxis dataKey="bucket"
                        tickFormatter={(v) => {
                          const d = new Date(v);
                          if (period==="yearly")  return d.toLocaleDateString("en-IN",{month:"short"});
                          if (period==="monthly") return d.toLocaleDateString("en-IN",{month:"short",day:"numeric"});
                          return d.toLocaleDateString("en-IN",{weekday:"short"});
                        }}
                        fontSize={11} tickLine={false} axisLine={false} tick={{ fill:"#c0a882" }} />
                      <YAxis fontSize={11} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`}
                        tickLine={false} axisLine={false} tick={{ fill:"#c0a882" }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="total" stroke="#6b7c45" strokeWidth={2.5}
                        fill="url(#oliveGrad)" dot={false} activeDot={{ r:5, fill:"#6b7c45", strokeWidth:0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
          </div>
        </div>

        {/* Category pie */}
        <div style={{
          background:"rgba(250,247,242,0.88)", backdropFilter:"blur(16px)",
          border:"1px solid rgba(180,155,110,0.22)", borderRadius:18,
          boxShadow:"0 4px 20px rgba(100,80,40,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
          padding:24,
        }} className="anim-fade-up-4">
          <div style={{ fontWeight:700, fontSize:15, color:"#2c2418", marginBottom:4, letterSpacing:"-0.3px" }}>By Category</div>
          <div style={{ fontSize:12, color:"#a8937a", marginBottom:16 }}>Sales share breakdown</div>
          <div style={{ height:200 }}>
            {chartsLoading
              ? <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%" }}>
                  <div className="shimmer" style={{ width:140, height:140, borderRadius:"50%" }} />
                </div>
              : !charts?.categoryPerformance?.length
                ? <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:8 }}>
                    <div style={{ width:40, height:40, borderRadius:12, background:"rgba(180,155,110,0.10)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <TrendingUp size={18} style={{ color:"#c0a882" }} />
                    </div>
                    <span style={{ fontSize:12, color:"#a8937a" }}>Start billing to see insights here</span>
                  </div>
                : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={charts.categoryPerformance} dataKey="total" nameKey="category"
                        cx="50%" cy="45%" outerRadius={72} innerRadius={40} paddingAngle={3}>
                        {charts.categoryPerformance.map((_:any, i:number) => (
                          <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} strokeWidth={0} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v:number) => formatCurrency(v)}
                        contentStyle={{ background:"rgba(250,247,242,0.98)", border:"1px solid rgba(180,155,110,0.3)", borderRadius:8, fontSize:12, color:"#2c2418" }} />
                      <Legend iconType="circle" iconSize={7}
                        wrapperStyle={{ fontSize:"11px", paddingTop:"8px", color:"#6b5d4a" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
          </div>
        </div>
      </div>

      {/* ── Top products ────────────────────────────────── */}
      <div style={{
        background:"rgba(250,247,242,0.88)", backdropFilter:"blur(16px)",
        border:"1px solid rgba(180,155,110,0.22)", borderRadius:18,
        boxShadow:"0 4px 20px rgba(100,80,40,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
        padding:24,
      }} className="anim-fade-up-5">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:"#2c2418", letterSpacing:"-0.3px" }}>Top Products</div>
            <div style={{ fontSize:12, color:"#a8937a", marginTop:2 }}>Best performers by revenue</div>
          </div>
          <ShoppingCart size={15} style={{ color:"#c0a882" }} />
        </div>
        <div style={{ height:260 }}>
          {chartsLoading
            ? <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[90,75,60,80,50,70,65,55,45,40].map((w,i) => (
                  <div key={i} className="shimmer" style={{ height:11, width:`${w}%`, borderRadius:6 }} />
                ))}
              </div>
            : !charts?.productPerformance?.length
              ? <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:8 }}>
                    <div style={{ width:40, height:40, borderRadius:12, background:"rgba(180,155,110,0.10)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <ShoppingCart size={18} style={{ color:"#c0a882" }} />
                    </div>
                    <span style={{ fontSize:12, color:"#a8937a" }}>Start billing to see top products</span>
                  </div>
              : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.productPerformance} layout="vertical" margin={{ left:8, right:16, top:4, bottom:4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(180,155,110,0.12)" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`}
                      fontSize={11} tickLine={false} axisLine={false} tick={{ fill:"#c0a882" }} />
                    <YAxis type="category" dataKey="name" width={160} fontSize={11}
                      tickLine={false} axisLine={false} tick={{ fill:"#6b5d4a" }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="total" radius={[0,6,6,0]} maxBarSize={16}>
                      {charts.productPerformance.map((_:any, i:number) => (
                        <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
        </div>
      </div>
    </div>
  );
}
