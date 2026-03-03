"use client";

import { useState, useMemo, useRef } from "react";

/* ─────────────────────────────────────────────
   型定義
───────────────────────────────────────────── */
interface Transaction {
  id: string;
  date: string;
  debit_account: string;
  credit_account: string;
  amount: number;
  description: string;
  is_settled: boolean;
}

type FormState = Omit<Transaction, "id" | "amount"> & { amount: string };

/* ─────────────────────────────────────────────
   定数
───────────────────────────────────────────── */
const ACCENT   = "#4F6EF7";
const ACCENT_L = "#EEF1FE";
const ACCENT_D = "#3554D1";

const ACCOUNTS: Record<string, string[]> = {
  費用: ["食費","交通費","消耗品費","水道光熱費","通信費","広告宣伝費","外注費","地代家賃","接待交際費","雑費"],
  資産: ["現金","普通預金","当座預金","売掛金","前払費用"],
  負債: ["クレジットカード","未払金","借入金","預り金"],
  収益: ["売上高","雑収入","受取利息"],
};

const EXPENSE_ACCTS = new Set(ACCOUNTS["費用"]);
const INCOME_ACCTS  = new Set(ACCOUNTS["収益"]);

const SEED: Transaction[] = [
  { id:"s1",  date:"2026-03-01", debit_account:"食費",       credit_account:"現金",             amount:3200,  description:"スーパー購入",     is_settled:true  },
  { id:"s2",  date:"2026-03-03", debit_account:"交通費",     credit_account:"クレジットカード", amount:1540,  description:"新幹線 東京→水戸", is_settled:false },
  { id:"s3",  date:"2026-03-05", debit_account:"消耗品費",   credit_account:"クレジットカード", amount:4800,  description:"文具・コピー用紙", is_settled:false },
  { id:"s4",  date:"2026-03-08", debit_account:"通信費",     credit_account:"普通預金",         amount:6500,  description:"携帯電話料金",     is_settled:true  },
  { id:"s5",  date:"2026-03-10", debit_account:"広告宣伝費", credit_account:"クレジットカード", amount:12000, description:"SNS広告費",        is_settled:false },
  { id:"s6",  date:"2026-03-12", debit_account:"食費",       credit_account:"現金",             amount:890,   description:"コンビニ昼食",     is_settled:true  },
  { id:"s7",  date:"2026-03-15", debit_account:"地代家賃",   credit_account:"普通預金",         amount:80000, description:"3月分家賃",        is_settled:true  },
  { id:"s8",  date:"2026-03-18", debit_account:"外注費",     credit_account:"未払金",           amount:35000, description:"デザイン外注",     is_settled:false },
  { id:"s9",  date:"2026-03-20", debit_account:"接待交際費", credit_account:"クレジットカード", amount:8400,  description:"クライアント会食", is_settled:false },
  { id:"s10", date:"2026-03-22", debit_account:"水道光熱費", credit_account:"普通預金",         amount:7200,  description:"電気・ガス代",     is_settled:true  },
];

const PIE_COLORS = ["#4F6EF7","#34C8A0","#F5A623","#E85D75","#A78BFA","#60A5FA","#FB923C","#4ADE80","#F472B6","#94A3B8"];
const DOW_LABELS  = ["日","月","火","水","木","金","土"];
const MONTH_NAMES = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

/* ─────────────────────────────────────────────
   ユーティリティ
───────────────────────────────────────────── */
const uid    = () => Math.random().toString(36).slice(2, 10);
const pad2   = (n: number) => String(n).padStart(2, "0");
const fmt    = (n: number) => Number(n).toLocaleString("ja-JP");
const todayISO = () => new Date().toISOString().split("T")[0];

function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }
function firstDow(y: number, m: number)    { return new Date(y, m - 1, 1).getDay(); }

/* ─────────────────────────────────────────────
   PieChart
───────────────────────────────────────────── */
function PieChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total   = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return <p style={{ textAlign:"center", color:"#94a3b8", fontSize:13, padding:"32px 0" }}>データなし</p>;

  let cum = -Math.PI / 2;
  const R = 72, CX = 80, CY = 80;
  const slices = entries.map(([name, val], i) => {
    const a  = (val / total) * 2 * Math.PI;
    const x1 = CX + R * Math.cos(cum);
    const y1 = CY + R * Math.sin(cum);
    cum += a;
    const x2 = CX + R * Math.cos(cum);
    const y2 = CY + R * Math.sin(cum);
    return { name, val, ratio: val / total, x1, y1, x2, y2, large: a > Math.PI ? 1 : 0, color: PIE_COLORS[i % PIE_COLORS.length] };
  });

  return (
    <div style={{ display:"flex", gap:20, alignItems:"center", flexWrap:"wrap" }}>
      <svg width={160} height={160} style={{ flexShrink:0 }}>
        {slices.map((s, i) => (
          <path key={i}
            d={`M${CX},${CY} L${s.x1},${s.y1} A${R},${R} 0 ${s.large},1 ${s.x2},${s.y2}Z`}
            fill={s.color} stroke="#fff" strokeWidth={2} />
        ))}
        <circle cx={CX} cy={CY} r={36} fill="#fff" />
        <text x={CX} y={CY - 6}  textAnchor="middle" fill="#374151" fontSize={9}  fontFamily="DM Mono,monospace">合計</text>
        <text x={CX} y={CY + 10} textAnchor="middle" fill="#111827" fontSize={11} fontFamily="DM Mono,monospace" fontWeight="700">{fmt(total)}</text>
      </svg>
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:7, fontSize:12 }}>
            <span style={{ width:9, height:9, borderRadius:2, background:s.color, flexShrink:0, display:"inline-block" }} />
            <span style={{ color:"#374151", flex:1 }}>{s.name}</span>
            <span style={{ fontFamily:"DM Mono,monospace", color:"#111827", fontWeight:600 }}>¥{fmt(s.val)}</span>
            <span style={{ fontFamily:"DM Mono,monospace", color:"#9ca3af", width:36, textAlign:"right" }}>{(s.ratio * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Toast
───────────────────────────────────────────── */
function Toast({ msg, type }: { msg: string; type: string }) {
  return (
    <div style={{
      position:"fixed", top:24, right:24, zIndex:9999,
      background: type === "error" ? "#FEF2F2" : "#F0FDF4",
      border: `1.5px solid ${type === "error" ? "#FCA5A5" : "#86EFAC"}`,
      color: type === "error" ? "#991B1B" : "#166534",
      borderRadius:12, padding:"11px 20px", fontSize:13, fontWeight:600,
      boxShadow:"0 8px 32px rgba(0,0,0,0.10)",
      animation:"slideIn .2s ease",
    }}>
      {type === "error" ? "✕  " : "✓  "}{msg}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Style constants
───────────────────────────────────────────── */
const card:   React.CSSProperties = { background:"#fff", borderRadius:16, padding:24, boxShadow:"0 2px 12px rgba(0,0,0,0.07)", border:"1px solid #E5E7EB" };
const navBtn: React.CSSProperties = { padding:"6px 12px", borderRadius:8, border:"1.5px solid #E5E7EB", background:"#fff", color:"#374151", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit" };
const inp:    React.CSSProperties = { width:"100%", background:"#fff", border:"1.5px solid #E5E7EB", borderRadius:9, padding:"9px 12px", color:"#111827", fontSize:13, fontFamily:"inherit" };
const lbl:    React.CSSProperties = { fontSize:11, color:"#9CA3AF", letterSpacing:".06em", marginBottom:5, display:"block", fontWeight:600 };
const fg:     React.CSSProperties = { display:"flex", flexDirection:"column" };
const smBtn:  React.CSSProperties = { padding:"4px 10px", borderRadius:7, border:"1.5px solid #E5E7EB", background:"#F8F9FC", color:"#374151", cursor:"pointer", fontSize:11, fontWeight:600, fontFamily:"inherit" };

/* ─────────────────────────────────────────────
   Main App
───────────────────────────────────────────── */
export default function KakeiboApp() {
  const [txns,        setTxns]        = useState<Transaction[]>(SEED);
  const [tab,         setTab]         = useState<"calendar"|"list"|"dashboard">("calendar");
  const [calYear,     setCalYear]     = useState(2026);
  const [calMonth,    setCalMonth]    = useState(3);
  const [selectedDate,setSelectedDate]= useState("2026-03-01");
  const [toast,       setToast]       = useState<{ msg: string; type: string } | null>(null);
  const [editId,      setEditId]      = useState<string | null>(null);
  const [filterAcct,  setFilterAcct]  = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<FormState>({
    date:"2026-03-01", debit_account:"食費", credit_account:"現金",
    amount:"", description:"", is_settled:false,
  });

  /* helpers */
  const showToast = (msg: string, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const selectDate = (ds: string) => {
    setSelectedDate(ds);
    setForm(p => ({ ...p, date: ds }));
    formRef.current?.scrollIntoView({ behavior:"smooth", block:"nearest" });
  };

  const prevMonth = () => { if (calMonth === 1) { setCalYear(y => y-1); setCalMonth(12); } else setCalMonth(m => m-1); };
  const nextMonth = () => { if (calMonth === 12) { setCalYear(y => y+1); setCalMonth(1); } else setCalMonth(m => m+1); };

  /* ── data derivations ── */
  const calMonthStr = `${calYear}-${pad2(calMonth)}`;

  const calTxns = useMemo(() =>
    txns.filter(t => t.date.startsWith(calMonthStr)),
    [txns, calMonthStr]
  );

  const dayMap = useMemo(() => {
    const m: Record<string, Transaction[]> = {};
    calTxns.forEach(t => { if (!m[t.date]) m[t.date] = []; m[t.date].push(t); });
    return m;
  }, [calTxns]);

  const maxDayExp = useMemo(() => {
    const vals = Object.values(dayMap).map(ts =>
      ts.filter(t => EXPENSE_ACCTS.has(t.debit_account)).reduce((s,t) => s+t.amount, 0)
    );
    return Math.max(...vals, 1);
  }, [dayMap]);

  const calGrid = useMemo(() => {
    const fd = firstDow(calYear, calMonth);
    const days = daysInMonth(calYear, calMonth);
    const cells: (number|null)[] = [];
    for (let i = 0; i < fd; i++) cells.push(null);
    for (let d = 1; d <= days; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calYear, calMonth]);

  const dash = useMemo(() => {
    const mt = txns.filter(t => t.date.startsWith(calMonthStr));
    const exp = mt.filter(t => EXPENSE_ACCTS.has(t.debit_account)).reduce((s,t) => s+t.amount, 0);
    const inc = mt.filter(t => INCOME_ACCTS.has(t.debit_account)).reduce((s,t) => s+t.amount, 0);
    const byAcct: Record<string, number> = {};
    mt.filter(t => EXPENSE_ACCTS.has(t.debit_account)).forEach(t => {
      byAcct[t.debit_account] = (byAcct[t.debit_account] || 0) + t.amount;
    });
    const unsettled = txns.filter(t => !t.is_settled).reduce((s,t) => s+t.amount, 0);
    return { exp, inc, byAcct, unsettled };
  }, [txns, calMonthStr]);

  const filtered = useMemo(() =>
    txns.filter(t => {
      const mOk = t.date.startsWith(calMonthStr);
      const aOk = filterAcct ? t.debit_account === filterAcct || t.credit_account === filterAcct : true;
      return mOk && aOk;
    }),
    [txns, calMonthStr, filterAcct]
  );

  /* ── CRUD ── */
  const handleSubmit = () => {
    if (!form.amount || !form.date) return showToast("日付と金額は必須です", "error");
    if (editId) {
      setTxns(p => p.map(t => t.id === editId ? { ...form, id: editId, amount: +form.amount } : t));
      setEditId(null); showToast("取引を更新しました");
    } else {
      setTxns(p => [...p, { ...form, id: uid(), amount: +form.amount }]);
      showToast("取引を登録しました");
    }
    setForm({ date: selectedDate, debit_account:"食費", credit_account:"現金", amount:"", description:"", is_settled:false });
  };

  const handleEdit = (t: Transaction) => {
    setForm({ ...t, amount: String(t.amount) });
    setEditId(t.id);
    setTab("calendar");
  };

  const handleDelete  = (id: string) => { setTxns(p => p.filter(t => t.id !== id)); showToast("削除しました", "error"); };
  const handleSettle  = (id: string) => { setTxns(p => p.map(t => t.id === id ? { ...t, is_settled:true } : t)); showToast("決済済みにしました"); };

  const downloadCSV = () => {
    const hdr  = ["日付","借方","貸方","金額","摘要","決済"];
    const rows = filtered.map(t => [t.date, t.debit_account, t.credit_account, t.amount, t.description, t.is_settled?"済":"未"]);
    const csv  = [hdr, ...rows].map(r => r.join(",")).join("\n");
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type:"text/csv;charset=utf-8" }));
    a.download = `kakeibo_${calMonthStr}.csv`;
    a.click();
    showToast("CSVをダウンロードしました");
  };

  const todayStr = todayISO();

  const NAV = [
    { id:"calendar"  as const, icon:"▦", label:"カレンダー" },
    { id:"list"      as const, icon:"≡", label:"取引一覧"   },
    { id:"dashboard" as const, icon:"◈", label:"分析"       },
  ];

  /* ────────────────────────────────────────────── */
  return (
    <div style={{ fontFamily:"'Zen Kaku Gothic New','Hiragino Kaku Gothic ProN',sans-serif", background:"#F8F9FC", minHeight:"100vh", color:"#111827" }}>

      {toast && <Toast {...toast} />}

      {/* ── Header ── */}
      <header style={{
        background:"#fff", borderBottom:"1px solid #E5E7EB",
        padding:"0 28px", height:56,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        position:"sticky", top:0, zIndex:200,
        boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ width:28, height:28, background:ACCENT, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:14, fontWeight:700 }}>帳</span>
          <span style={{ fontWeight:700, fontSize:16, color:"#111827", letterSpacing:".03em" }}>複式家計簿</span>
          <span style={{ fontSize:10, background:ACCENT_L, color:ACCENT, padding:"2px 8px", borderRadius:20, fontWeight:700, letterSpacing:".06em", marginLeft:2 }}>DOUBLE ENTRY</span>
        </div>
        <nav style={{ display:"flex", gap:2 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)} style={{
              padding:"6px 16px", borderRadius:8, border:"none", cursor:"pointer",
              background: tab === n.id ? ACCENT_L : "transparent",
              color:      tab === n.id ? ACCENT   : "#6B7280",
              fontWeight: tab === n.id ? 700 : 500,
              fontSize:13, fontFamily:"inherit",
            }}>{n.icon} {n.label}</button>
          ))}
        </nav>
        <div style={{ fontSize:12, color:"#9CA3AF", fontFamily:"DM Mono,monospace" }}>
          {new Date().toLocaleDateString("ja-JP", { year:"numeric", month:"long", day:"numeric" })}
        </div>
      </header>

      <div style={{ maxWidth:1280, margin:"0 auto", padding:"28px 24px" }}>

        {/* ════════ カレンダー + フォーム ════════ */}
        {tab === "calendar" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:24, alignItems:"start" }}>

            {/* Calendar panel */}
            <div style={card}>
              {/* calendar header */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                <h2 style={{ fontSize:20, fontWeight:700, color:"#111827", margin:0 }}>
                  {calYear}年 <span style={{ color:ACCENT }}>{MONTH_NAMES[calMonth - 1]}</span>
                </h2>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={prevMonth} style={navBtn}>‹</button>
                  <button onClick={() => { setCalYear(new Date().getFullYear()); setCalMonth(new Date().getMonth() + 1); }} style={{ ...navBtn, fontSize:11, padding:"5px 10px" }}>今月</button>
                  <button onClick={nextMonth} style={navBtn}>›</button>
                </div>
              </div>

              {/* monthly summary */}
              <div style={{ display:"flex", gap:12, marginBottom:18, background:"#F8F9FC", borderRadius:10, padding:"10px 14px" }}>
                {[
                  { label:"支出",   val: calTxns.filter(t=>EXPENSE_ACCTS.has(t.debit_account)).reduce((s,t)=>s+t.amount,0), color:"#374151", isTxt:false },
                  { label:"未決済", val: calTxns.filter(t=>!t.is_settled).reduce((s,t)=>s+t.amount,0),                       color:"#D97706", isTxt:false },
                  { label:"件数",   val: calTxns.length,                                                                      color:ACCENT,    isTxt:true  },
                ].map(item => (
                  <div key={item.label} style={{ flex:1, textAlign:"center" }}>
                    <div style={{ fontSize:10, color:"#9CA3AF", letterSpacing:".06em", marginBottom:2 }}>{item.label}</div>
                    <div style={{ fontFamily:"DM Mono,monospace", fontWeight:700, fontSize:14, color:item.color }}>
                      {item.isTxt ? `${item.val}件` : `¥${fmt(item.val as number)}`}
                    </div>
                  </div>
                ))}
              </div>

              {/* DOW header */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:4 }}>
                {DOW_LABELS.map((d, i) => (
                  <div key={d} style={{ textAlign:"center", padding:"6px 0", fontSize:11, fontWeight:700, color:i===0?"#EF4444":i===6?"#3B82F6":"#9CA3AF", letterSpacing:".06em" }}>{d}</div>
                ))}
              </div>

              {/* Grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
                {calGrid.map((day, idx) => {
                  if (!day) return <div key={idx} />;
                  const ds  = `${calYear}-${pad2(calMonth)}-${pad2(day)}`;
                  const dts = dayMap[ds] || [];
                  const expSum      = dts.filter(t => EXPENSE_ACCTS.has(t.debit_account)).reduce((s,t) => s+t.amount, 0);
                  const incSum      = dts.filter(t => INCOME_ACCTS.has(t.debit_account)).reduce((s,t) => s+t.amount, 0);
                  const hasUnsettled = dts.some(t => !t.is_settled);
                  const isToday     = ds === todayStr;
                  const isSelected  = ds === selectedDate;
                  const dow         = idx % 7;

                  const baseBg = isSelected ? ACCENT
                    : isToday   ? ACCENT_L
                    : dow === 0 ? "#FFF5F5"
                    : dow === 6 ? "#EFF6FF"
                    : "#fff";

                  return (
                    <div
                      key={idx}
                      onClick={() => selectDate(ds)}
                      onMouseEnter={e => {
                        if (!isSelected) (e.currentTarget as HTMLDivElement).style.background =
                          isToday ? ACCENT_L : dow===0 ? "#FFF0F0" : dow===6 ? "#E8F2FF" : "#F3F4F6";
                      }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = baseBg; }}
                      style={{
                        borderRadius:10, padding:"7px 6px 8px", cursor:"pointer",
                        minHeight:68, position:"relative", background:baseBg,
                        border:`2px solid ${isSelected ? ACCENT : isToday ? ACCENT+"55" : "transparent"}`,
                        boxShadow: isSelected ? `0 4px 16px ${ACCENT}33` : dts.length > 0 ? "0 1px 6px rgba(0,0,0,0.07)" : "none",
                        transition:"all .15s",
                      }}
                    >
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3 }}>
                        <span style={{
                          fontSize:12, fontWeight:isToday ? 700 : 500,
                          color: isSelected ? "#fff" : isToday ? ACCENT : dow===0 ? "#EF4444" : dow===6 ? "#3B82F6" : "#374151",
                        }}>{day}</span>
                        {hasUnsettled && !isSelected && <span style={{ fontSize:9, color:"#F59E0B", lineHeight:1 }}>●</span>}
                        {dts.length > 0 && isSelected && <span style={{ fontSize:9, color:"rgba(255,255,255,.7)" }}>{dts.length}</span>}
                      </div>
                      {expSum > 0 && (
                        <div style={{ fontSize:9.5, fontFamily:"DM Mono,monospace", fontWeight:600, color:isSelected?"#fff":hasUnsettled?"#B45309":"#374151", lineHeight:1.3, marginBottom:2 }}>
                          {hasUnsettled ? "~" : ""}¥{fmt(expSum)}
                        </div>
                      )}
                      {incSum > 0 && (
                        <div style={{ fontSize:9, fontFamily:"DM Mono,monospace", fontWeight:600, color:isSelected?"#cffafe":"#059669", lineHeight:1.2 }}>
                          +¥{fmt(incSum)}
                        </div>
                      )}
                      {expSum > 0 && (
                        <div style={{
                          position:"absolute", bottom:4, left:4, right:4, height:2, borderRadius:2,
                          background: isSelected ? "rgba(255,255,255,.5)" : hasUnsettled ? "#FCD34D" : ACCENT+"88",
                          width:`${Math.min(100, (expSum / maxDayExp) * 100).toFixed(0)}%`,
                          transition:"width .3s",
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={{ display:"flex", gap:14, marginTop:16, fontSize:10, color:"#9CA3AF", flexWrap:"wrap" }}>
                {[
                  { c:ACCENT,    l:"選択日" },
                  { c:"#F59E0B", l:"● 未決済あり" },
                  { c:"#EF4444", l:"日曜" },
                  { c:"#3B82F6", l:"土曜" },
                ].map(x => (
                  <span key={x.l} style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <span style={{ width:8, height:8, borderRadius:2, background:x.c, display:"inline-block" }} />
                    {x.l}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: form + day detail */}
            <div style={{ display:"flex", flexDirection:"column", gap:16 }} ref={formRef}>

              {/* Selected date header */}
              <div style={{ ...card, padding:"16px 20px", background:ACCENT, color:"#fff" }}>
                <div style={{ fontSize:11, opacity:.8, letterSpacing:".06em", marginBottom:2 }}>選択中の日付</div>
                <div style={{ fontSize:22, fontWeight:700, fontFamily:"DM Mono,monospace" }}>{selectedDate}</div>
                <div style={{ fontSize:11, opacity:.7, marginTop:2 }}>
                  {DOW_LABELS[new Date(selectedDate + "T00:00:00").getDay()]}曜日 · {(dayMap[selectedDate] || []).length}件の取引
                </div>
              </div>

              {/* Form card */}
              <div style={card}>
                <h3 style={{ fontSize:14, fontWeight:700, color:"#374151", marginBottom:16, paddingBottom:12, borderBottom:"1px solid #F3F4F6" }}>
                  {editId ? "✏ 取引を編集" : "＋ 取引を入力"}
                </h3>

                {/* double-entry preview */}
                <div style={{ background:"#F8F9FC", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:12 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div>
                      <div style={{ fontSize:9, color:"#9CA3AF", letterSpacing:".08em", marginBottom:2 }}>借方 DEBIT</div>
                      <div style={{ fontWeight:700, color:ACCENT }}>{form.debit_account}</div>
                    </div>
                    <div style={{ color:"#D1D5DB", fontSize:16 }}>→</div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:9, color:"#9CA3AF", letterSpacing:".08em", marginBottom:2 }}>貸方 CREDIT</div>
                      <div style={{ fontWeight:700, color:"#6B7280" }}>{form.credit_account}</div>
                    </div>
                    <div style={{ borderLeft:"1px solid #E5E7EB", paddingLeft:12, textAlign:"right" }}>
                      <div style={{ fontSize:9, color:"#9CA3AF", marginBottom:2 }}>金額</div>
                      <div style={{ fontFamily:"DM Mono,monospace", fontWeight:700, color:"#111827", fontSize:13 }}>
                        ¥{form.amount ? fmt(+form.amount) : "---"}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
                  <div style={fg}>
                    <label style={lbl}>日付</label>
                    <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date:e.target.value }))} style={inp} />
                  </div>
                  <div style={fg}>
                    <label style={lbl}>金額</label>
                    <input type="number" placeholder="0" value={form.amount} onChange={e => setForm(p => ({ ...p, amount:e.target.value }))} style={{ ...inp, fontFamily:"DM Mono,monospace", fontSize:15, fontWeight:700 }} />
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    <div style={fg}>
                      <label style={{ ...lbl, color:ACCENT }}>借方科目</label>
                      <select value={form.debit_account} onChange={e => setForm(p => ({ ...p, debit_account:e.target.value }))} style={{ ...inp, borderColor:ACCENT+"55" }}>
                        {Object.entries(ACCOUNTS).map(([cat, items]) => (
                          <optgroup key={cat} label={cat}>
                            {items.map(a => <option key={a}>{a}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div style={fg}>
                      <label style={lbl}>貸方科目</label>
                      <select value={form.credit_account} onChange={e => setForm(p => ({ ...p, credit_account:e.target.value }))} style={inp}>
                        {Object.entries(ACCOUNTS).map(([cat, items]) => (
                          <optgroup key={cat} label={cat}>
                            {items.map(a => <option key={a}>{a}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={fg}>
                    <label style={lbl}>摘要（メモ）</label>
                    <input type="text" placeholder="例: スーパーで食材購入" value={form.description} onChange={e => setForm(p => ({ ...p, description:e.target.value }))} style={inp} />
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <input type="checkbox" id="settled" checked={form.is_settled} onChange={e => setForm(p => ({ ...p, is_settled:e.target.checked }))} style={{ width:15, height:15, accentColor:ACCENT }} />
                    <label htmlFor="settled" style={{ fontSize:12, color:"#6B7280", cursor:"pointer" }}>決済済み（現金払い・引き落とし済）</label>
                  </div>
                </div>

                <div style={{ display:"flex", gap:8, marginTop:18 }}>
                  <button
                    onClick={handleSubmit}
                    onMouseEnter={e => (e.currentTarget.style.background = ACCENT_D)}
                    onMouseLeave={e => (e.currentTarget.style.background = ACCENT)}
                    style={{ flex:1, padding:"11px 0", borderRadius:10, border:"none", cursor:"pointer", background:ACCENT, color:"#fff", fontWeight:700, fontSize:13, boxShadow:`0 4px 14px ${ACCENT}44`, fontFamily:"inherit" }}
                  >{editId ? "✓ 更新する" : "＋ 登録する"}</button>
                  {editId && (
                    <button
                      onClick={() => { setEditId(null); setForm({ date:selectedDate, debit_account:"食費", credit_account:"現金", amount:"", description:"", is_settled:false }); }}
                      style={{ padding:"11px 16px", borderRadius:10, border:"1.5px solid #E5E7EB", background:"#fff", color:"#6B7280", cursor:"pointer", fontSize:13, fontFamily:"inherit" }}
                    >キャンセル</button>
                  )}
                </div>
              </div>

              {/* Day transactions */}
              {(dayMap[selectedDate] || []).length > 0 && (
                <div style={card}>
                  <h3 style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:12 }}>{selectedDate} の取引</h3>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {(dayMap[selectedDate] || []).map(t => (
                      <div key={t.id} style={{ background:"#F8F9FC", borderRadius:10, padding:"11px 14px", border:`1.5px solid ${t.is_settled ? "#E5E7EB" : "#FDE68A"}` }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                          <span style={{ fontSize:12, fontWeight:600, color:"#111827" }}>{t.description || "（摘要なし）"}</span>
                          <span style={{ fontFamily:"DM Mono,monospace", fontWeight:700, fontSize:13, color:INCOME_ACCTS.has(t.debit_account) ? "#059669" : "#374151" }}>
                            ¥{fmt(t.amount)}
                          </span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                          <span style={{ fontSize:10, background:ACCENT_L, color:ACCENT, padding:"1px 7px", borderRadius:4, fontWeight:600 }}>借 {t.debit_account}</span>
                          <span style={{ fontSize:10, color:"#D1D5DB" }}>→</span>
                          <span style={{ fontSize:10, background:"#F3F4F6", color:"#6B7280", padding:"1px 7px", borderRadius:4, fontWeight:600 }}>貸 {t.credit_account}</span>
                          <span style={{ marginLeft:"auto", fontSize:10, padding:"1px 7px", borderRadius:10, fontWeight:600, background:t.is_settled ? "#ECFDF5" : "#FFFBEB", color:t.is_settled ? "#065F46" : "#92400E" }}>
                            {t.is_settled ? "✓ 決済済" : "⚠ 未決済"}
                          </span>
                        </div>
                        <div style={{ display:"flex", gap:6, marginTop:8 }}>
                          <button onClick={() => handleEdit(t)} style={smBtn}>編集</button>
                          {!t.is_settled && <button onClick={() => handleSettle(t.id)} style={{ ...smBtn, color:"#059669", background:"#ECFDF5", border:"1px solid #A7F3D0" }}>決済済みに</button>}
                          <button onClick={() => handleDelete(t.id)} style={{ ...smBtn, color:"#DC2626", background:"#FEF2F2", border:"1px solid #FECACA" }}>削除</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════ 取引一覧 ════════ */}
        {tab === "list" && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <h2 style={{ fontSize:20, fontWeight:700, color:"#111827", margin:0 }}>{calYear}年 {calMonth}月 の取引一覧</h2>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <select value={filterAcct} onChange={e => setFilterAcct(e.target.value)} style={{ ...inp, width:160, padding:"7px 10px" }}>
                  <option value="">全勘定科目</option>
                  {Object.entries(ACCOUNTS).map(([cat, items]) => (
                    <optgroup key={cat} label={cat}>{items.map(a => <option key={a}>{a}</option>)}</optgroup>
                  ))}
                </select>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={prevMonth} style={navBtn}>‹</button>
                  <button onClick={nextMonth} style={navBtn}>›</button>
                </div>
                <button onClick={downloadCSV} style={{ ...smBtn, padding:"7px 14px", fontSize:12, background:"#ECFDF5", color:"#059669", border:"1px solid #A7F3D0" }}>⬇ CSV</button>
              </div>
            </div>
            <div style={{ ...card, padding:0, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"#F8F9FC", borderBottom:"1px solid #E5E7EB" }}>
                    {["日付","借方","貸方","金額","摘要","決済","操作"].map(h => (
                      <th key={h} style={{ padding:"11px 16px", textAlign:"left", fontSize:11, color:"#6B7280", fontWeight:700, letterSpacing:".06em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign:"center", padding:40, color:"#9CA3AF" }}>データなし</td></tr>}
                  {[...filtered].sort((a,b) => b.date.localeCompare(a.date)).map((t, i) => (
                    <tr key={t.id}
                      style={{ borderBottom:"1px solid #F3F4F6", background:i%2===0?"#fff":"#FAFAFA" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#F0F4FF")}
                      onMouseLeave={e => (e.currentTarget.style.background = i%2===0?"#fff":"#FAFAFA")}
                    >
                      <td style={{ padding:"11px 16px", fontFamily:"DM Mono,monospace", color:"#6B7280", fontSize:12 }}>{t.date}</td>
                      <td style={{ padding:"11px 16px" }}>
                        <span style={{ background:ACCENT_L, color:ACCENT, padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:700 }}>{t.debit_account}</span>
                      </td>
                      <td style={{ padding:"11px 16px" }}>
                        <span style={{ background:"#F3F4F6", color:"#6B7280", padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:600 }}>{t.credit_account}</span>
                      </td>
                      <td style={{ padding:"11px 16px", fontFamily:"DM Mono,monospace", fontWeight:700, color:"#111827" }}>¥{fmt(t.amount)}</td>
                      <td style={{ padding:"11px 16px", color:"#374151", maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.description}</td>
                      <td style={{ padding:"11px 16px" }}>
                        <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, fontWeight:600, background:t.is_settled?"#ECFDF5":"#FFFBEB", color:t.is_settled?"#065F46":"#92400E" }}>
                          {t.is_settled ? "✓ 済" : "⚠ 未"}
                        </span>
                      </td>
                      <td style={{ padding:"11px 16px" }}>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={() => handleEdit(t)} style={smBtn}>編集</button>
                          <button onClick={() => handleDelete(t.id)} style={{ ...smBtn, color:"#DC2626", background:"#FEF2F2", border:"1px solid #FECACA" }}>削除</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background:"#F8F9FC", borderTop:"2px solid #E5E7EB" }}>
                    <td colSpan={3} style={{ padding:"11px 16px", fontWeight:700, color:"#6B7280", fontSize:12 }}>合計 {filtered.length}件</td>
                    <td style={{ padding:"11px 16px", fontFamily:"DM Mono,monospace", fontWeight:700, color:ACCENT }}>
                      ¥{fmt(filtered.reduce((s,t) => s+t.amount, 0))}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ════════ ダッシュボード ════════ */}
        {tab === "dashboard" && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
              <h2 style={{ fontSize:20, fontWeight:700, color:"#111827", margin:0 }}>{calYear}年 {calMonth}月 の分析</h2>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={prevMonth} style={navBtn}>‹ 前月</button>
                <button onClick={nextMonth} style={navBtn}>次月 ›</button>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:24 }}>
              {[
                { label:"支出合計",   val:`¥${fmt(dash.exp)}`,       sub:"今月の費用合計",      borderColor:ACCENT,    valColor:"#111827" },
                { label:"クレカ未払", val:`¥${fmt(dash.unsettled)}`, sub:"全期間の未決済合計",  borderColor:"#F59E0B", valColor:"#D97706" },
                { label:"収益合計",   val:`¥${fmt(dash.inc)}`,       sub:"今月の収益合計",      borderColor:"#10B981", valColor:"#059669" },
              ].map(c => (
                <div key={c.label} style={{ ...card, borderLeft:`4px solid ${c.borderColor}` }}>
                  <div style={{ fontSize:11, color:"#9CA3AF", letterSpacing:".06em", marginBottom:6 }}>{c.label}</div>
                  <div style={{ fontSize:26, fontWeight:700, fontFamily:"DM Mono,monospace", color:c.valColor }}>{c.val}</div>
                  <div style={{ fontSize:11, color:"#9CA3AF", marginTop:4 }}>{c.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
              <div style={card}>
                <h3 style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:16 }}>費用科目別内訳</h3>
                <PieChart data={dash.byAcct} />
              </div>
              <div style={card}>
                <h3 style={{ fontSize:13, fontWeight:700, color:"#374151", marginBottom:14 }}>⚠ 未決済取引</h3>
                {txns.filter(t => !t.is_settled).length === 0
                  ? <p style={{ color:"#9CA3AF", fontSize:13, textAlign:"center", padding:"20px 0" }}>未決済取引はありません</p>
                  : txns.filter(t => !t.is_settled).slice(0, 6).map(t => (
                    <div key={t.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #F3F4F6", fontSize:12 }}>
                      <div>
                        <span style={{ color:"#374151", fontWeight:500 }}>{t.date}</span>
                        <span style={{ color:"#9CA3AF", marginLeft:8 }}>{t.description}</span>
                      </div>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <span style={{ fontFamily:"DM Mono,monospace", fontWeight:700, color:"#D97706" }}>¥{fmt(t.amount)}</span>
                        <button onClick={() => handleSettle(t.id)} style={{ ...smBtn, fontSize:10, color:"#059669", background:"#ECFDF5", border:"1px solid #A7F3D0" }}>決済済</button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
