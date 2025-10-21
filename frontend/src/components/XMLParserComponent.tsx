import React, { useRef, useState } from "react";
import {
  Artikel,
  Dobavitelj,
  FilterCriteria,
  JoinedData,
  Narocilo,
  Stranka,
} from "../types";
import {
  DataFilter,
  DataJoiner,
  JSONExporter,
  XMLExporter,
  XMLParser,
} from "../utils/xmlParser";

const XMLParserComponent: React.FC = () => {
  const [artikli, setArtikli] = useState<Artikel[]>([]);
  const [dobavitelji, setDobavitelji] = useState<Dobavitelj[]>([]);
  const [narocila, setNarocila] = useState<Narocilo[]>([]);
  const [stranke, setStranke] = useState<Stranka[]>([]);
  const [joinedData, setJoinedData] = useState<JoinedData[]>([]);
  const [filteredData, setFilteredData] = useState<JoinedData[]>([]);
  const [filters, setFilters] = useState<FilterCriteria[]>([
    { field: "", operator: "contains", value: "" },
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setError("");

    try {
      for (const file of files) {
        const text = await file.text();
        const fileName = file.name.toLowerCase();
        console.log("Processing file:", fileName);

        if (fileName.includes("artikli")) {
          const parsed = XMLParser.parseArtikli(text);
          console.log("Parsed artikli:", parsed.length, "items");
          setArtikli(parsed);
        } else if (fileName.includes("dobavitelji")) {
          const parsed = XMLParser.parseDobavitelji(text);
          console.log("Parsed dobavitelji:", parsed.length, "items");
          setDobavitelji(parsed);
        } else if (fileName.includes("narocila")) {
          const parsed = XMLParser.parseNarocila(text);
          console.log("Parsed narocila:", parsed.length, "items");
          setNarocila(parsed);
        } else if (fileName.includes("stranke")) {
          const parsed = XMLParser.parseStranke(text);
          console.log("Parsed stranke:", parsed.length, "items");
          setStranke(parsed);
        } else {
          console.warn("Unknown file type:", fileName);
        }
      }
    } catch (err) {
      setError(`Error parsing XML: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinData = () => {
    try {
      const joined = DataJoiner.joinData(
        artikli,
        dobavitelji,
        narocila,
        stranke
      );
      setJoinedData(joined);
      setFilteredData(joined);
      console.log("Joined Data:", joined);
    } catch (err) {
      setError(`Error joining data: ${(err as Error).message}`);
    }
  };

  const handleApplyFilters = () => {
    try {
      const validFilters = filters.filter((f) => f.field && f.value);
      const filtered = DataFilter.applyFilters(joinedData, validFilters);
      setFilteredData(filtered);
      console.log("Filtered Data:", filtered);
    } catch (err) {
      setError(`Error filtering data: ${(err as Error).message}`);
    }
  };

  const updateFilter = (
    index: number,
    field: keyof FilterCriteria,
    value: any
  ) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setFilters(newFilters);
  };

  const addFilter = () => {
    setFilters([...filters, { field: "", operator: "contains", value: "" }]);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const exportToJSON = () => {
    try {
      const json = JSONExporter.exportToJSON(filteredData);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "filtrirano.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Error exporting JSON: ${(err as Error).message}`);
    }
  };

  const exportToXML = () => {
    try {
      const xml = XMLExporter.exportToXML(filteredData, "filtrirani-rezultati");
      const blob = new Blob([xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "filtrirano.xml";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Error exporting XML: ${(err as Error).message}`);
    }
  };

  const getAvailableFields = (): string[] => {
    if (joinedData.length === 0) return [];

    const allFields = new Set<string>();
    joinedData.forEach((item) => {
      Object.keys(item).forEach((key) => {
        if (typeof item[key] !== "object" || item[key] === null) {
          allFields.add(key);
        }
      });
    });

    return Array.from(allFields).sort();
  };

  return (
    <div className='container'>
      <div className='header'>
        <h1>XML Parser & Analyzer</h1>
        <div className='small'>
          Naloži XML datoteke, poveži podatke in filtriraj rezultate
        </div>
      </div>

      {error && <div className='error'>{error}</div>}

      {/* File Upload Section */}
      <div className='card'>
        <h3>1. Naloži XML Datoteke</h3>
        <input
          ref={fileInputRef}
          type='file'
          multiple
          accept='.xml'
          onChange={handleFileUpload}
        />
        <div className='small' style={{ marginTop: "8px" }}>
          Naloži vse XML datoteke naenkrat (artikli.xml, dobavitelji.xml,
          narocila.xml, stranke.xml)
        </div>
      </div>

      {/* Data Summary */}
      <div className='card'>
        <h3>2. Pregled Naloženih Podatkov</h3>
        <div className='data-summary'>
          <div className='data-item'>
            <strong>Artikli: {artikli.length}</strong>
            {artikli.length > 0 && (
              <div className='small'>
                Majhna zaloga (&lt;5):{" "}
                {artikli.filter((a) => a.zaloga < 5).length}
              </div>
            )}
          </div>
          <div className='data-item'>
            <strong>Dobavitelji: {dobavitelji.length}</strong>
            {dobavitelji.length > 0 && (
              <div className='small'>
                Aktivni: {dobavitelji.filter((d) => d.aktivn).length}
              </div>
            )}
          </div>
          <div className='data-item'>
            <strong>Naročila: {narocila.length}</strong>
            {narocila.length > 0 && (
              <div className='small'>
                Dostavljeno:{" "}
                {narocila.filter((n) => n.status === "Dostavljeno").length}
              </div>
            )}
          </div>
          <div className='data-item'>
            <strong>Stranke: {stranke.length}</strong>
            {stranke.length > 0 && (
              <div className='small'>
                Aktivne: {stranke.filter((s) => s.aktivn).length}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: "16px" }}>
          <button
            className='btn'
            onClick={handleJoinData}
            disabled={loading || artikli.length === 0}>
            Poveži Podatke
          </button>
        </div>
      </div>

      {/* Filters Section */}
      {joinedData.length > 0 && (
        <div className='card'>
          <h3>3. Filtri</h3>
          <div className='small' style={{ marginBottom: "12px" }}>
            Primer filtrov: zaloga &lt; 5, kategorija vsebuje "Periferija",
            status = "V obdelavi"
          </div>

          {filters.map((filter, index) => (
            <div key={index} className='filter-row'>
              <select
                className='input'
                value={filter.field}
                onChange={(e) => updateFilter(index, "field", e.target.value)}
                style={{ minWidth: "150px" }}>
                <option value=''>-- Izberi polje --</option>
                {getAvailableFields().map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>

              <select
                className='input'
                value={filter.operator}
                onChange={(e) =>
                  updateFilter(index, "operator", e.target.value)
                }
                style={{ minWidth: "100px" }}>
                <option value='contains'>vsebuje</option>
                <option value='equals'>=</option>
                <option value='greaterThan'>&gt;</option>
                <option value='lessThan'>&lt;</option>
                <option value='greaterEqual'>≥</option>
                <option value='lessEqual'>≤</option>
              </select>

              <input
                className='input'
                type='text'
                placeholder='Vrednost'
                value={String(filter.value)}
                onChange={(e) => updateFilter(index, "value", e.target.value)}
                style={{ minWidth: "120px" }}
              />

              <button
                className='btn secondary'
                onClick={() => removeFilter(index)}
                disabled={filters.length === 1}>
                Odstrani
              </button>
            </div>
          ))}

          <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
            <button className='btn' onClick={handleApplyFilters}>
              Uporabi Filtre
            </button>
            <button className='btn secondary' onClick={addFilter}>
              Dodaj Filter
            </button>
          </div>
        </div>
      )}

      {/* Results Section */}
      {filteredData.length > 0 && (
        <div className='card'>
          <h3>4. Rezultati ({filteredData.length} zapisov)</h3>

          <div style={{ marginBottom: "16px", display: "flex", gap: "8px" }}>
            <button className='btn' onClick={exportToJSON}>
              Izvozi JSON
            </button>
            <button className='btn secondary' onClick={exportToXML}>
              Izvozi XML
            </button>
          </div>

          <div
            style={{
              overflowX: "auto",
              maxHeight: "400px",
              overflowY: "auto",
            }}>
            <table className='table'>
              <thead>
                <tr>
                  {filteredData[0] &&
                    Object.keys(filteredData[0])
                      .filter(
                        (key) =>
                          typeof filteredData[0][key] !== "object" ||
                          filteredData[0][key] === null
                      )
                      .slice(0, 10) // Limit columns for readability
                      .map((key) => <th key={key}>{key}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, 50).map((item, index) => (
                  <tr key={index}>
                    {Object.keys(filteredData[0] || {})
                      .filter(
                        (key) =>
                          typeof filteredData[0][key] !== "object" ||
                          filteredData[0][key] === null
                      )
                      .slice(0, 10)
                      .map((key) => (
                        <td key={key}>
                          {item[key] != null ? String(item[key]) : ""}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredData.length > 50 && (
            <div className='small' style={{ marginTop: "8px" }}>
              Prikazujem prvih 50 od {filteredData.length} rezultatov
            </div>
          )}
        </div>
      )}

      {loading && <div className='loading'>Nalagam...</div>}
    </div>
  );
};

export default XMLParserComponent;
