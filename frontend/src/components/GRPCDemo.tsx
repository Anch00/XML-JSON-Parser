import axios from "axios";
import React, { useRef, useState } from "react";

interface FilterCriteria {
  field: string;
  operator: string;
  value: string;
}

interface JoinedItem {
  [key: string]: any;
}

interface Attraction {
  name: string;
  description: string;
  url?: string;
}

const GRPCDemo: React.FC = () => {
  const backendPort = 3000;
  const [documents, setDocuments] = useState<string[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<Record<string, boolean>>({});
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string>("");
  const [joined, setJoined] = useState<JoinedItem[]>([]);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string>("");
  const [filtered, setFiltered] = useState<JoinedItem[]>([]);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterError, setFilterError] = useState<string>("");
  const [filters, setFilters] = useState<FilterCriteria[]>([
    { field: "citySlug", operator: "contains", value: "" },
  ]);
  const [streamCity, setStreamCity] = useState<string>("berlin-germany");
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [streamStatus, setStreamStatus] = useState<string>("Idle");
  const [streamError, setStreamError] = useState<string>("");
  const [receivedCount, setReceivedCount] = useState<number>(0);
  const endedRef = useRef<boolean>(false);
  const sseRef = useRef<EventSource | null>(null);

  // Opomba: dokumente zdaj nalagamo ročno z gumbom Osveži (brez auto-load na mount)

  const refreshDocuments = async () => {
    setDocsLoading(true);
    setDocsError("");
    try {
      console.log("[GRPCDemo] Fetching documents...");
      const resp = await axios.get(
        `http://localhost:${backendPort}/grpc/documents`
      );
      setDocuments(resp.data?.documents || []);
      const nextSel: Record<string, boolean> = {};
      (resp.data?.documents || []).forEach((d: string) => {
        nextSel[d] = /^(trips|itinerary|attractions)\.xml$/i.test(d);
      });
      setSelectedDocs(nextSel);
      console.log("[GRPCDemo] Documents:", resp.data?.documents);
    } catch (e: any) {
      console.error("[GRPCDemo] Documents error:", e);
      setDocsError(e?.message || String(e));
    } finally {
      setDocsLoading(false);
    }
  };

  const doJoin = async () => {
    setJoinLoading(true);
    setJoinError("");
    try {
      // preserve the visible documents order
      const sel = (documents || []).filter((d) => selectedDocs[d]);
      const resp = await axios.post(
        `http://localhost:${backendPort}/grpc/join`,
        { selectedFiles: sel }
      );
      const raw: any[] = (resp.data?.items || []).map((x: any) => x?.fields ?? x);
      const items = raw.map((it) => {
        // pick primitive fields
        const flat: Record<string, any> = {};
        Object.keys(it || {}).forEach((k) => {
          const v = (it as any)[k];
          if (v == null) return;
          if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
            flat[k] = v;
          }
        });
        // derive helpful fields from stops if present
        if (Array.isArray(it?.stops)) {
          flat.stopsCount = it.stops.length;
          if (it.stops.length > 0) {
            flat.firstStopName = it.stops[0].name || "";
            flat.firstStopType = it.stops[0].type || "";
          }
        }
        // ensure some columns always exist
        if (Object.keys(flat).length === 0) {
          flat.json = JSON.stringify(it);
        }
        return flat;
      });
      setJoined(items);
      setFiltered(items);
      console.log(
        "[GRPCDemo] Join got",
        items.length,
        "items"
      );
    } catch (e: any) {
      console.error("[GRPCDemo] Join error:", e);
      setJoinError(e?.message || String(e));
    } finally {
      setJoinLoading(false);
    }
  };

  const doFilter = async () => {
    setFilterLoading(true);
    setFilterError("");
    try {
      const resp = await axios.post(
        `http://localhost:${backendPort}/grpc/filter`,
        {
          filters,
          items: joined,
        }
      );
      setFiltered(resp.data?.items || []);
      console.log(
        "[GRPCDemo] Filter got",
        (resp.data?.items || []).length,
        "items"
      );
    } catch (e: any) {
      console.error("[GRPCDemo] Filter error:", e);
      setFilterError(e?.message || String(e));
    } finally {
      setFilterLoading(false);
    }
  };

  const doExportJSON = async () => {
    const resp = await axios.post(
      `http://localhost:${backendPort}/grpc/export`,
      { format: 0, items: filtered },
      { responseType: "arraybuffer" }
    );
    const blob = new Blob([resp.data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "filtrirano.generated.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const doExportXML = async () => {
    const resp = await axios.post(
      `http://localhost:${backendPort}/grpc/export`,
      { format: 1, items: filtered, rootName: "filtrirani-rezultati" },
      { responseType: "arraybuffer" }
    );
    const blob = new Blob([resp.data], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "filtrirano.generated.xml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const startStream = () => {
    stopStream();
    setAttractions([]);
    setReceivedCount(0);
    setStreamError("");
    setStreamStatus("Connecting...");
    endedRef.current = false;
    console.log("[GRPCDemo] Starting stream for", streamCity);
    const url = `http://localhost:${backendPort}/grpc/attractions-stream?citySlug=${encodeURIComponent(
      streamCity
    )}`;
    const sse = new EventSource(url);
    sse.onopen = () => {
      console.log("[GRPCDemo] SSE opened");
      setStreamStatus("Connected. Waiting for items...");
    };
    sse.onmessage = (ev) => {
      try {
        const a: Attraction = JSON.parse(ev.data);
        setAttractions((prev) => {
          const next = [...prev, a];
          setReceivedCount(next.length);
          return next;
        });
        // On first item, update status
        setStreamStatus((prev) =>
          prev.includes("Connected") ? "Receiving items..." : prev
        );
      } catch (e) {
        console.warn("[GRPCDemo] SSE parse error", e);
      }
    };
    sse.addEventListener("end", () => {
      console.log("[GRPCDemo] SSE ended");
      endedRef.current = true;
      setStreamStatus("Completed");
      stopStream();
    });
    sse.onerror = (err) => {
      console.error("[GRPCDemo] SSE error", err);
      const closed =
        (sse as any).readyState === (EventSource as any).CLOSED ||
        (sseRef.current &&
          (sseRef.current as any).readyState === (EventSource as any).CLOSED);
      if (endedRef.current || closed || receivedCount > 0) {
        setStreamStatus("Completed");
        setStreamError("");
        stopStream();
      } else {
        setStreamError("Stream error (see console)");
        setStreamStatus("Error");
        stopStream();
      }
    };
    sseRef.current = sse;
  };

  const stopStream = () => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
  };

  const updateFilter = (
    idx: number,
    field: keyof FilterCriteria,
    value: string
  ) => {
    const next = [...filters];
    next[idx] = { ...next[idx], [field]: value } as FilterCriteria;
    setFilters(next);
  };

  const addFilter = () =>
    setFilters((f) => [...f, { field: "", operator: "contains", value: "" }]);
  const removeFilter = (idx: number) =>
    setFilters((f) => f.filter((_, i) => i !== idx));

  const availableFields = joined.length ? Object.keys(joined[0]).sort() : [];

  return (
    <div className='container'>
      <div className='header'>
        <h1>gRPC Demo</h1>
        <div className='small'>
          Nova funkcionalnost preko gRPC (List/Join/Filter/Export + Streaming)
        </div>
      </div>

      <div className='card'>
        <h3>Dokumenti v data/ (gRPC ListDocuments)</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className='btn secondary'
            onClick={refreshDocuments}
            disabled={docsLoading}>
            {docsLoading ? "Nalagam..." : "Osveži"}
          </button>
          <span className='small'>{documents.length} datotek</span>
        </div>
        {docsError && <div className='error'>Napaka: {docsError}</div>}
        {!docsLoading && documents.length === 0 && !docsError && (
          <div className='small'>Ni najdenih datotek v mapi data/</div>
        )}
        <ul>
          {documents.map((d) => (
            <li key={d} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type='checkbox'
                checked={!!selectedDocs[d]}
                onChange={(e) =>
                  setSelectedDocs((prev) => ({ ...prev, [d]: e.target.checked }))
                }
              />
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className='card'>
        <h3>Poveži podatke (gRPC JoinData)</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className='btn' onClick={doJoin} disabled={joinLoading}>
            {joinLoading ? "Povezujem..." : "Poveži"}
          </button>
          <span className='small'>
            {joined.length > 0 ? `Skupno: ${joined.length}` : ""}
          </span>
        </div>
        {joinError && <div className='error'>Napaka: {joinError}</div>}
        {joined.length > 0 && (
          <div style={{ overflowX: "auto", marginTop: 8 }}>
            <table className='table'>
              <thead>
                <tr>
                  {Object.keys(joined[0])
                    .slice(0, 8)
                    .map((k) => (
                      <th key={k}>{k}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {joined.slice(0, 5).map((row, idx) => (
                  <tr key={idx}>
                    {Object.keys(joined[0])
                      .slice(0, 8)
                      .map((k) => (
                        <td key={k}>{String(row[k] ?? "")}</td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className='small'>
              Prikazujem 5 od {joined.length} (vzorec)
            </div>
          </div>
        )}
      </div>

      {joined.length > 0 && (
        <div className='card'>
          <h3>Filtri (gRPC FilterData)</h3>
          {filters.map((f, i) => (
            <div key={i} className='filter-row'>
              <select
                className='input'
                value={f.field}
                onChange={(e) => updateFilter(i, "field", e.target.value)}>
                <option value=''>-- polje --</option>
                {availableFields.map((fld) => (
                  <option key={fld} value={fld}>
                    {fld}
                  </option>
                ))}
              </select>
              <select
                className='input'
                value={f.operator}
                onChange={(e) => updateFilter(i, "operator", e.target.value)}>
                <option value='contains'>vsebuje</option>
                <option value='equals'>=</option>
                <option value='greaterThan'>&gt;</option>
                <option value='lessThan'>&lt;</option>
                <option value='greaterEqual'>≥</option>
                <option value='lessEqual'>≤</option>
              </select>
              <input
                className='input'
                value={f.value}
                onChange={(e) => updateFilter(i, "value", e.target.value)}
              />
              <button
                className='btn secondary'
                onClick={() => removeFilter(i)}
                disabled={filters.length === 1}>
                Odstrani
              </button>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 8,
              alignItems: "center",
            }}>
            <button className='btn' onClick={doFilter} disabled={filterLoading}>
              {filterLoading ? "Filtriram..." : "Uporabi"}
            </button>
            <button className='btn secondary' onClick={addFilter}>
              Dodaj filter
            </button>
            <span className='small'>Rezultatov: {filtered.length}</span>
          </div>
          {filterError && <div className='error'>Napaka: {filterError}</div>}
        </div>
      )}

      {filtered.length > 0 && (
        <div className='card'>
          <h3>Izvoz (gRPC ExportData)</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button className='btn' onClick={doExportJSON}>
              JSON
            </button>
            <button className='btn secondary' onClick={doExportXML}>
              XML
            </button>
          </div>
        </div>
      )}

      <div className='card' style={{ marginTop: 20 }}>
        <h3>Pretakanje znamenitosti (gRPC StreamAttractions)</h3>
        <div className='row' style={{ gap: 8, alignItems: "center" }}>
          <label className='small'>Mesto:</label>
          <input
            className='input'
            value={streamCity}
            onChange={(e) => setStreamCity(e.target.value)}
          />
          <button className='btn' onClick={startStream}>
            Start stream
          </button>
          <button className='btn secondary' onClick={stopStream}>
            Stop
          </button>
          <span className='small'>
            Status: {streamStatus} | Prejeto: {receivedCount}
          </span>
        </div>
        <div className='small' style={{ marginTop: 6 }}>
          Nasvet: rezultat je odvisen od datoteke v{" "}
          <code>data/attractions.&lt;mesto&gt;.json</code>. Če datoteka za
          izbrano mesto ne obstaja, se uporabi zadnje scrapanje (datoteka{" "}
          <code>data/attractions.json</code>) ali demo podatki.
        </div>
        {streamError && <div className='error'>Napaka: {streamError}</div>}
        {streamStatus === "Connected. Waiting for items..." && (
          <div className='small'>
            Prvi rezultati lahko trajajo 10–20s (zaganjanje brskalnika).
          </div>
        )}
        <ul className='attraction-list'>
          {attractions.map((a, i) => (
            <li key={i} className='attraction-item'>
              {a.url ? (
                <a
                  href={a.url}
                  target='_blank'
                  rel='noreferrer'
                  className='attraction-link'>
                  <strong>{a.name}</strong>
                </a>
              ) : (
                <strong>{a.name}</strong>
              )}
              {a.description && (
                <div className='small' style={{ marginTop: 4 }}>
                  {a.description}
                </div>
              )}
            </li>
          ))}
        </ul>
        {receivedCount === 0 && streamStatus !== "Idle" && !streamError && (
          <div className='small'>Čakam na elemente...</div>
        )}
      </div>
    </div>
  );
};

export default GRPCDemo;
