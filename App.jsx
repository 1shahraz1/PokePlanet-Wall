import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1_6BofkPrDSdcB7PDLT4lR_ytOQ2CGjyoPMQ1hQoFWh0/export?format=csv&gid=0";
const SUPABASE_URL = "https://ghylqwpkcuwjpcgzffue.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_g9SX3hbI_sNJNoWTImIK4A_g92TCvuu";
const SESSION_ID = "main-wall";
const STORAGE_KEY = "pokeplanet-live-wall-fallback-state-v3";
const BASE_HITS_KEY = "pokeplanet-live-wall-fallback-base-v3";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const DEMO_HITS = [
  { id: "1", title: "MEGA LATIAS EX BOX", qty: 4, tier: "Chase", image: "https://images.pokemontcg.io/swsh11/115_hires.png" },
  { id: "2", title: "ASCENDED HEROES DELUXE PIN COLLECTION", qty: 6, tier: "Chase", image: "https://images.unsplash.com/photo-1603481546238-487240415921?auto=format&fit=crop&w=1200&q=80" },
  { id: "3", title: "10X PACK LOT – ASCENDED HEROES", qty: 2, tier: "Standard", image: "https://res.cloudinary.com/dkspvhppa/image/upload/v1775347736/singer_byskqp.jpg" },
  { id: "4", title: "PERFECT ORDER ELITE TRAINER BOX", qty: 8, tier: "Premium", image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80" },
  { id: "5", title: "PHANTASMAL FLAMES ELITE TRAINER BOX", qty: 2, tier: "Premium", image: "https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=1200&q=80" },
  { id: "6", title: "SURGING SPARKS ELITE TRAINER BOX", qty: 3, tier: "Premium", image: "https://images.unsplash.com/photo-1516117172878-fd2c41f4a759?auto=format&fit=crop&w=1200&q=80" },
  { id: "7", title: "BLACK BOLT BOOSTER LOT", qty: 2, tier: "Standard", image: "https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=1200&q=80" },
  { id: "8", title: "WHITE FLARE BOOSTER LOT", qty: 2, tier: "Standard", image: "https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=1200&q=80" },
  { id: "9", title: "MEGA CHARIZARD UPC", qty: 4, tier: "Chase", image: "https://images.pokemontcg.io/swsh9/154_hires.png" },
];

const tierStyles = {
  Standard: { border: "1px solid rgba(34,211,238,0.55)", badge: "rgba(34,211,238,0.22)", glow: "0 0 16px rgba(34,211,238,0.18)", qtyColor: "#22d3ee" },
  Premium: { border: "1px solid rgba(217,70,239,0.5)", badge: "rgba(217,70,239,0.22)", glow: "0 0 18px rgba(217,70,239,0.2)", qtyColor: "#e879f9" },
  Chase: { border: "1px solid rgba(251,191,36,0.65)", badge: "rgba(251,191,36,0.24)", glow: "0 0 20px rgba(251,191,36,0.22)", qtyColor: "#facc15" },
};

const tierPriority = { Chase: 0, Premium: 1, Standard: 2 };

function normalizeTier(tier) {
  const value = String(tier || "").trim().toLowerCase();
  if (value === "chase") return "Chase";
  if (value === "premium") return "Premium";
  return "Standard";
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current.trim());
  return result;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, i) => [header, values[i] || ""]));
    return {
      id: String(row.id || index + 1),
      title: String(row.title || "UNTITLED HIT").trim(),
      qty: Math.max(0, Number.parseInt(row.qty || "0", 10) || 0),
      tier: normalizeTier(row.tier),
      image: String(row.image || "").trim(),
    };
  });
}

function validateHits(hits) {
  const ids = new Set();
  for (const hit of hits) {
    if (!hit.id) throw new Error("Each hit needs an id");
    if (ids.has(hit.id)) throw new Error(`Duplicate hit id: ${hit.id}`);
    ids.add(hit.id);
    if (!hit.title) throw new Error(`Missing title for id: ${hit.id}`);
    if (!Number.isInteger(hit.qty) || hit.qty < 0) throw new Error(`Invalid qty for id: ${hit.id}`);
    if (!tierStyles[hit.tier]) throw new Error(`Invalid tier for id: ${hit.id}`);
  }
}

function normalizeHits(hits) {
  return hits.map((hit, index) => ({
    id: String(hit.id || index + 1),
    title: String(hit.title || "UNTITLED HIT").trim(),
    qty: Math.max(0, Number.parseInt(String(hit.qty ?? 0), 10) || 0),
    tier: normalizeTier(hit.tier),
    image: String(hit.image || "").trim(),
  }));
}

function applyHitToHits(hits, id) {
  return hits.map((hit) => (hit.id === id ? { ...hit, qty: Math.max(0, hit.qty - 1) } : hit));
}

function updateHitQuantity(hits, id, qty) {
  return hits.map((hit) => (hit.id === id ? { ...hit, qty: Math.max(0, qty) } : hit));
}

function sortHitsForStream(hits, sortByTier) {
  const base = [...hits].sort((a, b) => {
    const aSoldOut = a.qty === 0 ? 1 : 0;
    const bSoldOut = b.qty === 0 ? 1 : 0;
    if (aSoldOut !== bSoldOut) return aSoldOut - bSoldOut;
    if (sortByTier) {
      const tierDiff = tierPriority[a.tier] - tierPriority[b.tier];
      if (tierDiff !== 0) return tierDiff;
    }
    return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" });
  });
  return base;
}

function runTests() {
  validateHits(DEMO_HITS);
  const sample = [
    { id: "a", title: "A", qty: 2, tier: "Standard", image: "x" },
    { id: "b", title: "B", qty: 1, tier: "Premium", image: "y" },
  ];
  const next = applyHitToHits(sample, "a");
  if (next.find((item) => item.id === "a")?.qty !== 1) throw new Error("applyHitToHits should decrement quantity");
  const soldOut = applyHitToHits(sample, "b");
  if (soldOut.find((item) => item.id === "b")?.qty !== 0) throw new Error("applyHitToHits should keep sold-out items at qty 0");
  const updated = updateHitQuantity(sample, "a", 7);
  if (updated.find((item) => item.id === "a")?.qty !== 7) throw new Error("updateHitQuantity should set exact qty");
  const sorted = sortHitsForStream([
    { id: "3", title: "C", qty: 2, tier: "Standard", image: "" },
    { id: "2", title: "B", qty: 2, tier: "Chase", image: "" },
    { id: "1", title: "A", qty: 0, tier: "Premium", image: "" },
  ], true);
  if (sorted[0].tier !== "Chase" || sorted[2].qty !== 0) throw new Error("sortHitsForStream should sort tier first and sold-out last");
  const csv = `id,title,qty,tier,image\n1,Test Hit,3,chase,https://example.com/image.jpg`;
  const parsed = parseCsv(csv);
  if (parsed.length !== 1 || parsed[0].tier !== "Chase" || parsed[0].qty !== 3) throw new Error("parseCsv should parse rows correctly");
}
runTests();

function pillStyle(bg) {
  return { background: bg, color: "#fff", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 9999, padding: "4px 8px", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1 };
}

function BurstEffect({ onDone }) {
  const particles = Array.from({ length: 14 }).map((_, i) => {
    const angle = (i / 14) * Math.PI * 2;
    const radius = 45 + (i % 4) * 14;
    return { id: i, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, scale: 0.8 + (i % 3) * 0.2 };
  });
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16, zIndex: 30 }}>
      <motion.div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(253,224,71,0.35), rgba(251,146,60,0.18), rgba(232,121,249,0.22))" }} initial={{ opacity: 0 }} animate={{ opacity: [0, 0.9, 0.08, 0] }} transition={{ duration: 0.6, ease: "easeOut" }} />
      <motion.div style={{ position: "absolute", left: "50%", top: "50%", width: 64, height: 64, transform: "translate(-50%, -50%)", borderRadius: 9999, border: "2px solid rgba(254,240,138,0.95)" }} initial={{ scale: 0.2, opacity: 1 }} animate={{ scale: 3, opacity: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} onAnimationComplete={onDone} />
      {particles.map((p) => <motion.div key={p.id} style={{ position: "absolute", left: "50%", top: "50%", width: 10, height: 10, transform: "translate(-50%, -50%)", borderRadius: 9999, background: "rgba(254,240,138,1)", boxShadow: "0 0 18px rgba(253,224,71,1)" }} initial={{ x: 0, y: 0, opacity: 1, scale: 1.1 }} animate={{ x: p.x, y: p.y, opacity: 0, scale: p.scale }} transition={{ duration: 0.45, ease: "easeOut" }} />)}
    </div>
  );
}

function VanishEffect() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 16, zIndex: 30 }}>
      <motion.div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(253,224,71,0.28), rgba(232,121,249,0.18), rgba(103,232,249,0.22))" }} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} />
    </div>
  );
}

function ConfettiLayer({ trigger }) {
  const pieces = Array.from({ length: 32 }).map((_, i) => ({ id: i, startX: Math.random() * 100, driftX: (Math.random() - 0.5) * 28, delay: Math.random() * 0.45, duration: 3.2 + Math.random() * 2.2, size: 6 + Math.random() * 8, hue: Math.random() * 360, rotateStart: Math.random() * 180, rotateEnd: 540 + Math.random() * 540, sway: 30 + Math.random() * 45, burstY: 6 + Math.random() * 12 }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 40 }}>
      {pieces.map((p) => <motion.div key={`${trigger}-${p.id}`} style={{ position: "absolute", left: `${p.startX}%`, top: "-2vh", width: `${p.size}px`, height: `${Math.max(4, p.size * 0.55)}px`, borderRadius: 2, background: `linear-gradient(135deg, hsl(${p.hue}, 95%, 68%), hsl(${(p.hue + 35) % 360}, 95%, 58%))`, boxShadow: `0 0 12px hsla(${p.hue}, 95%, 65%, 0.45)` }} initial={{ x: 0, y: -20, opacity: 0, rotate: p.rotateStart, scale: 0.7 }} animate={{ x: [0, p.driftX * 0.35, -p.sway * 0.35, p.sway * 0.55, -p.sway * 0.25, p.driftX], y: [0, p.burstY, 24, 110, 280, 560, 900], opacity: [0, 1, 1, 1, 0.92, 0.75, 0], rotate: [p.rotateStart, p.rotateStart + 90, p.rotateStart - 110, p.rotateStart + 180, p.rotateEnd], scale: [0.7, 1.1, 1, 1, 0.95, 0.9, 0.85] }} transition={{ duration: p.duration, delay: p.delay, ease: "easeOut", times: [0, 0.08, 0.18, 0.38, 0.62, 0.82, 1] }} />)}
    </div>
  );
}

function QuantityBadge({ qty, color }) {
  const soldOut = qty === 0;
  return (
    <div style={{ position: "absolute", top: 8, right: 8, minWidth: 48, height: 48, padding: "0 12px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 9999, background: soldOut ? "rgba(229,231,235,0.96)" : "rgba(0,0,0,0.82)", color: soldOut ? "#6b7280" : color, fontWeight: 900, fontSize: 28, border: "1px solid rgba(255,255,255,0.16)", boxShadow: soldOut ? "0 2px 8px rgba(0,0,0,0.12)" : `0 0 12px ${color}, 0 0 28px ${color}` }}>
      <AnimatePresence mode="wait">
        <motion.span key={qty} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: [1.4, 1], opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.25 }} style={{ textShadow: soldOut ? "none" : `0 0 12px ${color}, 0 0 30px ${color}` }}>
          x{qty}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function HitCard({ hit, onHit, hitFx, clearHitFx, vanishFx, compact = false, ultraCompact = false, disableClicks = false }) {
  const style = tierStyles[hit.tier] || tierStyles.Standard;
  const soldOut = hit.qty === 0;
  return (
    <motion.div key={hit.id} layout initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.6, y: -10, filter: "blur(8px)" }} transition={{ type: "spring", stiffness: 260, damping: 24 }}>
      <div onClick={() => !disableClicks && onHit(hit.id)} style={{ position: "relative", overflow: "hidden", borderRadius: ultraCompact ? 10 : compact ? 12 : 16, border: style.border, backdropFilter: "blur(6px)", background: soldOut ? "rgba(240,240,240,0.9)" : "rgba(255,255,255,0.95)", boxShadow: `${style.glow}, 0 0 40px rgba(168,85,247,0.18)${hitFx ? ", 0 0 60px rgba(255,255,255,0.35)" : ""}`, cursor: soldOut || disableClicks ? "default" : "pointer", userSelect: "none", opacity: soldOut ? 0.88 : 1, pointerEvents: disableClicks ? "none" : "auto" }}>
        {hitFx && <BurstEffect onDone={() => clearHitFx(hit.id)} />}
        {vanishFx && <VanishEffect />}
        <motion.div animate={hitFx ? { scale: [1, 1.15, 0.92, 1.08, 1], rotate: [0, -2, 2, -1, 0] } : { scale: 1, rotate: 0 }} transition={{ duration: 0.42, ease: "easeOut" }}>
          <div style={{ position: "relative", height: ultraCompact ? 96 : compact ? 120 : 180 }}>
            <img src={hit.image} alt={hit.title} loading="eager" onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80"; }} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: soldOut ? "rgba(220,220,220,0.9)" : "rgba(255,255,255,0.9)", filter: soldOut ? "grayscale(1) brightness(0.75)" : "none" }} />
            <div style={{ position: "absolute", inset: 0, background: soldOut ? "linear-gradient(to top, rgba(17,24,39,0.25), rgba(17,24,39,0.05), rgba(17,24,39,0))" : "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.18), rgba(0,0,0,0.05))" }} />
            {!compact && !ultraCompact && <div style={{ position: "absolute", top: 8, left: 8 }}><span style={pillStyle(style.badge)}>{hit.tier}</span></div>}
            <QuantityBadge qty={hit.qty} color={style.qtyColor} />
            {soldOut && <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(-12deg)", background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "white", fontWeight: 900, fontSize: ultraCompact ? 13 : compact ? 16 : 22, letterSpacing: "0.06em", padding: ultraCompact ? "6px 10px" : compact ? "8px 12px" : "10px 18px", borderRadius: 12, boxShadow: "0 8px 20px rgba(0,0,0,0.35)", zIndex: 12, textTransform: "uppercase", whiteSpace: "nowrap" }}>BANGED OUT!</div>}
          </div>
          <div style={{ padding: ultraCompact ? 6 : compact ? 8 : 12, background: soldOut ? "rgba(230,230,230,0.95)" : "rgba(255,255,255,0.95)" }}>
            <div style={{ minHeight: ultraCompact ? 28 : compact ? 34 : 48, fontSize: ultraCompact ? 11 : compact ? 15 : 20, fontWeight: 800, textTransform: "uppercase", letterSpacing: ultraCompact ? "-0.01em" : compact ? "0em" : "0.01em", lineHeight: ultraCompact ? 1 : compact ? 1.05 : 1.15, color: soldOut ? "rgba(255,255,255,0.72)" : "#fff", display: "flex", alignItems: "flex-start" }}>{hit.title}</div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function PokePlanetLiveWall() {
  const isBrowser = typeof window !== "undefined";
  const params = new URLSearchParams(isBrowser ? window.location.search : "");
  const mode = params.get("mode") || "operator";
  const isOperatorMode = mode === "operator";
  const isDisplayMode = mode === "display";
  const isMobilePreview = mode === "mobile";
  const isStreamMode = mode === "stream" || mode === "display";

  const [sheetUrl, setSheetUrl] = useState(SHEET_CSV_URL);
  const [baseHits, setBaseHits] = useState(DEMO_HITS);
  const [hits, setHits] = useState(DEMO_HITS);
  const [hitFx, setHitFx] = useState({});
  const [vanishFx, setVanishFx] = useState({});
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [columns, setColumns] = useState(3);
  const [syncStatus, setSyncStatus] = useState("Connecting...");
  const [sortByTier, setSortByTier] = useState(true);
  const [undoStack, setUndoStack] = useState([]);
  const [selectedHitId, setSelectedHitId] = useState("");
  const [manualQty, setManualQty] = useState(0);
  const channelRef = useRef(null);
  const initialLoadRef = useRef(false);

  const totalRemaining = useMemo(() => hits.reduce((sum, hit) => sum + hit.qty, 0), [hits]);
  const visibleHits = useMemo(() => (isStreamMode ? sortHitsForStream(hits, sortByTier) : hits), [hits, isStreamMode, sortByTier]);

  const saveFallbackState = (nextHits, nextBaseHits = null, nextColumns = columns, nextSortByTier = sortByTier) => {
    if (!isBrowser) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ hits: nextHits, columns: nextColumns, sortByTier: nextSortByTier }));
    if (nextBaseHits) window.localStorage.setItem(BASE_HITS_KEY, JSON.stringify(nextBaseHits));
  };

  const pushStateToSupabase = async (nextHits, nextBaseHits = null, nextColumns = columns, nextSortByTier = sortByTier, effectTick = null) => {
    const payload = {
      id: SESSION_ID,
      state: { hits: nextHits, baseHits: nextBaseHits || baseHits, columns: nextColumns, sortByTier: nextSortByTier, effectTick },
      updated_at: new Date().toISOString(),
    };
    const { error: upsertError } = await supabase.from("wall_sessions").upsert(payload, { onConflict: "id" });
    if (upsertError) throw upsertError;
  };

  const syncState = async (nextHits, nextBaseHits = null, nextColumns = columns, nextSortByTier = sortByTier, effectTick = null) => {
    saveFallbackState(nextHits, nextBaseHits, nextColumns, nextSortByTier);
    try {
      await pushStateToSupabase(nextHits, nextBaseHits, nextColumns, nextSortByTier, effectTick);
      setSyncStatus("Live sync connected");
    } catch (err) {
      console.error(err);
      setSyncStatus("Using local fallback sync");
    }
  };

  useEffect(() => {
    if (!isBrowser || initialLoadRef.current) return;
    initialLoadRef.current = true;
    const boot = async () => {
      let hydrated = false;
      try {
        const { data, error: fetchError } = await supabase.from("wall_sessions").select("state").eq("id", SESSION_ID).maybeSingle();
        if (fetchError) throw fetchError;
        if (data?.state) {
          const state = data.state;
          const nextHits = normalizeHits(Array.isArray(state.hits) ? state.hits : DEMO_HITS);
          const nextBaseHits = normalizeHits(Array.isArray(state.baseHits) ? state.baseHits : nextHits);
          validateHits(nextHits);
          validateHits(nextBaseHits);
          setHits(nextHits);
          setBaseHits(nextBaseHits);
          if (typeof state.columns === "number") setColumns(state.columns);
          if (typeof state.sortByTier === "boolean") setSortByTier(state.sortByTier);
          setSelectedHitId(nextHits[0]?.id || "");
          setManualQty(nextHits[0]?.qty || 0);
          setSyncStatus("Live sync connected");
          hydrated = true;
        }
      } catch (err) {
        console.error(err);
      }
      if (!hydrated) {
        try {
          const savedState = window.localStorage.getItem(STORAGE_KEY);
          const savedBaseHits = window.localStorage.getItem(BASE_HITS_KEY);
          if (savedState) {
            const parsedState = JSON.parse(savedState);
            const parsedHits = normalizeHits(Array.isArray(parsedState.hits) ? parsedState.hits : DEMO_HITS);
            validateHits(parsedHits);
            setHits(parsedHits);
            if (typeof parsedState.columns === "number") setColumns(parsedState.columns);
            if (typeof parsedState.sortByTier === "boolean") setSortByTier(parsedState.sortByTier);
            setSelectedHitId(parsedHits[0]?.id || "");
            setManualQty(parsedHits[0]?.qty || 0);
          }
          if (savedBaseHits) {
            const parsedBaseHits = normalizeHits(JSON.parse(savedBaseHits));
            validateHits(parsedBaseHits);
            setBaseHits(parsedBaseHits);
          }
          setSyncStatus("Using local fallback sync");
        } catch {
          setSyncStatus("Using demo data");
        }
      }
      const channel = supabase.channel("pokeplanet-wall-session").on("postgres_changes", { event: "*", schema: "public", table: "wall_sessions", filter: `id=eq.${SESSION_ID}` }, (payload) => {
        const nextState = payload.new?.state;
        if (!nextState) return;
        const nextHits = normalizeHits(Array.isArray(nextState.hits) ? nextState.hits : []);
        const nextBaseHits = normalizeHits(Array.isArray(nextState.baseHits) ? nextState.baseHits : nextHits);
        try {
          validateHits(nextHits);
          validateHits(nextBaseHits);
          setHits(nextHits);
          setBaseHits(nextBaseHits);
          if (typeof nextState.columns === "number") setColumns(nextState.columns);
          if (typeof nextState.sortByTier === "boolean") setSortByTier(nextState.sortByTier);
          if (typeof nextState.effectTick === "number") setConfettiTrigger(nextState.effectTick);
          saveFallbackState(nextHits, nextBaseHits, nextState.columns ?? columns, nextState.sortByTier ?? sortByTier);
          setSyncStatus("Live sync connected");
        } catch (validationErr) {
          console.error(validationErr);
        }
      }).subscribe((status) => {
        if (status === "SUBSCRIBED") setSyncStatus("Live sync connected");
      });
      channelRef.current = channel;
    };
    boot();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [isBrowser]);

  useEffect(() => {
    if (!selectedHitId && hits[0]) {
      setSelectedHitId(hits[0].id);
      setManualQty(hits[0].qty);
    }
  }, [hits, selectedHitId]);

  const clearHitFx = (id) => {
    setHitFx((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const loadSheet = async () => {
    if (!sheetUrl.trim()) {
      setError("Add your published Google Sheets CSV URL first.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const joiner = sheetUrl.includes("?") ? "&" : "?";
      const response = await fetch(sheetUrl.trim() + joiner + "t=" + Date.now());
      if (!response.ok) throw new Error("Failed to load sheet");
      const text = await response.text();
      const parsed = normalizeHits(parseCsv(text));
      validateHits(parsed);
      setBaseHits(parsed);
      setHits(parsed);
      setHitFx({});
      setVanishFx({});
      setConfettiTrigger(0);
      setUndoStack([]);
      setSelectedHitId(parsed[0]?.id || "");
      setManualQty(parsed[0]?.qty || 0);
      await syncState(parsed, parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load sheet");
    } finally {
      setIsLoading(false);
    }
  };

  const handleHit = async (id) => {
    const clicked = hits.find((hit) => hit.id === id);
    if (!clicked || clicked.qty === 0) return;
    const nextEffectTick = Date.now();
    setConfettiTrigger(nextEffectTick);
    setHitFx((prev) => ({ ...prev, [id]: nextEffectTick }));
    setUndoStack((prev) => [...prev, hits]);
    if (clicked.qty === 1) {
      setVanishFx((prev) => ({ ...prev, [id]: true }));
      window.setTimeout(() => {
        setVanishFx((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 320);
    }
    const nextHits = applyHitToHits(hits, id);
    setHits(nextHits);
    const selected = nextHits.find((hit) => hit.id === selectedHitId);
    if (selected) setManualQty(selected.qty);
    await syncState(nextHits, null, columns, sortByTier, nextEffectTick);
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    const nextUndo = undoStack.slice(0, -1);
    setUndoStack(nextUndo);
    setHits(previous);
    const selected = previous.find((hit) => hit.id === selectedHitId);
    if (selected) setManualQty(selected.qty);
    await syncState(previous);
  };

  const resetWall = async () => {
    setHits(baseHits);
    setHitFx({});
    setVanishFx({});
    setConfettiTrigger(0);
    setUndoStack([]);
    const selected = baseHits.find((hit) => hit.id === selectedHitId) || baseHits[0];
    if (selected) {
      setSelectedHitId(selected.id);
      setManualQty(selected.qty);
    }
    await syncState(baseHits, baseHits);
  };

  const updateColumns = async (value) => {
    setColumns(value);
    await syncState(hits, null, value, sortByTier);
  };

  const toggleTierSort = async () => {
    const next = !sortByTier;
    setSortByTier(next);
    await syncState(hits, null, columns, next);
  };

  const applyManualQuantity = async () => {
    if (!selectedHitId) return;
    setUndoStack((prev) => [...prev, hits]);
    const nextHits = updateHitQuantity(hits, selectedHitId, manualQty);
    setHits(nextHits);
    await syncState(nextHits);
  };

  const selectedHit = hits.find((hit) => hit.id === selectedHitId);
  const displayColumns = Math.max(3, columns);
  const displayRows = Math.max(1, Math.ceil(visibleHits.length / displayColumns));
  const frameHeight = isDisplayMode
    ? `${Math.min(78, 14 + displayRows * 14)}vh`
    : isStreamMode
      ? "44vh"
      : "auto";
  const gridColumns = isDisplayMode ? `repeat(${displayColumns}, 1fr)` : isMobilePreview ? "1fr" : isStreamMode ? `repeat(${displayColumns}, 1fr)` : "repeat(auto-fit, minmax(240px, 1fr))";

  return (
    <div style={{ minHeight: "100vh", color: "white", padding: isDisplayMode ? 4 : 10, fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", backgroundImage: "url('https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=2000&q=80')", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundAttachment: "fixed", backgroundColor: "#020617" }}>
      {confettiTrigger !== 0 && <ConfettiLayer trigger={confettiTrigger} />}
      <div style={{ maxWidth: isMobilePreview ? 430 : isDisplayMode ? 860 : 1800, margin: "0 auto" }}>
        {!isDisplayMode && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "start", marginBottom: 12 }}>
              <div style={{ padding: "12px 14px", borderRadius: 16, border: "1px solid rgba(34,211,238,0.18)", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }}>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em" }}>PokePlanet Live Wall</div>
                <div style={{ fontSize: 18, color: "#cbd5e1", marginTop: 6 }}>Total Hits Left: <span style={{ color: "#67e8f9", fontWeight: 800 }}>{totalRemaining}</span></div>
                <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 8 }}>Sync: <strong>{syncStatus}</strong></div>
                <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 4 }}>Modes: <strong>?mode=display</strong> for OBS, <strong>?mode=mobile</strong> for phone preview</div>
              </div>
              <button onClick={handleUndo} disabled={undoStack.length === 0} style={{ border: 0, borderRadius: 12, background: undoStack.length === 0 ? "#64748b" : "#f59e0b", color: "white", fontWeight: 900, fontSize: 16, padding: "12px 16px", cursor: undoStack.length === 0 ? "default" : "pointer" }}>Undo Last Hit</button>
              <button onClick={resetWall} style={{ border: 0, borderRadius: 12, background: "#22d3ee", color: "#020617", fontWeight: 900, fontSize: 18, padding: "12px 16px", cursor: "pointer", boxShadow: "0 6px 20px rgba(34,211,238,0.22)" }}>Reset Wall</button>
            </div>
            {!isMobilePreview && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 10, alignItems: "center", marginBottom: 14, padding: 12, borderRadius: 16, border: "1px solid rgba(217,70,239,0.18)", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }}>
                  <input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="Paste your published Google Sheet CSV URL" style={{ width: "100%", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "white", padding: "12px 14px", fontSize: 14, outline: "none" }} />
                  <select value={columns} onChange={(e) => updateColumns(Number(e.target.value))} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "white", padding: "12px 14px", fontSize: 14, outline: "none" }}>
                    <option value={2}>2 cols</option>
                    <option value={3}>3 cols</option>
                    <option value={4}>4 cols</option>
                  </select>
                  <button onClick={toggleTierSort} style={{ border: 0, borderRadius: 12, background: sortByTier ? "#8b5cf6" : "#475569", color: "white", fontWeight: 900, fontSize: 14, padding: "12px 16px", cursor: "pointer" }}>{sortByTier ? "Tier Sort On" : "Tier Sort Off"}</button>
                  <button onClick={loadSheet} disabled={isLoading} style={{ border: 0, borderRadius: 12, background: isLoading ? "#64748b" : "#a855f7", color: "white", fontWeight: 900, fontSize: 14, padding: "12px 16px", cursor: isLoading ? "default" : "pointer" }}>{isLoading ? "Loading..." : "Reload Sheet"}</button>
                  {error ? <div style={{ gridColumn: "1 / -1", color: "#fda4af", fontSize: 13 }}>{error}</div> : null}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center", marginBottom: 14, padding: 12, borderRadius: 16, border: "1px solid rgba(34,211,238,0.18)", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(8px)" }}>
                  <select value={selectedHitId} onChange={(e) => { const id = e.target.value; setSelectedHitId(id); const hit = hits.find((item) => item.id === id); setManualQty(hit ? hit.qty : 0); }} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "white", padding: "12px 14px", fontSize: 14, outline: "none" }}>
                    {hits.map((hit) => <option key={hit.id} value={hit.id}>{hit.title}</option>)}
                  </select>
                  <input type="number" min="0" value={manualQty} onChange={(e) => setManualQty(Math.max(0, Number.parseInt(e.target.value || "0", 10) || 0))} style={{ width: 120, borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "white", padding: "12px 14px", fontSize: 14, outline: "none" }} />
                  <button onClick={applyManualQuantity} disabled={!selectedHit} style={{ border: 0, borderRadius: 12, background: "#10b981", color: "white", fontWeight: 900, fontSize: 14, padding: "12px 16px", cursor: selectedHit ? "pointer" : "default" }}>Apply Qty Edit</button>
                </div>
              </>
            )}
          </>
        )}
        <div style={{ height: frameHeight, overflow: isStreamMode ? "hidden" : "visible" }}>
          <AnimatePresence mode="popLayout">
            <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: isDisplayMode ? 6 : isStreamMode ? 8 : 12, alignItems: "start" }}>
              {visibleHits.map((hit) => <HitCard key={hit.id} hit={hit} onHit={handleHit} hitFx={hitFx[hit.id]} clearHitFx={clearHitFx} vanishFx={vanishFx[hit.id]} compact={isStreamMode || isMobilePreview} ultraCompact={isDisplayMode} disableClicks={isDisplayMode} />)}
            </div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
