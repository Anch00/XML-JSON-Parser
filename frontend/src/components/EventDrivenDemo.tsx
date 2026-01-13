import axios from "axios";
import React, { useEffect, useRef, useState } from "react";

interface ProcessedEvent {
  event: { type: string; id: string; timestamp: string; data?: any };
  result: { status: string; message: string; action: string };
  processedAt: string;
}

const EventDrivenDemo: React.FC = () => {
  const backendPort = 3000;
  const [connected, setConnected] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [stats, setStats] = useState<{ messageCount?: number; consumerCount?: number } | null>(null);
  const [listening, setListening] = useState(false);
  const [events, setEvents] = useState<ProcessedEvent[]>([]);
  const [attractions, setAttractions] = useState<{ name: string; description?: string; visits?: number }[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  const [eventType, setEventType] = useState("attraction-added");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [selectedName, setSelectedName] = useState<string>("");

  const esRef = useRef<EventSource | null>(null);

  const checkHealth = async () => {
    setChecking(true);
    setError("");
    try {
      const r = await axios.get(`http://localhost:${backendPort}/api/events/health`);
      setConnected(!!r.data?.available);
    } catch (e: any) {
      setConnected(false);
      setError(e?.message || String(e));
    } finally {
      setChecking(false);
    }
  };

  const fetchStats = async () => {
    try {
      const r = await axios.get(`http://localhost:${backendPort}/api/events/stats`);
      setStats({ messageCount: r.data?.messageCount, consumerCount: r.data?.consumerCount });
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || String(e));
    }
  };

  const fetchAttractions = async () => {
    try {
      const r = await axios.get(`http://localhost:${backendPort}/api/events/attractions`);
      setAttractions(r.data?.items || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || String(e));
    }
  };

  const publish = async () => {
    // For delete/update, if dropdown selected, ensure name is set
    if ((eventType === "attraction-deleted" || eventType === "attraction-updated") && selectedName && !name.trim()) {
      setName(selectedName);
    }
    if (!name.trim()) { setError("Ime atrakcije je obvezno"); return; }
    setPublishing(true);
    setError("");
    try {
      const payload: any = { name, description: desc || undefined };
      if (eventType === "attraction-updated" && selectedName && selectedName !== name) {
        payload.originalName = selectedName;
      }
      await axios.post(`http://localhost:${backendPort}/api/events/publish`, { type: eventType, data: payload });
      setName(""); setDesc("");
      setSelectedName("");
      fetchStats();
      fetchAttractions();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || String(e));
    } finally {
      setPublishing(false);
    }
  };

  const startListening = () => {
    if (esRef.current) return;
    const es = new EventSource(`http://localhost:${backendPort}/api/events/subscribe`);
    es.onopen = () => setListening(true);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        // Handle meta messages: connected/snapshot update state but don't add to events list
        if (data?.type === "connected" || data?.type === "snapshot") {
          if (Array.isArray(data?.state)) setAttractions(data.state);
          return;
        }
        // Only push messages that contain a processed event payload
        if (data?.event) {
          setEvents((prev) => [data, ...prev].slice(0, 30));
        }
        // If state is included, update attractions
        if (Array.isArray(data?.state)) {
          setAttractions(data.state);
        }
      } catch {}
    };
    es.onerror = () => { setListening(false); es.close(); esRef.current = null; };
    esRef.current = es;
  };
  const stopListening = () => { if (esRef.current) { esRef.current.close(); esRef.current = null; setListening(false); } };

  useEffect(() => () => stopListening(), []);

  const label = (t: string) => ({
    "attraction-added": "Dodana atrakcija",
    "attraction-updated": "Posodobljena atrakcija",
    "attraction-deleted": "Izbrisana atrakcija",
    "attraction-visited": "Obisk atrakcije",
  } as any)[t] || t;

  const uiHints = (t: string) => {
    switch (t) {
      case "attraction-added":
        return {
          note: "Ustvari novo atrakcijo.",
          namePh: "Npr. Brandenburška vrata",
          descPh: "Kratek opis (neobvezno)",
          descDisabled: false,
        };
      case "attraction-updated":
        return {
          note: "Posodobi podrobnosti obstoječe atrakcije.",
          namePh: "Ime obstoječe atrakcije",
          descPh: "Nov opis (neobvezno)",
          descDisabled: false,
        };
      case "attraction-deleted":
        return {
          note: "Označi atrakcijo kot izbrisano.",
          namePh: "Ime atrakcije za izbris",
          descPh: "Opis ni potreben",
          descDisabled: true,
        };
      case "attraction-visited":
        return {
          note: "Zabeleži obisk atrakcije.",
          namePh: "Ime obiskane atrakcije",
          descPh: "Dodatna opomba (neobvezno)",
          descDisabled: false,
        };
      default:
        return { note: "", namePh: "Ime", descPh: "Opis", descDisabled: false };
    }
  };
  const hints = uiHints(eventType);

  return (
    <div className="container">
      <div className="header">
        <h1>RabbitMQ Events</h1>
        <div className="small">Dogodkovno vodena arhitektura z RabbitMQ (AMQP) + SSE</div>
      </div>

      <div className="card">
        <h3>Stanje povezave</h3>
        <button className="btn secondary" onClick={checkHealth} disabled={checking}>{checking ? "Preverjam..." : "Preveri povezavo"}</button>
        {connected === true && <span className="small" style={{ color: "green", marginLeft: 8 }}>✓ Povezano</span>}
        {connected === false && <span className="small" style={{ color: "red", marginLeft: 8 }}>✗ Ni povezano</span>}
        {stats && <span className="small" style={{ marginLeft: 16 }}>Queue: {stats.messageCount || 0} | Consumers: {stats.consumerCount || 0}</span>}
        <button className="btn secondary" style={{ marginLeft: 12 }} onClick={fetchStats}>Osveži statistiko</button>
        {error && <div className="error" style={{ marginTop: 6 }}>{error}</div>}
      </div>

      <div className="card">
        <h3>Objavi dogodek</h3>
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <label className="small">Tip:</label>
          <select className="input" value={eventType} onChange={(e) => setEventType(e.target.value)}>
            <option value="attraction-added">Dodana atrakcija</option>
            <option value="attraction-updated">Posodobljena atrakcija</option>
            <option value="attraction-deleted">Izbrisana atrakcija</option>
            <option value="attraction-visited">Obisk atrakcije</option>
          </select>
          {(eventType === "attraction-deleted" || eventType === "attraction-updated") && (
            <>
              <label className="small">Izberi atrakcijo:</label>
              <select className="input" value={selectedName} onChange={(e) => {
                const n = e.target.value; setSelectedName(n);
                const item = attractions.find(a => a.name === n);
                if (eventType === "attraction-updated" && item) { setName(item.name); setDesc(item.description || ""); }
                if (eventType === "attraction-deleted") { setName(n); setDesc(""); }
              }}>
                <option value="">(izberi)</option>
                {attractions.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
              </select>
            </>
          )}
          <label className="small">Ime:</label>
          <input className="input" placeholder={hints.namePh} value={name} onChange={(e) => setName(e.target.value)} style={{ minWidth: 220 }} />
          <label className="small" style={{ opacity: hints.descDisabled ? 0.6 : 1 }}>Opis:</label>
          <input className="input" placeholder={hints.descPh} disabled={hints.descDisabled} value={hints.descDisabled ? "" : desc} onChange={(e) => setDesc(e.target.value)} style={{ minWidth: 260, opacity: hints.descDisabled ? 0.6 : 1 }} />
          <button className="btn" onClick={publish} disabled={publishing || !name.trim()}>{publishing ? "Objavljam..." : "Objavi"}</button>
        </div>
        <div className="small" style={{ marginTop: 6 }}>{hints.note} Dogodki gredo v vrsto <code>attraction-events</code>, consumer jih procesira asinhrono in pošlje SSE.</div>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <button className="btn secondary" onClick={fetchAttractions}>Preglej atrakcije</button>
        </div>
      </div>

      <div className="card">
        <h3>Poslušaj (SSE)</h3>
        {!listening ? (
          <button className="btn" onClick={startListening}>▶️ Začni</button>
        ) : (
          <button className="btn secondary" onClick={stopListening}>⏸️ Ustavi</button>
        )}
        {events.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <h4>Procesirani dogodki ({events.length})</h4>
            <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {events.map((e, i) => (
                <div key={i} style={{ border: "1px solid #ddd", borderRadius: 4, padding: 10, background: "#f9f9f9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{label(e.event.type)}</strong>
                    <span className="small">{new Date(e.event.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="small">{e.result.message}</div>
                  {e.event.data?.description && <div className="small" style={{ color: "#666" }}>{e.event.data.description}</div>}
                  <div className="small" style={{ color: "#999" }}>ID: {e.event.id}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {attractions.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <h4>Seznam atrakcij ({attractions.length})</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {attractions.map((a) => (
                <div key={a.name} className="small" style={{ border: "1px dashed #ddd", borderRadius: 4, padding: 6 }}>
                  <strong>{a.name}</strong>
                  {a.description && <span> — {a.description}</span>}
                  {typeof a.visits === "number" && a.visits > 0 && <span style={{ marginLeft: 6 }}>(obiskov: {a.visits})</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        {listening && events.length === 0 && <div className="small" style={{ marginTop: 8, color: "#666" }}>Čakam na dogodke...</div>}
      </div>
    </div>
  );
};

export default EventDrivenDemo;
