import axios from "axios";
import React, { useRef, useState } from "react";
import { FaFilter, FaLink, FaServer, FaStream, FaSync } from "react-icons/fa";

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
      const raw: any[] = (resp.data?.items || []).map(
        (x: any) => x?.fields ?? x
      );
      const items = raw.map((it) => {
        // pick primitive fields
        const flat: Record<string, any> = {};
        Object.keys(it || {}).forEach((k) => {
          const v = (it as any)[k];
          if (v == null) return;
          if (
            typeof v === "string" ||
            typeof v === "number" ||
            typeof v === "boolean"
          ) {
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
      console.log("[GRPCDemo] Join got", items.length, "items");
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
    <div className='max-w-6xl mx-auto'>
      <div className='bg-gray-800 rounded-lg shadow-lg p-6 mb-6'>
        <h2 className='text-3xl font-bold text-teal-400 mb-2 flex items-center'>
          <FaServer className='mr-3' /> gRPC Demo
        </h2>
        <p className='text-gray-400 mb-6'>
          New functionality via gRPC (List/Join/Filter/Export + Streaming)
        </p>

        <div className='bg-gray-700 rounded-lg p-4 mb-4'>
          <h3 className='text-xl font-semibold text-white mb-3'>
            Documents in data/ (gRPC ListDocuments)
          </h3>
          <div className='flex gap-3 items-center mb-3'>
            <button
              className='bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg flex items-center transition-colors'
              onClick={refreshDocuments}
              disabled={docsLoading}>
              <FaSync className='mr-2' />
              {docsLoading ? "Loading..." : "Refresh"}
            </button>
            <span className='text-gray-400 text-sm'>
              {documents.length} files
            </span>
          </div>
          {docsError && (
            <div className='bg-red-900 border border-red-700 text-red-200 px-3 py-2 rounded-lg text-sm mb-3'>
              Error: {docsError}
            </div>
          )}
          {!docsLoading && documents.length === 0 && !docsError && (
            <div className='text-gray-400 text-sm'>
              No files found in data/ folder
            </div>
          )}
          <div className='space-y-2'>
            {documents.map((d) => (
              <label
                key={d}
                className='flex items-center gap-3 text-white hover:text-teal-300 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={!!selectedDocs[d]}
                  onChange={(e) =>
                    setSelectedDocs((prev) => ({
                      ...prev,
                      [d]: e.target.checked,
                    }))
                  }
                  className='w-4 h-4 text-teal-500 bg-gray-600 border-gray-500 rounded focus:ring-teal-400'
                />
                <span>{d}</span>
              </label>
            ))}
          </div>
        </div>

        <div className='bg-gray-700 rounded-lg p-4 mb-4'>
          <h3 className='text-xl font-semibold text-white mb-3'>
            Join Data (gRPC JoinData)
          </h3>
          <div className='flex gap-3 items-center mb-3'>
            <button
              className='bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded-lg flex items-center transition-colors'
              onClick={doJoin}
              disabled={joinLoading}>
              <FaLink className='mr-2' />
              {joinLoading ? "Joining..." : "Join"}
            </button>
            <span className='text-gray-400 text-sm'>
              {joined.length > 0 ? `Total: ${joined.length}` : ""}
            </span>
          </div>
          {joinError && (
            <div className='bg-red-900 border border-red-700 text-red-200 px-3 py-2 rounded-lg text-sm mb-3'>
              Error: {joinError}
            </div>
          )}
          {joined.length > 0 && (
            <div className='overflow-x-auto mt-3'>
              <table className='w-full text-sm text-left text-gray-300'>
                <thead className='text-xs uppercase bg-gray-600 text-gray-300'>
                  <tr>
                    {Object.keys(joined[0])
                      .slice(0, 8)
                      .map((k) => (
                        <th key={k} className='px-4 py-3'>
                          {k}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {joined.slice(0, 5).map((row, idx) => (
                    <tr
                      key={idx}
                      className='bg-gray-700 border-b border-gray-600 hover:bg-gray-600'>
                      {Object.keys(joined[0])
                        .slice(0, 8)
                        .map((k) => (
                          <td key={k} className='px-4 py-3'>
                            {String(row[k] ?? "")}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className='text-gray-400 text-sm mt-2'>
                Showing 5 of {joined.length} (sample)
              </div>
            </div>
          )}
        </div>

        {joined.length > 0 && (
          <div className='bg-gray-700 rounded-lg p-4 mb-4'>
            <h3 className='text-xl font-semibold text-white mb-3 flex items-center'>
              <FaFilter className='mr-2' /> Filters (gRPC FilterData)
            </h3>
            <div className='space-y-3'>
              {filters.map((f, i) => (
                <div key={i} className='flex gap-3 items-center flex-wrap'>
                  <select
                    className='bg-gray-600 text-white border border-gray-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400'
                    value={f.field}
                    onChange={(e) => updateFilter(i, "field", e.target.value)}>
                    <option value=''>-- field --</option>
                    {availableFields.map((fld) => (
                      <option key={fld} value={fld}>
                        {fld}
                      </option>
                    ))}
                  </select>
                  <select
                    className='bg-gray-600 text-white border border-gray-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400'
                    value={f.operator}
                    onChange={(e) =>
                      updateFilter(i, "operator", e.target.value)
                    }>
                    <option value='contains'>contains</option>
                    <option value='equals'>=</option>
                    <option value='greaterThan'>&gt;</option>
                    <option value='lessThan'>&lt;</option>
                    <option value='greaterEqual'>≥</option>
                    <option value='lessEqual'>≤</option>
                  </select>
                  <input
                    className='bg-gray-600 text-white border border-gray-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 flex-1 min-w-[150px]'
                    value={f.value}
                    onChange={(e) => updateFilter(i, "value", e.target.value)}
                  />
                  <button
                    className='bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors'
                    onClick={() => removeFilter(i)}
                    disabled={filters.length === 1}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className='flex gap-3 mt-4 items-center flex-wrap'>
              <button
                className='bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors'
                onClick={doFilter}
                disabled={filterLoading}>
                {filterLoading ? "Filtering..." : "Apply"}
              </button>
              <button
                className='bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors'
                onClick={addFilter}>
                Add Filter
              </button>
              <span className='text-gray-400 text-sm'>
                Results: {filtered.length}
              </span>
            </div>
            {filterError && (
              <div className='bg-red-900 border border-red-700 text-red-200 px-3 py-2 rounded-lg text-sm mt-3'>
                Error: {filterError}
              </div>
            )}
          </div>
        )}

        {filtered.length > 0 && (
          <div className='bg-gray-700 rounded-lg p-4 mb-4'>
            <h3 className='text-xl font-semibold text-white mb-3'>
              Export (gRPC ExportData)
            </h3>
            <div className='flex gap-3'>
              <button
                className='bg-teal-500 hover:bg-teal-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors'
                onClick={doExportJSON}>
                Export JSON
              </button>
              <button
                className='bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-lg transition-colors'
                onClick={doExportXML}>
                Export XML
              </button>
            </div>
          </div>
        )}

        <div className='bg-gray-700 rounded-lg p-4'>
          <h3 className='text-xl font-semibold text-white mb-3 flex items-center'>
            <FaStream className='mr-2' /> Stream Attractions (gRPC
            StreamAttractions)
          </h3>
          <div className='flex gap-3 items-center flex-wrap mb-3'>
            <div className='flex-1 min-w-[200px]'>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                City
              </label>
              <input
                className='w-full bg-gray-600 text-white border border-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400'
                value={streamCity}
                onChange={(e) => setStreamCity(e.target.value)}
                placeholder='e.g., berlin-germany'
              />
            </div>
            <div className='flex gap-3 items-end'>
              <button
                className='bg-teal-500 hover:bg-teal-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors'
                onClick={startStream}>
                Start Stream
              </button>
              <button
                className='bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors'
                onClick={stopStream}>
                Stop
              </button>
            </div>
          </div>
          <div className='flex gap-4 text-sm text-gray-400 mb-3'>
            <span>
              Status: <span className='text-teal-300'>{streamStatus}</span>
            </span>
            <span>
              Received: <span className='text-teal-300'>{receivedCount}</span>
            </span>
          </div>
          <div className='text-gray-400 text-sm mb-3'>
            Note: Results depend on{" "}
            <code className='bg-gray-900 px-2 py-1 rounded text-teal-300'>
              data/attractions.&lt;city&gt;.json
            </code>{" "}
            file. If file doesn't exist, uses latest scraping (
            <code className='bg-gray-900 px-2 py-1 rounded text-teal-300'>
              data/attractions.json
            </code>
            ) or demo data.
          </div>
          {streamError && (
            <div className='bg-red-900 border border-red-700 text-red-200 px-3 py-2 rounded-lg text-sm mb-3'>
              Error: {streamError}
            </div>
          )}
          {streamStatus === "Connected. Waiting for items..." && (
            <div className='text-yellow-400 text-sm mb-3'>
              First results may take 10–20s (browser startup)
            </div>
          )}
          {attractions.length > 0 && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3 mt-4'>
              {attractions.map((a, i) => (
                <div
                  key={i}
                  className='bg-gray-600 rounded-lg p-3 hover:bg-gray-500 transition-colors'>
                  {a.url ? (
                    <a
                      href={a.url}
                      target='_blank'
                      rel='noreferrer'
                      className='text-teal-400 hover:text-teal-300 font-semibold text-lg block mb-1'>
                      {a.name}
                    </a>
                  ) : (
                    <div className='text-white font-semibold text-lg mb-1'>
                      {a.name}
                    </div>
                  )}
                  {a.description && (
                    <div className='text-gray-300 text-sm'>{a.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          {receivedCount === 0 && streamStatus !== "Idle" && !streamError && (
            <div className='text-gray-400 text-sm'>Waiting for elements...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GRPCDemo;
