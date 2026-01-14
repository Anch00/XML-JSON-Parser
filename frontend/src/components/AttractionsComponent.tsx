import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import {
  FaDownload,
  FaMapMarkerAlt,
  FaSave,
  FaSearch,
  FaStopwatch,
} from "react-icons/fa";

interface Attraction {
  name: string;
  description: string;
  url?: string;
}

interface CityOption {
  name: string;
  slug: string;
}

interface AttractionsComponentProps {
  savedAttractions: Attraction[];
  setSavedAttractions: (attractions: Attraction[]) => void;
}

const AttractionsComponent: React.FC<AttractionsComponentProps> = ({
  savedAttractions,
  setSavedAttractions,
}) => {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cities, setCities] = useState<CityOption[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>("berlin-germany");
  const [saveMessage, setSaveMessage] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const backendPort = 3000;

  const handleDownload = () => {
    try {
      const blob = new Blob([JSON.stringify(attractions, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const cityPart = selectedCity || "berlin-germany";
      a.href = url;
      a.download = `attractions-${cityPart}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError("Download error: " + (e as Error).message);
    }
  };

  useEffect(() => {
    // Load supported cities from backend
    axios
      .get(`http://localhost:${backendPort}/api/attractions-cities`)
      .then((resp) => {
        const list = resp.data?.cities as CityOption[];
        if (Array.isArray(list) && list.length) setCities(list);
      })
      .catch(() => {
        // ignore, default to berlin-germany
      });
  }, []);

  const fetchAttractions = async () => {
    setLoading(true);
    setError("");
    setSaveMessage("");
    setElapsedTime(0);

    // Start timer
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedTime((Date.now() - startTimeRef.current) / 1000);
    }, 100);

    try {
      const resp = await axios.get(
        `http://localhost:${backendPort}/api/scrape-attractions`,
        { params: { citySlug: selectedCity } }
      );
      if (resp.data && resp.data.attractions) {
        setAttractions(resp.data.attractions);
      } else {
        setError("No attractions returned");
      }
    } catch (err) {
      setError("Fetch error: " + (err as Error).message);
    } finally {
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setLoading(false);
    }
  };

  const handleSaveForPlanning = () => {
    setSavedAttractions(attractions);
    setSaveMessage(
      `Saved ${attractions.length} attractions for trip planning!`
    );
    setTimeout(() => setSaveMessage(""), 3000);
  };

  return (
    <div className='max-w-6xl mx-auto'>
      <div className='bg-gray-800 rounded-lg shadow-lg p-6 mb-6'>
        <h2 className='text-3xl font-bold text-teal-400 mb-2 flex items-center'>
          <FaMapMarkerAlt className='mr-3' /> Search Attractions
        </h2>
        <p className='text-gray-400 mb-6'>
          Discover unusual tourist attractions by scraping travel websites.
          Results can be used for trip planning.
        </p>

        <div className='flex flex-col md:flex-row gap-4 items-end'>
          <div className='flex-1'>
            <label className='block text-sm font-medium text-gray-300 mb-2'>
              Select Destination
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className='w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400'>
              {cities.length === 0 && (
                <option value='berlin-germany'>Berlin, Germany</option>
              )}
              {cities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchAttractions}
            disabled={loading}
            className='bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded-lg flex items-center transition-colors'>
            <FaSearch className='mr-2' />
            {loading ? "Searching..." : "Search Attractions"}
          </button>
        </div>

        {loading && (
          <div className='mt-4 flex items-center justify-center text-teal-400'>
            <FaStopwatch className='mr-2 animate-spin' />
            <span className='font-mono text-lg'>{elapsedTime.toFixed(1)}s</span>
          </div>
        )}

        {error && (
          <div className='mt-4 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg'>
            {error}
          </div>
        )}

        {saveMessage && (
          <div className='mt-4 bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded-lg'>
            {saveMessage}
          </div>
        )}

        {savedAttractions.length > 0 && (
          <div className='mt-4 bg-blue-900 border border-blue-700 text-blue-200 px-4 py-3 rounded-lg'>
            <span className='font-semibold'>{savedAttractions.length}</span>{" "}
            attractions saved for trip planning
          </div>
        )}
      </div>

      {attractions.length > 0 && (
        <div className='bg-gray-800 rounded-lg shadow-lg p-6'>
          <div className='flex justify-between items-center mb-4'>
            <div>
              <h3 className='text-2xl font-bold text-teal-400'>
                Found {attractions.length} Attractions
              </h3>
              {elapsedTime > 0 && (
                <div className='flex items-center text-gray-400 mt-1'>
                  <FaStopwatch className='mr-2' />
                  <span className='font-mono text-sm'>
                    Scraped in {elapsedTime.toFixed(2)}s
                  </span>
                </div>
              )}
            </div>
            <div className='flex gap-3'>
              <button
                onClick={handleDownload}
                className='bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg flex items-center transition-colors'>
                <FaDownload className='mr-2' />
                Download JSON
              </button>
              <button
                onClick={handleSaveForPlanning}
                className='bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg flex items-center transition-colors'>
                <FaSave className='mr-2' />
                Save for Planning
              </button>
            </div>
          </div>

          <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {attractions.map((a, i) => (
              <div
                key={i}
                className='bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors'>
                {a.url ? (
                  <a
                    href={a.url}
                    target='_blank'
                    rel='noreferrer'
                    className='text-teal-400 hover:text-teal-300 font-semibold text-lg block mb-2'>
                    {a.name}
                  </a>
                ) : (
                  <h4 className='text-white font-semibold text-lg mb-2'>
                    {a.name}
                  </h4>
                )}
                {a.description && (
                  <p className='text-gray-400 text-sm'>{a.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttractionsComponent;
