import axios from "axios";
import React, { useState } from "react";

interface PipeResponseItem {
  name: string;
  description?: string;
  url?: string;
}

const NamedPipesDemo: React.FC = () => {
  const backendPort = 3000;
  const [citySlug, setCitySlug] = useState<string>("london-england");
  const [limit, setLimit] = useState<number>(5);
  const [available, setAvailable] = useState<null | boolean>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [items, setItems] = useState<PipeResponseItem[]>([]);
  const [meta, setMeta] = useState<{
    citySlug?: string;
    count?: number;
    source?: string;
    sourceUpdatedAt?: string;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const checkHealth = async () => {
    setChecking(true);
    setError("");
    try {
      const res = await axios.get(
        `http://localhost:${backendPort}/api/pipes/health`
      );
      setAvailable(!!res.data?.available);
    } catch (e: any) {
      setAvailable(false);
      setError(e?.message || String(e));
    } finally {
      setChecking(false);
    }
  };

  const fetchAttractions = async () => {
    setLoading(true);
    setError("");
    setItems([]);
    try {
      const res = await axios.post(
        `http://localhost:${backendPort}/api/pipes/attractions`,
        {
          citySlug,
          limit,
        }
      );
      const arr: PipeResponseItem[] = res.data?.items || [];
      setItems(arr);
      setMeta({
        citySlug: res.data?.citySlug,
        count: res.data?.count,
        source: res.data?.source,
        sourceUpdatedAt: res.data?.sourceUpdatedAt,
      });
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='container'>
      <div className='header'>
        <h1>Named Pipes Demo</h1>
        <div className='small'>
          Medprocesna komunikacija prek poimenovanih cevi (Windows) za domeno
          atrakcij.
        </div>
      </div>

      <div className='card'>
        <h3>Stanje strežnika poimenovanih cevi</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className='btn secondary'
            onClick={checkHealth}
            disabled={checking}>
            {checking ? "Preverjam..." : "Preveri"}
          </button>
          {available === true && <span className='small'>Na voljo</span>}
          {available === false && <span className='small'>Ni na voljo</span>}
          {available === null && <span className='small'>Neznano</span>}
        </div>
        {error && <div className='error'>Napaka: {error}</div>}
        <div className='small' style={{ marginTop: 6 }}>
          Zaženite ločen proces: <code>npm run start:pipes</code> v mapi{" "}
          <code>backend</code>.
        </div>
      </div>

      <div className='card'>
        <h3>Pridobi atrakcije iz pipe-strežnika</h3>
        <div className='row' style={{ gap: 8, alignItems: "center" }}>
          <label className='small'>Mesto (citySlug):</label>
          <input
            className='input'
            value={citySlug}
            onChange={(e) => setCitySlug(e.target.value)}
          />
          <label className='small'>Limit:</label>
          <input
            className='input'
            type='number'
            min={1}
            max={50}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{ width: 80 }}
          />
          <button className='btn' onClick={fetchAttractions} disabled={loading}>
            {loading ? "Nalagam..." : "Pridobi"}
          </button>
        </div>
        {meta && (
          <div className='small' style={{ marginTop: 6 }}>
            Vir:{" "}
            {meta.source === "city"
              ? "mestna datoteka"
              : meta.source === "default"
              ? "privzeta datoteka"
              : "demo"}
            {meta.citySlug ? ` | citySlug: ${meta.citySlug}` : ""}
            {meta.sourceUpdatedAt
              ? ` | posodobljeno: ${new Date(
                  meta.sourceUpdatedAt
                ).toLocaleString()}`
              : ""}
          </div>
        )}
        {error && <div className='error'>Napaka: {error}</div>}
        {items.length > 0 && (
          <ul className='attraction-list' style={{ marginTop: 8 }}>
            {items.map((a, i) => (
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
        )}
        {!loading && items.length === 0 && (
          <div className='small'>Ni rezultatov (še).</div>
        )}
      </div>
    </div>
  );
};

export default NamedPipesDemo;
