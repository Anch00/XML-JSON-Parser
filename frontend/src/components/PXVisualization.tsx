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
import { FaChartLine, FaSync, FaDatabase } from 'react-icons/fa';

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

const PXVisualization: React.FC = () => {
  const [meta, setMeta] = useState<any>(null);
  const [series, setSeries] = useState<Array<{ year: string; value: number | null }>>([]);
  const [measureIdx, setMeasureIdx] = useState<number | null>(null);
  const [destIdx, setDestIdx] = useState<number | null>(null);
  const [estIdx, setEstIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [refreshingMeta, setRefreshingMeta] = useState(false);

  const measureLabels = useMemo(() => ["Number of indivisible units", "Number of beds - TOTAL", "Number of beds - permanent"], []);
  const destinationLabels = useMemo(() => ["SLOVENIA", "Alpine Slovenia", "Ljubljana & Central Slovenia", "Mediterranean & Karst Slovenia", "Thermal Pannonian Slovenia"], []);
  const establishmentLabels = useMemo(() => [
    "0 Accommodation facility - TOTAL",
    "1 Hotels and similar facilities",
    "1.1 Hotels",
    "1.2 Motels",
    "1.3 Pensions",
    "1.4 Inns",
    "1.5 Lodging houses",
    "2 Camping sites",
    "2.1 Camping sites",
    "3 Other accommodation",
    "3.1 Apartment complexes",
    "3.2 Youth hotels",
    "3.3 Tourist farms with accommodation",
    "3.4 Private rooms, apartments, houses",
    "3.5 Mountain huts",
    "3.6 Holiday homes",
    "3.7 Other accommodation",
    "3.8 Temporary accommodation and marinas",
  ], []);

  useEffect(() => {
    axios.get("/api/px/meta").then((r) => {
      const norm = r.data;
      setMeta(norm);
      const headingValues: string[] = norm.headingValues || [];
      const stubNames: string[] = norm.stubNames || [];
      const stubValues = (norm.stubValues as Record<string, string[]>) || {};
      const bedplaces = headingValues.find((h) => /TOTAL|SKUPAJ/i.test(h));
      const defaultMeasure = bedplaces || headingValues[1] || headingValues[0] || null;
      const destKey = stubNames[1] || Object.keys(stubValues)[1] || null;
      const estKey = stubNames[2] || Object.keys(stubValues)[2] || null;
      const defaultDest = destKey ? stubValues[destKey]?.find((v) => /SLOVENIJA|SLOVENIA/i.test(v)) || stubValues[destKey]?.[0] || null : null;
      const defaultEst = estKey ? stubValues[estKey]?.find((v) => /SKUPAJ|TOTAL/i.test(v)) || stubValues[estKey]?.[0] || null : null;
      const mIndex = headingValues.indexOf(defaultMeasure || "");
      const dIndex = destKey && stubValues[destKey] ? stubValues[destKey].indexOf(defaultDest || "") : 0;
      const eIndex = estKey && stubValues[estKey] ? stubValues[estKey].indexOf(defaultEst || "") : 0;
      setMeasureIdx(mIndex >= 0 ? mIndex : 0);
      setDestIdx(dIndex >= 0 ? dIndex : 0);
      setEstIdx(eIndex >= 0 ? eIndex : 0);
    }).catch((e) => {
      setError(String(e?.message || e));
    });
  }, []);

  useEffect(() => {
    if (measureIdx == null || destIdx == null || estIdx == null) return;
    setLoading(true);
    axios.get("/api/px/series", {
      params: { measureIndex: measureIdx, destIndex: destIdx, estIndex: estIdx },
    }).then((r) => {
      setSeries(r.data.series);
      setError(null);
    }).catch((e) => {
      setError(String(e?.message || e));
    }).finally(() => setLoading(false));
  }, [measureIdx, destIdx, estIdx]);

  const years = series.map((s) => s.year);
  const values = series.map((s) => (s.value == null ? null : s.value));
  const numericValues = useMemo(() => values.filter((v): v is number => typeof v === "number" && isFinite(v)), [values.join("|")]);

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

  const chartData = useMemo(() => ({
    labels: years,
    datasets: [{
      label: measureIdx != null ? measureLabels[measureIdx] || (meta?.headingValues ? meta.headingValues[measureIdx] : "Measurement") : "Measurement",
      data: values,
      borderColor: "rgba(45,212,191,1)",
      backgroundColor: "rgba(45,212,191,0.2)",
      tension: 0.3,
      spanGaps: true,
      pointRadius: 4,
      pointHoverRadius: 6,
    }],
  }), [years.join("|"), values.join("|"), measureIdx, meta?.headingValues]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: "bottom" as const,
        labels: { color: "#d1d5db" }
      },
      title: { display: false },
      tooltip: { mode: "index" as const, intersect: false },
    },
    scales: {
      x: {
        ticks: { 
          callback: (_val: any, idx: number) => years[idx],
          color: "#d1d5db"
        },
        grid: { color: "rgba(75, 85, 99, 0.3)" }
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
          color: "#d1d5db"
        },
        grid: { color: "rgba(75, 85, 99, 0.3)" }
      },
    },
  }), [years.join("|"), yDomain.min, yDomain.max]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-3xl font-bold text-teal-400 mb-2 flex items-center">
          <FaChartLine className="mr-3" /> PC-Axis Visualization
        </h2>
        <p className="text-gray-400 mb-6">
          Accommodation Capacity Statistics from PC-Axis Format
        </p>

        {!meta && (
          <div className="text-center text-gray-400 py-8">
            <FaDatabase className="inline-block text-4xl mb-2 animate-pulse" />
            <div>Loading metadata...</div>
          </div>
        )}

        {meta && (() => {
          const stubNames: string[] = meta.stubNames || [];
          const stubValues = (meta.stubValues as Record<string, string[]>) || {};
          const destKey = stubNames[1] || Object.keys(stubValues)[1];
          const estKey = stubNames[2] || Object.keys(stubValues)[2];
          return (
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-xl font-semibold text-white mb-4">Data Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Measure</label>
                  <select
                    className="w-full bg-gray-600 text-white border border-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    value={measureIdx ?? 0}
                    onChange={(e) => setMeasureIdx(Number(e.target.value))}>
                    {(meta.headingValues || []).map((h: string, i: number) => (
                      <option key={i} value={i}>{measureLabels[i] || h}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Destination</label>
                  <select
                    className="w-full bg-gray-600 text-white border border-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    value={destIdx ?? 0}
                    onChange={(e) => setDestIdx(Number(e.target.value))}>
                    {(destKey && stubValues[destKey] ? stubValues[destKey] : Object.values(stubValues)[1] || []).map((d: string, i: number) => {
                      const label = destinationLabels[i] || d;
                      return <option key={i} value={i}>{label}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Establishment Type</label>
                  <select
                    className="w-full bg-gray-600 text-white border border-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    value={estIdx ?? 0}
                    onChange={(e) => setEstIdx(Number(e.target.value))}>
                    {(estKey && stubValues[estKey] ? stubValues[estKey] : Object.values(stubValues)[2] || []).map((est: string, i: number) => {
                      const label = establishmentLabels[i] || est;
                      return <option key={i} value={i}>{label}</option>;
                    })}
                  </select>
                </div>
              </div>
            </div>
          );
        })()}

        {loading && (
          <div className="text-center text-teal-400 py-8">
            <FaSync className="inline-block text-3xl animate-spin" />
            <div className="mt-2">Loading data...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-4">
            Error: {error}
          </div>
        )}
      </div>

      {series.length > 0 && (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-2xl font-bold text-teal-400 mb-4">Time Series</h3>
          <div style={{ height: "400px" }}>
            <Line data={chartData} options={chartOptions} />
          </div>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-gray-400 text-sm">Data Points</div>
              <div className="text-white text-2xl font-bold">{series.length}</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-gray-400 text-sm">Min Value</div>
              <div className="text-white text-2xl font-bold">{numericValues.length ? Math.min(...numericValues).toLocaleString() : "N/A"}</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-gray-400 text-sm">Max Value</div>
              <div className="text-white text-2xl font-bold">{numericValues.length ? Math.max(...numericValues).toLocaleString() : "N/A"}</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-gray-400 text-sm">Average</div>
              <div className="text-white text-2xl font-bold">
                {numericValues.length ? Math.round(numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toLocaleString() : "N/A"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PXVisualization;
