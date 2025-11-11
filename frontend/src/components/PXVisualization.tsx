import axios from "axios";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import React, { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// We now rely on stable, correct Slovene label arrays by index.
// For any unforeseen values, we simply display the raw string from meta as a fallback.

const PXVisualization: React.FC = () => {
  const [meta, setMeta] = useState<any>(null);
  const [series, setSeries] = useState<
    Array<{ year: string; value: number | null }>
  >([]);
  // Use indices to avoid passing garbled strings to backend
  const [measureIdx, setMeasureIdx] = useState<number | null>(null);
  const [destIdx, setDestIdx] = useState<number | null>(null);
  const [estIdx, setEstIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [refreshingMeta, setRefreshingMeta] = useState(false);
  // Stable Slovene labels for measures (by index in this dataset)
  const measureLabels = useMemo(
    () => [
      "Število nedeljivih enot",
      "Število ležišč - SKUPAJ",
      "Število ležišč - stalna",
    ],
    []
  );
  // Stable Slovene labels for destinations (macro destinations + country) by index
  const destinationLabels = useMemo(
    () => [
      "SLOVENIJA",
      "Alpska Slovenija",
      "Ljubljana & Osrednja Slovenija",
      "Mediteranska & Kraška Slovenija",
      "Termalna Panonska Slovenija",
    ],
    []
  );
  // Stable Slovene labels for establishments by index
  const establishmentLabels = useMemo(
    () => [
      "0 Nastanitveni obrat - SKUPAJ",
      "1 Hoteli in podobni nastanitveni obrati",
      "1.1 Hoteli",
      "1.2 Moteli",
      "1.3 Penzioni",
      "1.4 Gostišča",
      "1.5 Prenočišča",
      "2 Kampi",
      "2.1 Kampi",
      "3 Drugi nastanitveni obrati",
      "3.1 Apartmajska naselja",
      "3.2 Mladinski hoteli",
      "3.3 Turistične kmetije z nastanitvijo",
      "3.4 Zasebne sobe, apartmaji, hiše",
      "3.5 Planinski domovi in koče",
      "3.6 Počitniški domovi",
      "3.7 Drugi nastanitveni obrati",
      "3.8 Začasne nastanitvene zmogljivosti in marine",
    ],
    []
  );

  // initial meta load
  useEffect(() => {
    axios
      .get("/api/px/meta")
      .then((r) => {
        const norm = r.data;
        setMeta(norm);
        const headingValues: string[] = norm.headingValues || [];
        const stubNames: string[] = norm.stubNames || [];
        const stubValues = (norm.stubValues as Record<string, string[]>) || {};

        // prefer Bedplaces - TOTAL if present, else 2nd, else 1st
        const bedplaces = headingValues.find((h) => /TOTAL|SKUPAJ/i.test(h));
        const defaultMeasure =
          bedplaces || headingValues[1] || headingValues[0] || null;

        // destination: try SLOVENIJA if available
        const destKey = stubNames[1] || Object.keys(stubValues)[1] || null;
        const estKey = stubNames[2] || Object.keys(stubValues)[2] || null;
        const defaultDest = destKey
          ? stubValues[destKey]?.find((v) => /SLOVENIJA|SLOVENIA/i.test(v)) ||
            stubValues[destKey]?.[0] ||
            null
          : null;
        // establishment: try TOTAL/SKUPAJ option
        const defaultEst = estKey
          ? stubValues[estKey]?.find((v) => /SKUPAJ|TOTAL/i.test(v)) ||
            stubValues[estKey]?.[0] ||
            null
          : null;

        // find indices (fallback to 0)
        const mIndex = headingValues.indexOf(defaultMeasure || "");
        const dIndex =
          destKey && stubValues[destKey]
            ? stubValues[destKey].indexOf(defaultDest || "")
            : 0;
        const eIndex =
          estKey && stubValues[estKey]
            ? stubValues[estKey].indexOf(defaultEst || "")
            : 0;
        setMeasureIdx(mIndex >= 0 ? mIndex : 0);
        setDestIdx(dIndex >= 0 ? dIndex : 0);
        setEstIdx(eIndex >= 0 ? eIndex : 0);
      })
      .catch((e) => {
        console.error(e);
        setError(String(e?.message || e));
      });
  }, []);

  useEffect(() => {
    if (measureIdx == null || destIdx == null || estIdx == null) return;
    setLoading(true);
    axios
      .get("/api/px/series", {
        params: {
          measureIndex: measureIdx,
          destIndex: destIdx,
          estIndex: estIdx,
        },
      })
      .then((r) => {
        setSeries(r.data.series);
        // clear any previous error
        setError(null);
      })
      .catch((e) => {
        console.error(e);
        setError(String(e?.message || e));
      })
      .finally(() => setLoading(false));
  }, [measureIdx, destIdx, estIdx]);

  const years = series.map((s) => s.year);
  const values = series.map((s) => (s.value == null ? null : s.value));

  const numericValues = useMemo(
    () =>
      values.filter((v): v is number => typeof v === "number" && isFinite(v)),
    [values.join("|")]
  );

  const yDomain = useMemo(() => {
    if (!numericValues.length) return { min: 0, max: 1 };
    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    if (!isFinite(min) || !isFinite(max)) return { min: 0, max: 1 };
    if (min === max) {
      const pad = min === 0 ? 1 : Math.abs(min) * 0.1;
      return { min: Math.max(0, min - pad), max: max + pad };
    }
    const pad = (max - min) * 0.1;
    return { min: Math.max(0, min - pad), max: max + pad };
  }, [numericValues.join(",")]);

  const chartData = useMemo(
    () => ({
      labels: years,
      datasets: [
        {
          label:
            measureIdx != null
              ? measureLabels[measureIdx] ||
                (meta?.headingValues
                  ? meta.headingValues[measureIdx]
                  : "Meritev")
              : "Meritev",
          data: values,
          borderColor: "rgba(55,132,132,1)",
          backgroundColor: "rgba(55,132,132,0.25)",
          tension: 0.3,
          spanGaps: true,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    }),
    [years.join("|"), values.join("|"), measureIdx, meta?.headingValues]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" as const },
        title: { display: false },
        tooltip: { mode: "index" as const, intersect: false },
      },
      scales: {
        x: {
          ticks: { callback: (_val: any, idx: number) => years[idx] },
        },
        y: {
          beginAtZero: false,
          suggestedMin: yDomain.min,
          suggestedMax: yDomain.max,
          grace: "5%",
          ticks: {
            callback: (value: any) => {
              const num = Number(value);
              if (num >= 1000) return (num / 1000).toFixed(0) + "k";
              return value;
            },
          },
        },
      },
    }),
    [years.join("|"), yDomain.min, yDomain.max]
  );

  return (
    <div style={{ padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>
        PC-Axis vizualizacija — Prenočitvene zmogljivosti
      </h3>
      {!meta && <div>Loading metadata...</div>}
      {meta &&
        (() => {
          const stubNames: string[] = meta.stubNames || [];
          const stubValues =
            (meta.stubValues as Record<string, string[]>) || {};
          const destKey = stubNames[1] || Object.keys(stubValues)[1];
          const estKey = stubNames[2] || Object.keys(stubValues)[2];
          return (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                alignItems: "flex-end",
              }}>
              <div style={{ minWidth: 200 }}>
                <label style={{ fontWeight: 600 }}>Meritev / Measure</label>
                <select
                  style={{ width: "100%", padding: "4px 6px" }}
                  value={measureIdx ?? 0}
                  onChange={(e) => setMeasureIdx(Number(e.target.value))}>
                  {(meta.headingValues || []).map((h: string, i: number) => (
                    <option key={i} value={i} title={measureLabels[i] || h}>
                      {measureLabels[i] || h}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ minWidth: 260 }}>
                <label style={{ fontWeight: 600 }}>
                  Destinacija / Destination
                </label>
                <select
                  style={{ width: "100%", padding: "4px 6px" }}
                  value={destIdx ?? 0}
                  onChange={(e) => setDestIdx(Number(e.target.value))}>
                  {(destKey && stubValues[destKey]
                    ? stubValues[destKey]
                    : Object.values(stubValues)[1] || []
                  ).map((d: string, i: number) => {
                    const label = destinationLabels[i] || d;
                    return (
                      <option key={i} value={i} title={label}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div style={{ minWidth: 320 }}>
                <label style={{ fontWeight: 600 }}>
                  Nastanitveni obrat / Establishment
                </label>
                <select
                  style={{ width: "100%", padding: "4px 6px" }}
                  value={estIdx ?? 0}
                  onChange={(e) => setEstIdx(Number(e.target.value))}>
                  {(estKey && stubValues[estKey]
                    ? stubValues[estKey]
                    : Object.values(stubValues)[2] || []
                  ).map((d: string, i: number) => {
                    const label = establishmentLabels[i] || d;
                    return (
                      <option key={i} value={i} title={label}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          );
        })()}

      <div style={{ marginTop: 16, width: "100%", maxWidth: 760, height: 360 }}>
        {loading ? (
          <div>Loading series...</div>
        ) : (
          <Line data={chartData} options={chartOptions} />
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <small>
          Data pulled from local backend endpoint /api/px/series.
          Missing/undefined values are shown as gaps.
        </small>
      </div>
      {error && (
        <div style={{ marginTop: 12, color: "red" }}>Error: {error}</div>
      )}
      <div style={{ marginTop: 12 }}>
        <button
          disabled={refreshingMeta}
          onClick={() => {
            setError(null);
            setRefreshingMeta(true);
            axios
              .get("/api/px/meta")
              .then((r) => setMeta(r.data))
              .catch((e) => setError(String(e?.message || e)))
              .finally(() => setRefreshingMeta(false));
          }}>
          {refreshingMeta ? "Osvežujem..." : "Osveži meta"}
        </button>
        <button
          style={{ marginLeft: 8 }}
          onClick={() => setDebugOpen((d) => !d)}>
          {debugOpen ? "Hide debug" : "Show debug"}
        </button>
      </div>
      {debugOpen && (
        <div
          style={{
            marginTop: 12,
            background: "#f6f8fa",
            padding: 12,
            border: "1px solid #ddd",
          }}>
          <h4>Debug: meta</h4>
          <pre style={{ maxHeight: 200, overflow: "auto" }}>
            {JSON.stringify(meta, null, 2)}
          </pre>
          <h4>Debug: series</h4>
          <pre style={{ maxHeight: 200, overflow: "auto" }}>
            {JSON.stringify(series, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default PXVisualization;
