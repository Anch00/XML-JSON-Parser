import axios from "axios";
import React, { useState } from "react";

interface Attraction {
  name: string;
  description: string;
}

const AttractionsComponent: React.FC = () => {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAttractions = async () => {
    setLoading(true);
    setError("");
    try {
      const backendPort = 3000; // dev backend started on 3001
      const resp = await axios.get(
        `http://localhost:${backendPort}/api/scrape-attractions`
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
      <h3>6. Pridobi Turistične Znamenitosti</h3>
      <p className='small'>
        Scrape a travel page and save results to{" "}
        <code>data/attractions.json</code>
      </p>
      <div className='row'>
        <button className='btn' onClick={fetchAttractions} disabled={loading}>
          {loading ? "Scraping..." : "Scrape Attractions"}
        </button>
      </div>

      {error && <div className='error'>{error}</div>}

      {attractions.length > 0 && (
        <ul>
          {attractions.map((a, i) => (
            <li key={i} style={{ marginBottom: 12 }}>
              <strong>{a.name}</strong>
              {a.description && <div className='small'>{a.description}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AttractionsComponent;
