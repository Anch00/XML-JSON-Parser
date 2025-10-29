import axios from "axios";
import React, { useEffect, useState } from "react";

interface Attraction {
  name: string;
  description: string;
  url?: string;
}

interface CityOption {
  name: string;
  slug: string;
}

const AttractionsComponent: React.FC = () => {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cities, setCities] = useState<CityOption[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>("berlin-germany");

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
      setLoading(false);
    }
  };

  return (
    <div className='card' style={{ marginTop: 20 }}>
      <h3>6. Pridobi Nenavadne Turistične Znamenitosti</h3>
      <p className='small'>
        Scrape a travel page and save results to{" "}
        <code>data/attractions.json</code>
      </p>
      <div className='row' style={{ gap: 8, alignItems: "center" }}>
        <label className='small'>Mesto:</label>
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className='input'>
          {cities.length === 0 && (
            <option value='berlin-germany'>Berlin, Germany</option>
          )}
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <button className='btn' onClick={fetchAttractions} disabled={loading}>
          {loading ? "Scraping..." : "Scrape Attractions"}
        </button>
      </div>

      {error && <div className='error'>{error}</div>}

      {attractions.length > 0 && (
        <>
          <div className='row'>
            <button className='btn secondary' onClick={handleDownload}>
              Download JSON
            </button>
          </div>
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
        </>
      )}
    </div>
  );
};

export default AttractionsComponent;
