import React, { useRef, useState } from "react";
import {
  FaFileUpload,
  FaLink,
  FaFilter,
  FaFileDownload,
  FaTable,
  FaPlus,
  FaTrash,
  FaCog,
  FaBroom,
} from "react-icons/fa";
import { FilterCriteria, JoinConfig, JoinedData, XMLDocument } from "../types";
import {
  GenericDataFilter,
  GenericDataJoiner,
  GenericExporter,
  GenericXMLParser,
} from "../utils/genericXMLParser";

const GenericXMLParserComponent: React.FC = () => {
  const [documents, setDocuments] = useState<XMLDocument[]>([]);
  const [joinedData, setJoinedData] = useState<JoinedData[]>([]);
  const [filteredData, setFilteredData] = useState<JoinedData[]>([]);
  const [filters, setFilters] = useState<FilterCriteria[]>([
    { field: "", operator: "contains", value: "" },
  ]);
  const [customJoins, setCustomJoins] = useState<JoinConfig[]>([]);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
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
      const parsedDocuments: XMLDocument[] = [];

      for (const file of files) {
        const text = await file.text();
        console.log("Processing file:", file.name);

        try {
          const parsedDoc = GenericXMLParser.parseXMLDocument(text, file.name);
          console.log(
            `Parsed ${file.name}:`,
            parsedDoc.entities.length,
            "entities"
          );
          parsedDocuments.push(parsedDoc);
        } catch (parseError) {
          console.error(`Error parsing ${file.name}:`, parseError);
          setError(`Error parsing ${file.name}: ${parseError}`);
        }
      }

      setDocuments(parsedDocuments);

      // Get all available fields
      const fields = GenericXMLParser.getAllFields(parsedDocuments);
      setAvailableFields(fields);

      // Auto-detect possible joins
      const possibleJoins =
        GenericXMLParser.detectPossibleJoins(parsedDocuments);
      setCustomJoins(possibleJoins);

      console.log("Detected possible joins:", possibleJoins);
    } catch (err) {
      setError(`Error processing files: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoJoin = () => {
    try {
      const joined = GenericDataJoiner.autoJoin(documents);
      setJoinedData(joined);
      setFilteredData(joined);
      console.log("Auto-joined data:", joined);
    } catch (err) {
      setError(`Error joining data: ${(err as Error).message}`);
    }
  };

  const handleCustomJoin = () => {
    try {
      const joined = GenericDataJoiner.joinDocuments(documents, customJoins);
      setJoinedData(joined);
      setFilteredData(joined);
      console.log("Custom-joined data:", joined);
    } catch (err) {
      setError(`Error joining data: ${(err as Error).message}`);
    }
  };

  const handleApplyFilters = () => {
    try {
      const validFilters = filters.filter((f) => f.field && f.value !== "");
      const filtered = GenericDataFilter.applyFilters(joinedData, validFilters);
      setFilteredData(filtered);
      console.log("Filtered data:", filtered);
    } catch (err) {
      setError(`Error filtering data: ${(err as Error).message}`);
    }
  };

  const handleClearFilters = () => {
    setFilters([{ field: "", operator: "contains", value: "" }]);
    setFilteredData(joinedData);
  };

  const addFilter = () => {
    setFilters([...filters, { field: "", operator: "contains", value: "" }]);
  };

  const updateFilter = (
    index: number,
    field: keyof FilterCriteria,
    value: any
  ) => {
    const newFilters = [...filters];
    newFilters[index][field] = value;
    setFilters(newFilters);
  };

  const removeFilter = (index: number) => {
    if (filters.length > 1) {
      setFilters(filters.filter((_, i) => i !== index));
    }
  };

  const addCustomJoin = () => {
    setCustomJoins([
      ...customJoins,
      {
        sourceDocument: "",
        targetDocument: "",
        sourceField: "",
        targetField: "id",
        alias: "",
      },
    ]);
  };

  const updateCustomJoin = (
    index: number,
    field: keyof JoinConfig,
    value: string
  ) => {
    const newJoins = [...customJoins];
    newJoins[index][field] = value;
    setCustomJoins(newJoins);
  };

  const removeCustomJoin = (index: number) => {
    setCustomJoins(customJoins.filter((_, i) => i !== index));
  };

  const exportJSON = () => {
    const json = GenericExporter.exportToJSON(filteredData);
    GenericExporter.downloadFile(json, "filtrirano.json", "application/json");
  };

  const exportXML = () => {
    const xml = GenericExporter.exportToXML(filteredData);
    GenericExporter.downloadFile(xml, "filtrirano.xml", "application/xml");
  };

  return (
    <div className='max-w-6xl mx-auto'>
      <div className='bg-gray-800 rounded-lg shadow-lg p-6 mb-6'>
        <h2 className='text-3xl font-bold text-teal-400 mb-2 flex items-center'>
          <FaTable className='mr-3' /> Generični XML Parser & Analyzer
        </h2>
        <p className='text-gray-400 mb-6'>
          Naloži poljubne XML datoteke, povežej podatke in filtriraj rezultate
        </p>

        {error && (
          <div className='bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-4'>
            {error}
          </div>
        )}

        {loading && (
          <div className='text-center py-4 mb-4'>
            <div className='inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-500 border-t-teal-400'></div>
            <div className='text-gray-400 mt-3'>Nalagam XML datoteke...</div>
          </div>
        )}

        {/* File Upload */}
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
        </div>

        {/* Documents Summary */}
        {documents.length > 0 && (
          <div className='bg-gray-700 rounded-lg p-4 mb-4'>
            <h3 className='text-xl font-semibold text-white mb-3'>
              2. Naloženi Dokumenti
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {documents.map((doc, index) => (
                <div key={index} className='bg-gray-600 rounded-lg p-4'>
                  <div className='text-teal-400 font-semibold text-lg mb-1'>
                    {doc.filename}
                  </div>
                  <div className='text-gray-300 text-sm mb-2'>
                    Entitete: <span className='text-white'>{doc.entities.length}</span> | 
                    Root: <span className='text-white'>&lt;{doc.rootElement}&gt;</span>
                  </div>
                  <div className='text-gray-400 text-xs'>
                    Polja: {doc.fields.slice(0, 5).join(", ")}
                    {doc.fields.length > 5 ? "..." : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Join Configuration */}
        {documents.length > 1 && (
          <div className='bg-gray-700 rounded-lg p-4 mb-4'>
            <h3 className='text-xl font-semibold text-white mb-3 flex items-center'>
              <FaLink className='mr-2' /> 3. Povezovanje Podatkov
            </h3>

            <div className='flex flex-wrap gap-3 mb-4'>
              <button
                className='bg-teal-500 hover:bg-teal-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center'
                onClick={handleAutoJoin}>
                <FaCog className='mr-2' />
                Avtomatsko Poveži
              </button>
              <button
                className='bg-gray-600 hover:bg-gray-500 text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center'
                onClick={handleCustomJoin}>
                <FaLink className='mr-2' />
                Uporabi Ročne JOIN-e
              </button>
              <button
                className='bg-gray-600 hover:bg-gray-500 text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center'
                onClick={addCustomJoin}>
                <FaPlus className='mr-2' />
                Dodaj JOIN
              </button>
            </div>

            {customJoins.length > 0 && (
              <div>
                <h4 className='text-white font-medium mb-3'>
                  JOIN konfiguracija:
                </h4>
                <div className='space-y-3'>
                  {customJoins.map((join, index) => (
                    <div
                      key={index}
                      className='flex flex-wrap gap-2 items-center bg-gray-600 p-3 rounded-lg'>
                      <select
                        className='bg-gray-700 text-white border border-gray-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 min-w-[150px]'
                        value={join.sourceDocument}
                        onChange={(e) =>
                          updateCustomJoin(
                            index,
                            "sourceDocument",
                            e.target.value
                          )
                        }>
                        <option value=''>Izvorni dokument</option>
                        {documents.map((doc) => (
                          <option key={doc.filename} value={doc.filename}>
                            {doc.filename}
                          </option>
                        ))}
                      </select>

                      <select
                        className='bg-gray-700 text-white border border-gray-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 min-w-[120px]'
                        value={join.sourceField}
                        onChange={(e) =>
                          updateCustomJoin(index, "sourceField", e.target.value)
                        }>
                        <option value=''>Izorno polje</option>
                        {availableFields.map((field) => (
                          <option key={field} value={field}>
                            {field}
                          </option>
                        ))}
                      </select>

                      <span className='text-teal-400 font-bold'>→</span>

                      <select
                        className='bg-gray-700 text-white border border-gray-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 min-w-[150px]'
                        value={join.targetDocument}
                        onChange={(e) =>
                          updateCustomJoin(
                            index,
                            "targetDocument",
                            e.target.value
                          )
                        }>
                        <option value=''>Ciljni dokument</option>
                        {documents.map((doc) => (
                          <option key={doc.filename} value={doc.filename}>
                            {doc.filename}
                          </option>
                        ))}
                      </select>

                      <select
                        className='bg-gray-700 text-white border border-gray-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 min-w-[120px]'
                        value={join.targetField}
                        onChange={(e) =>
                          updateCustomJoin(index, "targetField", e.target.value)
                        }>
                        <option value=''>Ciljno polje</option>
                        {availableFields.map((field) => (
                          <option key={field} value={field}>
                            {field}
                          </option>
                        ))}
                      </select>

                      <input
                        className='bg-gray-700 text-white border border-gray-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 min-w-[100px]'
                        type='text'
                        placeholder='Alias'
                        value={join.alias || ""}
                        onChange={(e) =>
                          updateCustomJoin(index, "alias", e.target.value)
                        }
                      />

                      <button
                        className='bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors flex items-center'
                        onClick={() => removeCustomJoin(index)}>
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        {joinedData.length > 0 && (
          <div className='bg-gray-700 rounded-lg p-4 mb-4'>
            <h3 className='text-xl font-semibold text-white mb-3 flex items-center'>
              <FaFilter className='mr-2' /> 4. Filtriranje
            </h3>

            <div className='flex flex-wrap gap-3 mb-4'>
              <button
                className='bg-teal-500 hover:bg-teal-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center'
                onClick={handleApplyFilters}>
                <FaFilter className='mr-2' />
                Uporabi Filtre
              </button>
              <button
                className='bg-gray-600 hover:bg-gray-500 text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center'
                onClick={handleClearFilters}>
                <FaBroom className='mr-2' />
                Počisti Filtre
              </button>
              <button
                className='bg-gray-600 hover:bg-gray-500 text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center'
                onClick={addFilter}>
                <FaPlus className='mr-2' />
                Dodaj Filter
              </button>
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
                    <option value=''>Izberi polje</option>
                    {availableFields.map((field) => (
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
          </div>
        )}

        {/* Results */}
        {filteredData.length > 0 && (
          <div className='bg-gray-700 rounded-lg p-4 mb-4'>
            <h3 className='text-xl font-semibold text-white mb-4'>
              5. Rezultati ({filteredData.length})
            </h3>

            <div className='flex gap-3 mb-4'>
              <button
                className='bg-teal-500 hover:bg-teal-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center'
                onClick={exportJSON}>
                <FaFileDownload className='mr-2' />
                Izvozi JSON
              </button>
              <button
                className='bg-gray-600 hover:bg-gray-500 text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center'
                onClick={exportXML}>
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
                            (key) => typeof filteredData[0][key] !== "object"
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
                        {Object.entries(item)
                          .filter(([_, value]) => typeof value !== "object")
                          .slice(0, 10)
                          .map(([key, value]) => (
                            <td key={key} className='px-4 py-3 text-gray-200'>
                              {value != null ? String(value) : ""}
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
                Prikazanih je prvih 50 od {filteredData.length} rezultatov
              </div>
            )}
          </div>
        )}

        {/* Usage Examples */}
        {documents.length === 0 && (
          <div className='bg-gray-700 rounded-lg p-4'>
            <h3 className='text-xl font-semibold text-white mb-3'>
              Navodila za Uporabo
            </h3>
            <div className='text-gray-300 space-y-3'>
              <p>
                <strong className='text-teal-400'>
                  1. Naloži XML datoteke:
                </strong>{" "}
                Izberite eno ali več XML datotek
              </p>
              <p>
                <strong className='text-teal-400'>2. Poveži podatke:</strong>{" "}
                Uporabite avtomatsko povezovanje ali definirajte ročne JOIN-e
              </p>
              <p>
                <strong className='text-teal-400'>3. Filtriraj:</strong>{" "}
                Dodajte filtre za iskanje specifičnih podatkov
              </p>
              <p>
                <strong className='text-teal-400'>4. Izvozi:</strong> Shranite
                rezultate v JSON ali XML format
              </p>

              <div className='bg-gray-600 rounded-lg p-3 mt-4'>
                <h4 className='text-white font-semibold mb-2'>
                  Primeri filtrov:
                </h4>
                <ul className='list-disc list-inside text-gray-300 text-sm space-y-1'>
                  <li>
                    <code className='bg-gray-800 px-2 py-1 rounded text-teal-300'>
                      zaloga &lt; 5
                    </code>{" "}
                    - Izdelki z majhno zalogo
                  </li>
                  <li>
                    <code className='bg-gray-800 px-2 py-1 rounded text-teal-300'>
                      status = "V obdelavi"
                    </code>{" "}
                    - Naročila v obdelavi
                  </li>
                  <li>
                    <code className='bg-gray-800 px-2 py-1 rounded text-teal-300'>
                      kategorija vsebuje "Avto"
                    </code>{" "}
                    - Avtomobilska oprema
                  </li>
                  <li>
                    <code className='bg-gray-800 px-2 py-1 rounded text-teal-300'>
                      cena &gt; 100
                    </code>{" "}
                    - Dragi izdelki
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenericXMLParserComponent;
