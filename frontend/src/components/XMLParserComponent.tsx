import React, { useRef, useState } from "react";
import {
  FaFileDownload,
  FaFileUpload,
  FaFilter,
  FaLink,
  FaPlus,
  FaTable,
  FaTrash,
} from "react-icons/fa";
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
    <div className='max-w-6xl mx-auto'>
      <div className='bg-gray-800 rounded-lg shadow-lg p-6 mb-6'>
        <h2 className='text-3xl font-bold text-teal-400 mb-2 flex items-center'>
          <FaTable className='mr-3' /> XML Parser & Analyzer
        </h2>
        <p className='text-gray-400 mb-6'>
          Naloži XML datoteke, poveži podatke in filtriraj rezultate
        </p>

        {error && (
          <div className='bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-4'>
            {error}
          </div>
        )}

        {/* File Upload Section */}
        <div className='bg-gray-700 rounded-lg p-4 mb-4'>
          <h3 className='text-xl font-semibold text-white mb-3 flex items-center'>
            <FaFileUpload className='mr-2' /> 1. Naloži XML Datoteke
          </h3>
          <input
            ref={fileInputRef}
            type='file'
            multiple
            accept='.xml'
            onChange={handleFileUpload}
            className='w-full bg-gray-600 text-white border border-gray-500 rounded-lg px-4 py-2 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-500 file:text-white hover:file:bg-teal-600 file:cursor-pointer'
          />
          <div className='text-gray-400 text-sm mt-2'>
            Naloži vse XML datoteke naenkrat (artikli.xml, dobavitelji.xml,
            narocila.xml, stranke.xml)
          </div>
        </div>

        {/* Data Summary */}
        <div className='bg-gray-700 rounded-lg p-4 mb-4'>
          <h3 className='text-xl font-semibold text-white mb-3'>
            2. Pregled Naloženih Podatkov
          </h3>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4'>
            <div className='bg-gray-600 rounded-lg p-3'>
              <div className='text-teal-400 font-semibold text-lg'>
                {artikli.length}
              </div>
              <div className='text-gray-300 text-sm'>Artikli</div>
              {artikli.length > 0 && (
                <div className='text-gray-400 text-xs mt-1'>
                  Majhna zaloga (&lt;5):{" "}
                  {artikli.filter((a) => a.zaloga < 5).length}
                </div>
              )}
            </div>
            <div className='bg-gray-600 rounded-lg p-3'>
              <div className='text-teal-400 font-semibold text-lg'>
                {dobavitelji.length}
              </div>
              <div className='text-gray-300 text-sm'>Dobavitelji</div>
              {dobavitelji.length > 0 && (
                <div className='text-gray-400 text-xs mt-1'>
                  Aktivni: {dobavitelji.filter((d) => d.aktivn).length}
                </div>
              )}
            </div>
            <div className='bg-gray-600 rounded-lg p-3'>
              <div className='text-teal-400 font-semibold text-lg'>
                {narocila.length}
              </div>
              <div className='text-gray-300 text-sm'>Naročila</div>
              {narocila.length > 0 && (
                <div className='text-gray-400 text-xs mt-1'>
                  Dostavljeno:{" "}
                  {narocila.filter((n) => n.status === "Dostavljeno").length}
                </div>
              )}
            </div>
            <div className='bg-gray-600 rounded-lg p-3'>
              <div className='text-teal-400 font-semibold text-lg'>
                {stranke.length}
              </div>
              <div className='text-gray-300 text-sm'>Stranke</div>
              {stranke.length > 0 && (
                <div className='text-gray-400 text-xs mt-1'>
                  Aktivne: {stranke.filter((s) => s.aktivn).length}
                </div>
              )}
            </div>
          </div>

          <button
            className='bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded-lg flex items-center transition-colors'
            onClick={handleJoinData}
            disabled={loading || artikli.length === 0}>
            <FaLink className='mr-2' />
            Poveži Podatke
          </button>
        </div>

        {/* Filters Section */}
        {joinedData.length > 0 && (
          <div className='bg-gray-700 rounded-lg p-4 mb-4'>
            <h3 className='text-xl font-semibold text-white mb-3 flex items-center'>
              <FaFilter className='mr-2' /> 3. Filtri
            </h3>
            <div className='text-gray-400 text-sm mb-3'>
              Primer filtrov: zaloga &lt; 5, kategorija vsebuje "Periferija",
              status = "V obdelavi"
            </div>

            <div className='space-y-3'>
              {filters.map((filter, index) => (
                <div key={index} className='flex flex-wrap gap-2 items-center'>
                  <select
                    className='bg-gray-600 text-white border border-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 min-w-[150px]'
                    value={filter.field}
                    onChange={(e) =>
                      updateFilter(index, "field", e.target.value)
                    }>
                    <option value=''>-- Izberi polje --</option>
                    {getAvailableFields().map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                  </select>

                  <select
                    className='bg-gray-600 text-white border border-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 min-w-[100px]'
                    value={filter.operator}
                    onChange={(e) =>
                      updateFilter(index, "operator", e.target.value)
                    }>
                    <option value='contains'>vsebuje</option>
                    <option value='equals'>=</option>
                    <option value='greaterThan'>&gt;</option>
                    <option value='lessThan'>&lt;</option>
                    <option value='greaterEqual'>≥</option>
                    <option value='lessEqual'>≤</option>
                  </select>

                  <input
                    className='bg-gray-600 text-white border border-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 min-w-[120px] flex-1'
                    type='text'
                    placeholder='Vrednost'
                    value={String(filter.value)}
                    onChange={(e) =>
                      updateFilter(index, "value", e.target.value)
                    }
                  />

                  <button
                    className='bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors flex items-center'
                    onClick={() => removeFilter(index)}
                    disabled={filters.length === 1}>
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>

            <div className='flex gap-3 mt-4'>
              <button
                className='bg-teal-500 hover:bg-teal-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center'
                onClick={handleApplyFilters}>
                <FaFilter className='mr-2' />
                Uporabi Filtre
              </button>
              <button
                className='bg-gray-600 hover:bg-gray-500 text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center'
                onClick={addFilter}>
                <FaPlus className='mr-2' />
                Dodaj Filter
              </button>
            </div>
          </div>
        )}

        {/* Results Section */}
        {filteredData.length > 0 && (
          <div className='bg-gray-700 rounded-lg p-4'>
            <h3 className='text-xl font-semibold text-white mb-4'>
              4. Rezultati ({filteredData.length} zapisov)
            </h3>

            <div className='flex gap-3 mb-4'>
              <button
                className='bg-teal-500 hover:bg-teal-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center'
                onClick={exportToJSON}>
                <FaFileDownload className='mr-2' />
                Izvozi JSON
              </button>
              <button
                className='bg-gray-600 hover:bg-gray-500 text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center'
                onClick={exportToXML}>
                <FaFileDownload className='mr-2' />
                Izvozi XML
              </button>
            </div>

            <div className='overflow-x-auto rounded-lg border border-gray-600'>
              <div className='max-h-[400px] overflow-y-auto'>
                <table className='w-full text-sm text-left'>
                  <thead className='text-xs uppercase bg-gray-800 text-gray-300 sticky top-0'>
                    <tr>
                      {filteredData[0] &&
                        Object.keys(filteredData[0])
                          .filter(
                            (key) =>
                              typeof filteredData[0][key] !== "object" ||
                              filteredData[0][key] === null
                          )
                          .slice(0, 10)
                          .map((key) => (
                            <th key={key} className='px-4 py-3'>
                              {key}
                            </th>
                          ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.slice(0, 50).map((item, index) => (
                      <tr
                        key={index}
                        className='bg-gray-700 border-b border-gray-600 hover:bg-gray-600'>
                        {Object.keys(filteredData[0] || {})
                          .filter(
                            (key) =>
                              typeof filteredData[0][key] !== "object" ||
                              filteredData[0][key] === null
                          )
                          .slice(0, 10)
                          .map((key) => (
                            <td key={key} className='px-4 py-3 text-gray-200'>
                              {item[key] != null ? String(item[key]) : ""}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredData.length > 50 && (
              <div className='text-gray-400 text-sm text-center mt-3'>
                Prikazujem prvih 50 od {filteredData.length} rezultatov
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className='text-center py-8'>
            <div className='inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-500 border-t-teal-400'></div>
            <div className='text-gray-400 mt-3'>Nalagam...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default XMLParserComponent;
