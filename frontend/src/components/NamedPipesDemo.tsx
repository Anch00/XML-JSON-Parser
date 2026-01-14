import axios from "axios";
import React, { useState } from "react";
import { FaArrowRight, FaPaperPlane, FaServer } from "react-icons/fa";

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
    <div className='max-w-6xl mx-auto'>
      <div className='bg-gray-800 rounded-lg shadow-lg p-6 mb-6'>
        <h2 className='text-3xl font-bold text-teal-400 mb-2 flex items-center'>
          <FaServer className='mr-3' /> Named Pipes Demo
        </h2>
        <p className='text-gray-400 mb-6'>
          Inter-process communication via Windows Named Pipes for attractions
          domain.
        </p>

        <div className='bg-gray-700 rounded-lg p-4 mb-4'>
          <h3 className='text-xl font-semibold text-white mb-3'>
            Pipe Server Status
          </h3>
          <div className='flex gap-3 items-center'>
            <button
              className='bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors'
              onClick={checkHealth}
              disabled={checking}>
              {checking ? "Checking..." : "Check Status"}
            </button>
            {available === true && (
              <span className='text-green-400 font-medium'>● Available</span>
            )}
            {available === false && (
              <span className='text-red-400 font-medium'>● Unavailable</span>
            )}
            {available === null && (
              <span className='text-gray-400 font-medium'>● Unknown</span>
            )}
          </div>
          {error && (
            <div className='mt-3 bg-red-900 border border-red-700 text-red-200 px-3 py-2 rounded-lg text-sm'>
              Error: {error}
            </div>
          )}
          <div className='mt-3 text-gray-400 text-sm'>
            Start pipe server:{" "}
            <code className='bg-gray-900 px-2 py-1 rounded text-teal-300'>
              npm run start:pipes
            </code>{" "}
            in{" "}
            <code className='bg-gray-900 px-2 py-1 rounded text-teal-300'>
              backend
            </code>{" "}
            directory
          </div>
        </div>

        <div className='bg-gray-700 rounded-lg p-4'>
          <h3 className='text-xl font-semibold text-white mb-3'>
            Fetch Attractions from Pipe Server
          </h3>
          <div className='flex flex-wrap gap-3 items-end'>
            <div className='flex-1 min-w-[200px]'>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                City Slug
              </label>
              <input
                className='w-full bg-gray-600 text-white border border-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400'
                value={citySlug}
                onChange={(e) => setCitySlug(e.target.value)}
                placeholder='e.g., london-england'
              />
            </div>
            <div className='w-32'>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                Limit
              </label>
              <input
                className='w-full bg-gray-600 text-white border border-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400'
                type='number'
                min={1}
                max={50}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              />
            </div>
            <button
              className='bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded-lg flex items-center transition-colors'
              onClick={fetchAttractions}
              disabled={loading}>
              <FaPaperPlane className='mr-2' />
              {loading ? "Loading..." : "Fetch"}
            </button>
          </div>
          {meta && (
            <div className='mt-3 text-gray-400 text-sm'>
              Source:{" "}
              <span className='text-teal-300 font-medium'>
                {meta.source === "city"
                  ? "City file"
                  : meta.source === "default"
                  ? "Default file"
                  : "Demo"}
              </span>
              {meta.citySlug && (
                <span>
                  {" "}
                  | citySlug:{" "}
                  <span className='text-teal-300'>{meta.citySlug}</span>
                </span>
              )}
              {meta.sourceUpdatedAt && (
                <span>
                  {" "}
                  | Updated: {new Date(meta.sourceUpdatedAt).toLocaleString()}
                </span>
              )}
            </div>
          )}
          {error && (
            <div className='mt-3 bg-red-900 border border-red-700 text-red-200 px-3 py-2 rounded-lg text-sm'>
              Error: {error}
            </div>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className='bg-gray-800 rounded-lg shadow-lg p-6'>
          <h3 className='text-2xl font-bold text-teal-400 mb-4'>
            Found {items.length} Attractions
          </h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {items.map((a, i) => (
              <div
                key={i}
                className='bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors'>
                {a.url ? (
                  <a
                    href={a.url}
                    target='_blank'
                    rel='noreferrer'
                    className='text-teal-400 hover:text-teal-300 font-semibold text-lg block mb-2 flex items-center'>
                    <FaArrowRight className='mr-2' />
                    {a.name}
                  </a>
                ) : (
                  <div className='text-white font-semibold text-lg mb-2'>
                    {a.name}
                  </div>
                )}
                {a.description && (
                  <p className='text-gray-300 text-sm'>{a.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && items.length === 0 && meta && (
        <div className='bg-gray-800 rounded-lg shadow-lg p-6 text-center text-gray-400'>
          No results yet. Click "Fetch" to load attractions.
        </div>
      )}
    </div>
  );
};

export default NamedPipesDemo;
