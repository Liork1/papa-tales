import type { NextPage } from "next";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useUserContext } from "@/lib/user-context";
import { getAuthClient } from "@/lib/auth";
import type { AdminUser } from "@/pages/api/admin/users";

// ── Design tokens ─────────────────────────────────────────────────────────────
const AC = { main: "#7a4fb0", deep: "#553089", soft: "#efe6fb", ink: "#4a2d72" };
const PANEL: React.CSSProperties = {
  background: "#fff", borderRadius: 18, padding: "1.4rem 1.5rem",
  boxShadow: "0 4px 16px rgba(40,20,80,.06)",
};
const NAV_BASE: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: ".75rem", width: "100%",
  textAlign: "left", border: "none", cursor: "pointer",
  padding: ".7rem .8rem", borderRadius: 12,
  fontFamily: "'Rubik',sans-serif", fontWeight: 600, fontSize: ".95rem",
  transition: "background .15s ease",
};
const NAV_ON: React.CSSProperties = { ...NAV_BASE, background: "rgba(255,255,255,.18)", color: "#fff" };
const NAV_OFF: React.CSSProperties = { ...NAV_BASE, background: "transparent", color: "rgba(255,255,255,.72)" };

// ── Types ──────────────────────────────────────────────────────────────────────
interface Stats {
  totalUsers: number; totalStories: number; activeThisWeek: number;
  creditsGranted: number; trend: number[];
  ageGroups: Record<string, number>; planMix: Record<string, number>;
}

interface Grant {
  id: string; recipientId: string; recipientName: string;
  adminName: string; amount: number; reason: string; createdAt: string;
}

type View = "overview" | "users" | "log";

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n: number) { return Number(n).toLocaleString("en-US"); }
function fmtDate(iso: string) {
  const d = new Date(iso);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2,"0")}, ${d.getFullYear()}`;
}
function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}
function planBadge(plan: AdminUser["plan"]) {
  const map = {
    credits: { bg: AC.soft, color: AC.ink, label: "Credits" },
    free:    { bg: "#eaf2ff", color: "#2563eb", label: "Free" },
    guest:   { bg: "#f0eef5", color: "#6b6480", label: "Guest" },
  };
  return map[plan] ?? map.guest;
}
function avStyle(color: string, size = 38): React.CSSProperties {
  return {
    width: size, height: size, borderRadius: "50%", background: color, color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Rubik',sans-serif", fontWeight: 700,
    fontSize: size > 40 ? "1.15rem" : ".9rem", flexShrink: 0,
  };
}
const USER_COLORS = ["#7a4fb0","#3b82f6","#2ecc71","#ff9f43","#e8745c","#6366f1","#14b8a6","#ec4899","#8b5cf6"];
function userColor(id: string) { return USER_COLORS[id.charCodeAt(0) % USER_COLORS.length]; }

// ── Trend SVG ─────────────────────────────────────────────────────────────────
function TrendChart({ data }: { data: number[] }) {
  if (!data.length) return null;
  const W = 660, H = 220, padT = 18, padB = 24, padX = 4;
  const n = data.length;
  const max = Math.max(...data, 1), min = Math.min(...data);
  const rng = (max - min) || 1;
  const X = (i: number) => padX + i * (W - 2 * padX) / (n - 1);
  const Y = (v: number) => padT + (1 - (v - min) / rng) * (H - padT - padB);
  const pts = data.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(" ");
  const area = pts + ` L${X(n-1).toFixed(1)} ${H - padB} L${X(0).toFixed(1)} ${H - padB} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 200, display: "block", overflow: "visible" }}>
      <line x1={4} y1={50} x2={656} y2={50} stroke="#eee7f5" strokeWidth={1}/>
      <line x1={4} y1={98} x2={656} y2={98} stroke="#eee7f5" strokeWidth={1}/>
      <line x1={4} y1={146} x2={656} y2={146} stroke="#eee7f5" strokeWidth={1}/>
      <line x1={4} y1={196} x2={656} y2={196} stroke="#e7e0f2" strokeWidth={1}/>
      <path d={area} fill={`${AC.main}1f`}/>
      <path d={pts} fill="none" stroke={AC.main} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
      <circle cx={X(n-1)} cy={Y(data[n-1])} r={4.5} fill={AC.main} stroke="#fff" strokeWidth={2.5} vectorEffect="non-scaling-stroke"/>
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
const AdminPage: NextPage = () => {
  const router = useRouter();
  const { user, role, profile } = useUserContext();
  const [view, setView] = useState<View>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [grantAmount, setGrantAmount] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [granting, setGranting] = useState(false);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  // Auth guard
  useEffect(() => {
    if (user === null && !loading) router.replace("/");
    if (user && role && role !== "admin") router.replace("/");
  }, [user, role, loading, router]);

  const adminFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const { data: { session } } = await getAuthClient().auth.getSession();
    const token = session?.access_token;
    return fetch(url, {
      ...options,
      headers: { ...((options.headers as Record<string, string>) ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  }, []);

  // Load data
  useEffect(() => {
    if (!user || role !== "admin") return;
    setLoading(true);
    Promise.all([
      adminFetch("/api/admin/stats").then(r => r.ok ? r.json() : null),
      adminFetch("/api/admin/users").then(r => r.ok ? r.json() : null),
      adminFetch("/api/admin/grants").then(r => r.ok ? r.json() : null),
    ]).then(([s, u, g]) => {
      if (s) setStats(s);
      if (u?.users) setUsers(u.users);
      if (g?.grants) setGrants(g.grants);
    }).finally(() => setLoading(false));
  }, [user, role, adminFetch]);

  // Search filter
  const filteredUsers = useCallback(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => u.email.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q));
  }, [users, search])();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  };

  const handleGrant = async () => {
    if (!selectedUser) return;
    const amt = parseInt(grantAmount, 10);
    if (!amt || amt < 1) return;
    setGranting(true);
    const res = await adminFetch("/api/admin/grant-credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUser.id, amount: amt, reason: grantReason }),
    });
    setGranting(false);
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, credits: u.credits + amt } : u));
      setSelectedUser(prev => prev ? { ...prev, credits: prev.credits + amt } : null);
      const adminName = (user?.user_metadata?.display_name as string | undefined) ?? user?.email?.split("@")[0] ?? "Admin";
      setGrants(prev => [{
        id: Date.now().toString(), recipientId: selectedUser.id,
        recipientName: selectedUser.displayName, adminName,
        amount: amt, reason: grantReason || "No reason provided",
        createdAt: new Date().toISOString(),
      }, ...prev]);
      setGrantAmount(""); setGrantReason("");
      showToast(`Granted ${amt} credit${amt > 1 ? "s" : ""} to ${selectedUser.displayName}`);
    }
  };

  const adminName = (user?.user_metadata?.display_name as string | undefined) ?? user?.email?.split("@")[0] ?? "Admin";
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const titles: Record<View, { t: string; s: string }> = {
    overview: { t: "Dashboard",  s: "Overview of Papa Tales activity" },
    users:    { t: "Users",      s: "Search users and grant credits" },
    log:      { t: "Credit Log", s: "History of every credit grant" },
  };

  if (!user || role !== "admin") return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&family=Assistant:wght@400;500;600;700&display=swap');
        @keyframes admRise { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
        @keyframes admToast { from { opacity:0; transform:translate(-50%,12px); } to { opacity:1; transform:translate(-50%,0); } }
        .adm-row:hover { background:#faf8fe !important; }
        .adm-stat:hover { box-shadow:0 10px 28px rgba(40,20,80,.10) !important; transform:translateY(-2px); }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", background: "#f4f2f9", fontFamily: "'Assistant',sans-serif", color: "#2a2140" }}>

        {/* Sidebar */}
        <aside style={{
          width: 248, flexShrink: 0, position: "sticky", top: 0, height: "100vh",
          background: `linear-gradient(165deg, ${AC.main} 0%, ${AC.deep} 100%)`,
          padding: "1.6rem 1.1rem", display: "flex", flexDirection: "column", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: ".7rem", padding: "0 .4rem", marginBottom: "2rem" }}>
              <span style={{ width: 42, height: 42, borderRadius: 13, background: "rgba(255,255,255,.16)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.35rem" }}>🌙</span>
              <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
                <span style={{ fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: "1.05rem", color: "#fff" }}>Papa Tales</span>
                <span style={{ fontSize: ".72rem", fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(255,255,255,.6)" }}>Admin Console</span>
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: ".3rem" }}>
              {([["overview","Dashboard","M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"],["users","Users","M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"],["log","Credit Log","M8 8a6 6 0 1 1 12 0 6 6 0 0 1-12 0M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4m9.71 7.88.7.71-2.82 2.82"]] as [View, string, string][]).map(([v, label, d]) => (
                <button key={v} onClick={() => setView(v)} style={view === v ? NAV_ON : NAV_OFF}>
                  <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,.1)", borderRadius: 14, padding: ".7rem .8rem", display: "flex", alignItems: "center", gap: ".6rem" }}>
            <span style={{ ...avStyle("#fff", 36), background: "#fff", color: AC.deep }}>{adminName[0]?.toUpperCase()}</span>
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, minWidth: 0 }}>
              <span style={{ fontFamily: "'Rubik',sans-serif", fontWeight: 600, fontSize: ".85rem", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{adminName}</span>
              <span style={{ fontSize: ".72rem", color: "rgba(255,255,255,.6)" }}>Administrator</span>
            </span>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* Topbar */}
          <header style={{
            position: "sticky", top: 0, zIndex: 10,
            background: "rgba(244,242,249,.85)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "1.5rem 2.2rem 1.1rem", borderBottom: "1px solid #e7e2f0",
          }}>
            <div>
              <h1 style={{ fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: "1.6rem", color: "#2a2140", margin: 0 }}>{titles[view].t}</h1>
              <p style={{ fontSize: ".9rem", color: "#8a7fa6", margin: ".2rem 0 0" }}>{titles[view].s}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: ".9rem" }}>
              <span style={{ fontSize: ".85rem", color: "#8a7fa6", fontWeight: 600 }}>{today}</span>
              <span style={{ ...avStyle(AC.soft, 36), background: AC.soft, color: AC.ink }}>{adminName[0]?.toUpperCase()}</span>
            </div>
          </header>

          <div style={{ padding: "1.8rem 2.2rem 2.6rem", display: "flex", flexDirection: "column", gap: "1.4rem", animation: "admRise .3s ease both" }}>

            {/* ── DASHBOARD ── */}
            {view === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
                {/* Stat cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(192px,1fr))", gap: "1.1rem" }}>
                  {[
                    { label: "Total users", value: fmt(stats?.totalUsers ?? 0), icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
                    { label: "Stories generated", value: fmt(stats?.totalStories ?? 0), icon: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" },
                    { label: "Active this week", value: fmt(stats?.activeThisWeek ?? 0), icon: "M22 7 13.5 15.5 8.5 10.5 2 17M16 7h6v6" },
                    { label: "Credits granted", value: fmt(stats?.creditsGranted ?? 0), icon: "M8 8a6 6 0 1 1 12 0 6 6 0 0 1-12 0M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4m9.71 7.88.7.71-2.82 2.82" },
                  ].map(({ label, value, icon }) => (
                    <div key={label} className="adm-stat" style={{ background: "#fff", borderRadius: 18, padding: "1.3rem 1.4rem", boxShadow: "0 4px 16px rgba(40,20,80,.06)", transition: "box-shadow .15s ease, transform .15s ease" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                        <span style={{ width: 40, height: 40, borderRadius: 12, background: AC.soft, color: AC.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={icon}/></svg>
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: ".2rem", background: "#e9f9ef", color: "#1f9d57", fontWeight: 700, fontSize: ".74rem", padding: ".22rem .5rem", borderRadius: 99 }}>▲</span>
                      </div>
                      <div style={{ fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: "1.95rem", color: "#2a2140", lineHeight: 1 }}>{value}</div>
                      <div style={{ fontSize: ".86rem", color: "#8a7fa6", marginTop: ".4rem", fontWeight: 600 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Trend + Age */}
                <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "1.1rem" }}>
                  <div style={PANEL}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "1.2rem" }}>
                      <div>
                        <h3 style={{ fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: "1.05rem", margin: 0, color: "#2a2140" }}>Stories generated</h3>
                        <p style={{ fontSize: ".82rem", color: "#8a7fa6", margin: ".2rem 0 0" }}>Last 30 days · daily</p>
                      </div>
                      <span style={{ fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: "1.05rem", color: AC.main }}>
                        {stats?.trend[stats.trend.length - 1] ?? 0}<span style={{ fontSize: ".78rem", color: "#8a7fa6", fontWeight: 600 }}> today</span>
                      </span>
                    </div>
                    <TrendChart data={stats?.trend ?? Array(30).fill(0)} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: ".5rem", fontSize: ".74rem", color: "#aaa0c0", fontWeight: 600 }}>
                      <span>30d ago</span><span>20d</span><span>10d</span><span>Today</span>
                    </div>
                  </div>

                  <div style={PANEL}>
                    <h3 style={{ fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: "1.05rem", margin: "0 0 .2rem", color: "#2a2140" }}>Stories by age group</h3>
                    <p style={{ fontSize: ".82rem", color: "#8a7fa6", margin: "0 0 1.3rem" }}>Share of all stories</p>
                    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-around", height: 148, gap: ".7rem" }}>
                      {Object.entries(stats?.ageGroups ?? { "2-4": 22, "4-6": 34, "6-8": 28, "8-10": 16 }).map(([label, pct]) => (
                        <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: ".5rem", height: "100%", justifyContent: "flex-end" }}>
                          <span style={{ fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: ".8rem", color: "#6a5f88" }}>{pct}%</span>
                          <div style={{ width: "100%", maxWidth: 46, borderRadius: "9px 9px 4px 4px", height: `${pct}%`, background: `linear-gradient(180deg, ${AC.main}, ${AC.deep})` }}/>
                          <span style={{ fontSize: ".78rem", color: "#8a7fa6", fontWeight: 600 }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Plan mix + Activity */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "1.1rem" }}>
                  <div style={PANEL}>
                    <h3 style={{ fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: "1.05rem", margin: "0 0 1.2rem", color: "#2a2140" }}>Plan distribution</h3>
                    {(() => {
                      const mix = stats?.planMix ?? { guest: 41, free: 38, credits: 21 };
                      const segs = [
                        { label: "Guest",   pct: mix.guest,   color: AC.main + "40" },
                        { label: "Free",    pct: mix.free,    color: AC.main + "85" },
                        { label: "Credits", pct: mix.credits, color: AC.main },
                      ];
                      return (
                        <>
                          <div style={{ display: "flex", width: "100%", height: 16, borderRadius: 99, overflow: "hidden", marginBottom: "1.3rem" }}>
                            {segs.map(s => <div key={s.label} style={{ width: `${s.pct}%`, background: s.color }}/>)}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: ".85rem" }}>
                            {segs.map(s => (
                              <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: ".55rem", fontSize: ".9rem", color: "#5a5076", fontWeight: 600 }}>
                                  <span style={{ width: 11, height: 11, borderRadius: 3, background: s.color, display: "inline-block" }}/>
                                  {s.label}
                                </span>
                                <span style={{ fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: ".9rem", color: "#2a2140" }}>{s.pct}%</span>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <div style={PANEL}>
                    <h3 style={{ fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: "1.05rem", margin: "0 0 1.2rem", color: "#2a2140" }}>Recent grants</h3>
                    {grants.slice(0, 5).map(g => (
                      <div key={g.id} style={{ display: "flex", alignItems: "center", gap: ".8rem", padding: ".55rem 0", borderBottom: "1px solid #f1edf7" }}>
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: AC.main, flexShrink: 0 }}/>
                        <span style={{ flex: 1, fontSize: ".9rem", color: "#3a3158" }}>
                          <b style={{ color: AC.ink }}>{g.adminName}</b> granted {g.amount} credits to {g.recipientName}
                        </span>
                        <span style={{ fontSize: ".78rem", color: "#aaa0c0", fontWeight: 600, whiteSpace: "nowrap" }}>{timeAgo(g.createdAt)}</span>
                      </div>
                    ))}
                    {grants.length === 0 && <p style={{ fontSize: ".9rem", color: "#9a8fb8", margin: 0 }}>No grants yet.</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ── USERS ── */}
            {view === "users" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 372px", gap: "1.2rem", alignItems: "start" }}>
                {/* List */}
                <div style={PANEL}>
                  <div style={{ position: "relative", marginBottom: "1.1rem" }}>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#9a8fb8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}><circle cx={11} cy={11} r={8}/><path d="m21 21-4.3-4.3"/></svg>
                    <input
                      placeholder="Search by name or email…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{ width: "100%", padding: ".75rem 1rem .75rem 2.6rem", border: "1.5px solid #e7e0f2", borderRadius: 99, fontSize: ".92rem", fontFamily: "'Assistant',sans-serif", background: "#faf8fe", color: "#2a2140", outline: "none" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 96px 84px 90px", padding: "0 .9rem .6rem", fontSize: ".74rem", fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "#aaa0c0", borderBottom: "1px solid #f1edf7" }}>
                    <span>User</span><span style={{ textAlign: "center" }}>Plan</span><span style={{ textAlign: "center" }}>Credits</span><span style={{ textAlign: "right" }}>Stories</span>
                  </div>
                  {filteredUsers.map(u => {
                    const badge = planBadge(u.plan);
                    const selected = selectedUser?.id === u.id;
                    return (
                      <div key={u.id} className="adm-row" onClick={() => { setSelectedUser(u); setGrantAmount(""); setGrantReason(""); }}
                        style={{ display: "grid", gridTemplateColumns: "1fr 96px 84px 90px", alignItems: "center", gap: ".5rem", padding: ".7rem .9rem", borderRadius: 13, cursor: "pointer", border: `1.5px solid ${selected ? AC.main : "transparent"}`, background: selected ? AC.soft : "transparent", marginTop: ".3rem", transition: "background .15s ease" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: ".7rem", minWidth: 0 }}>
                          <span style={avStyle(userColor(u.id), 38)}>{u.displayName[0]?.toUpperCase()}</span>
                          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25, minWidth: 0 }}>
                            <span style={{ fontFamily: "'Rubik',sans-serif", fontWeight: 600, fontSize: ".92rem", color: "#2a2140", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.displayName}</span>
                            <span style={{ fontSize: ".78rem", color: "#9a8fb8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</span>
                          </span>
                        </div>
                        <span style={{ textAlign: "center" }}><span style={{ display: "inline-block", background: badge.bg, color: badge.color, fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: ".74rem", padding: ".2rem .6rem", borderRadius: 99 }}>{badge.label}</span></span>
                        <span style={{ textAlign: "center", fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: ".92rem", color: AC.main }}>{u.credits}</span>
                        <span style={{ textAlign: "right", fontSize: ".9rem", color: "#5a5076", fontWeight: 600 }}>{u.stories}</span>
                      </div>
                    );
                  })}
                  {filteredUsers.length === 0 && <div style={{ padding: "2.4rem 1rem", textAlign: "center", color: "#9a8fb8", fontSize: ".92rem" }}>No users match "{search}".</div>}
                </div>

                {/* Detail */}
                <div style={PANEL}>
                  {selectedUser ? (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: ".9rem", paddingBottom: "1.2rem", borderBottom: "1px solid #f1edf7", marginBottom: "1.2rem" }}>
                        <span style={avStyle(userColor(selectedUser.id), 52)}>{selectedUser.displayName[0]?.toUpperCase()}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#2a2140" }}>{selectedUser.displayName}</div>
                          <div style={{ fontSize: ".84rem", color: "#9a8fb8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedUser.email}</div>
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem", marginBottom: "1.2rem" }}>
                        {[
                          { label: "Plan", value: <span style={{ display: "inline-block", background: planBadge(selectedUser.plan).bg, color: planBadge(selectedUser.plan).color, fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: ".8rem", padding: ".22rem .6rem", borderRadius: 99 }}>{planBadge(selectedUser.plan).label}</span> },
                          { label: "Credit balance", value: <span style={{ fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: "1.15rem", color: AC.main }}>{selectedUser.credits}</span> },
                          { label: "Stories made", value: <span style={{ fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: "1.15rem", color: "#2a2140" }}>{selectedUser.stories}</span> },
                          { label: "Last active", value: <span style={{ fontFamily: "'Rubik',sans-serif", fontWeight: 600, fontSize: ".95rem", color: "#2a2140" }}>{timeAgo(selectedUser.lastSignIn)}</span> },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ background: "#faf8fe", borderRadius: 13, padding: ".8rem .9rem" }}>
                            <div style={{ fontSize: ".74rem", color: "#9a8fb8", fontWeight: 600, marginBottom: ".25rem" }}>{label}</div>
                            {value}
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: ".8rem", color: "#9a8fb8", marginBottom: "1.3rem" }}>Joined {fmtDate(selectedUser.createdAt)}</div>

                      {/* Grant form */}
                      <div style={{ background: `${AC.soft}66`, border: `1.5px solid ${AC.soft}`, borderRadius: 15, padding: "1.1rem 1.1rem 1.2rem" }}>
                        <div style={{ fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: ".95rem", color: AC.ink, marginBottom: ".85rem" }}>Grant credits</div>
                        <label style={{ display: "block", fontSize: ".78rem", fontWeight: 700, color: "#5a5076", marginBottom: ".35rem" }}>Amount</label>
                        <input type="number" min={1} placeholder="e.g. 10" value={grantAmount} onChange={e => setGrantAmount(e.target.value.replace(/[^0-9]/g, ""))}
                          style={{ width: "100%", padding: ".65rem .85rem", border: "1.5px solid #e0d6f0", borderRadius: 11, fontSize: "1rem", fontFamily: "'Rubik',sans-serif", fontWeight: 600, background: "#fff", color: "#2a2140", outline: "none", marginBottom: ".5rem" }}/>
                        <div style={{ display: "flex", gap: ".4rem", marginBottom: ".9rem" }}>
                          {[5, 10, 25].map(n => (
                            <button key={n} onClick={() => setGrantAmount(String(n))}
                              style={{ flex: 1, padding: ".5rem", border: `1.5px solid ${AC.soft}`, background: "#fff", color: AC.ink, borderRadius: 10, fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: ".85rem", cursor: "pointer" }}>
                              +{n}
                            </button>
                          ))}
                        </div>
                        <label style={{ display: "block", fontSize: ".78rem", fontWeight: 700, color: "#5a5076", marginBottom: ".35rem" }}>Reason</label>
                        <textarea placeholder="Why are you granting these credits?" value={grantReason} onChange={e => setGrantReason(e.target.value)}
                          style={{ width: "100%", height: 64, resize: "none", padding: ".6rem .85rem", border: "1.5px solid #e0d6f0", borderRadius: 11, fontSize: ".9rem", fontFamily: "'Assistant',sans-serif", lineHeight: 1.5, background: "#fff", color: "#2a2140", outline: "none", marginBottom: ".9rem" }}/>
                        <button onClick={handleGrant} disabled={!grantAmount || parseInt(grantAmount) < 1 || granting}
                          style={{ width: "100%", border: "none", borderRadius: 13, padding: ".8rem", fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: ".98rem", color: "#fff", cursor: !grantAmount || parseInt(grantAmount) < 1 ? "not-allowed" : "pointer", background: `linear-gradient(135deg, ${AC.main}, ${AC.deep})`, opacity: !grantAmount || parseInt(grantAmount) < 1 ? .5 : 1, transition: "opacity .15s" }}>
                          {granting ? "Granting…" : "Grant credits"}
                        </button>
                      </div>

                      {/* Grant history for this user */}
                      {grants.filter(g => g.recipientId === selectedUser.id).length > 0 && (
                        <div style={{ marginTop: "1.3rem" }}>
                          <div style={{ fontSize: ".78rem", fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "#aaa0c0", marginBottom: ".6rem" }}>Grant history</div>
                          {grants.filter(g => g.recipientId === selectedUser.id).slice(0, 4).map(g => (
                            <div key={g.id} style={{ display: "flex", alignItems: "flex-start", gap: ".6rem", padding: ".5rem 0", borderBottom: "1px solid #f4f0fa" }}>
                              <span style={{ fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: ".85rem", color: AC.main, whiteSpace: "nowrap" }}>+{g.amount}</span>
                              <span style={{ flex: 1, fontSize: ".82rem", color: "#5a5076", lineHeight: 1.4 }}>
                                {g.reason}
                                <span style={{ display: "block", fontSize: ".74rem", color: "#aaa0c0", marginTop: ".1rem" }}>{fmtDate(g.createdAt)}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: "3rem 1rem", textAlign: "center" }}>
                      <span style={{ display: "inline-flex", width: 56, height: 56, borderRadius: "50%", background: AC.soft, color: AC.ink, alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                        <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx={12} cy={7} r={4}/></svg>
                      </span>
                      <div style={{ fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: "1rem", color: "#2a2140", marginBottom: ".35rem" }}>Select a user</div>
                      <p style={{ fontSize: ".88rem", color: "#9a8fb8", lineHeight: 1.5, margin: "0 auto", maxWidth: 240 }}>Pick someone from the list to view their details and grant credits.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── CREDIT LOG ── */}
            {view === "log" && (
              <div style={PANEL}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.3rem" }}>
                  <h3 style={{ fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: "1.05rem", margin: 0, color: "#2a2140" }}>All credit grants</h3>
                  <span style={{ fontSize: ".85rem", color: "#8a7fa6", fontWeight: 600 }}>{grants.length} grants</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1.3fr 80px 2fr 1.2fr", padding: "0 .9rem .7rem", fontSize: ".74rem", fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "#aaa0c0", borderBottom: "1px solid #f1edf7" }}>
                  <span>Recipient</span><span style={{ textAlign: "center" }}>Amount</span><span>Reason</span><span style={{ textAlign: "right" }}>By · when</span>
                </div>
                {grants.map(g => (
                  <div key={g.id} style={{ display: "grid", gridTemplateColumns: "1.3fr 80px 2fr 1.2fr", alignItems: "center", padding: ".85rem .9rem", borderBottom: "1px solid #f4f0fa" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: ".6rem", minWidth: 0 }}>
                      <span style={avStyle(userColor(g.recipientId), 30)}>{g.recipientName[0]?.toUpperCase()}</span>
                      <span style={{ fontFamily: "'Rubik',sans-serif", fontWeight: 600, fontSize: ".9rem", color: "#2a2140", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.recipientName}</span>
                    </span>
                    <span style={{ textAlign: "center" }}>
                      <span style={{ display: "inline-block", background: AC.soft, color: AC.ink, fontFamily: "'Rubik',sans-serif", fontWeight: 700, fontSize: ".85rem", padding: ".2rem .6rem", borderRadius: 99 }}>+{g.amount}</span>
                    </span>
                    <span style={{ fontSize: ".88rem", color: "#5a5076", lineHeight: 1.4 }}>{g.reason}</span>
                    <span style={{ textAlign: "right", fontSize: ".82rem", color: "#8a7fa6", fontWeight: 600, lineHeight: 1.35 }}>
                      {g.adminName}
                      <span style={{ display: "block", fontSize: ".76rem", color: "#aaa0c0" }}>{fmtDate(g.createdAt)}</span>
                    </span>
                  </div>
                ))}
                {grants.length === 0 && <p style={{ padding: "2rem", textAlign: "center", color: "#9a8fb8", fontSize: ".92rem", margin: 0 }}>No grants yet.</p>}
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 26, left: "50%", transform: "translateX(-50%)", zIndex: 50, display: "flex", alignItems: "center", gap: ".6rem", background: "#2a2140", color: "#fff", fontWeight: 600, fontSize: ".92rem", padding: ".8rem 1.3rem", borderRadius: 99, boxShadow: "0 12px 32px rgba(40,20,80,.32)", animation: "admToast .25s ease both" }}>
          <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#2ecc71", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".82rem", flexShrink: 0 }}>✓</span>
          {toast}
        </div>
      )}
    </>
  );
};

export default AdminPage;
