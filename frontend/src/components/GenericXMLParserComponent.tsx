import React, { useRef, useState } from "react";
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
    <div className='container'>
      <div className='header'>
        <h1>Generični XML Parser & Analyzer</h1>
        <div className='small'>
          Naloži poljubne XML datoteke, povežej podatke in filtriraj rezultate
        </div>
      </div>

      {error && <div className='error'>{error}</div>}

      {loading && <div className='loading'>Nalagam XML datoteke...</div>}

      {/* File Upload */}
      <div className='card'>
        <h3>1. Naloži XML Datoteke</h3>
        <div className='row'>
          <input
            ref={fileInputRef}
            type='file'
            multiple
            accept='.xml'
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Documents Summary */}
      {documents.length > 0 && (
        <div className='card'>
          <h3>2. Naloženi Dokumenti</h3>
          <div className='data-summary'>
            {documents.map((doc, index) => (
              <div key={index} className='data-item'>
                <strong>{doc.filename}</strong>
                <div className='small'>
                  Entitete: {doc.entities.length} | Root: &lt;{doc.rootElement}
                  &gt;
                </div>
                <div className='small'>
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
        <div className='card'>
          <h3>3. Povezovanje Podatkov</h3>

          <div className='row' style={{ marginBottom: "16px" }}>
            <button className='btn' onClick={handleAutoJoin}>
              Avtomatsko Poveži
            </button>
            <button className='btn secondary' onClick={handleCustomJoin}>
              Uporabi Ročne JOIN-e
            </button>
            <button className='btn secondary' onClick={addCustomJoin}>
              Dodaj JOIN
            </button>
          </div>

          {customJoins.length > 0 && (
            <div>
              <h4>JOIN konfiguracija:</h4>
              {customJoins.map((join, index) => (
                <div key={index} className='filter-row'>
                  <select
                    className='input'
                    value={join.sourceDocument}
                    onChange={(e) =>
                      updateCustomJoin(index, "sourceDocument", e.target.value)
                    }>
                    <option value=''>Izvorni dokument</option>
                    {documents.map((doc) => (
                      <option key={doc.filename} value={doc.filename}>
                        {doc.filename}
                      </option>
                    ))}
                  </select>

                  <select
                    className='input'
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

                  <span>→</span>

                  <select
                    className='input'
                    value={join.targetDocument}
                    onChange={(e) =>
                      updateCustomJoin(index, "targetDocument", e.target.value)
                    }>
                    <option value=''>Ciljni dokument</option>
                    {documents.map((doc) => (
                      <option key={doc.filename} value={doc.filename}>
                        {doc.filename}
                      </option>
                    ))}
                  </select>

                  <select
                    className='input'
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
                    className='input'
                    type='text'
                    placeholder='Alias'
                    value={join.alias || ""}
                    onChange={(e) =>
                      updateCustomJoin(index, "alias", e.target.value)
                    }
                  />

                  <button
                    className='btn secondary'
                    onClick={() => removeCustomJoin(index)}>
                    Odstrani
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      {joinedData.length > 0 && (
        <div className='card'>
          <h3>4. Filtriranje</h3>

          <div className='row' style={{ marginBottom: "16px" }}>
            <button className='btn' onClick={handleApplyFilters}>
              Uporabi Filtre
            </button>
            <button className='btn secondary' onClick={handleClearFilters}>
              Počisti Filtre
            </button>
            <button className='btn secondary' onClick={addFilter}>
              Dodaj Filter
            </button>
          </div>

          {filters.map((filter, index) => (
            <div key={index} className='filter-row'>
              <select
                className='input'
                value={filter.field}
                onChange={(e) => updateFilter(index, "field", e.target.value)}>
                <option value=''>Izberi polje</option>
                {availableFields.map((field) => (
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
                }>
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
              />

              <button
                className='btn secondary'
                onClick={() => removeFilter(index)}
                disabled={filters.length === 1}>
                Odstrani
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {filteredData.length > 0 && (
        <div className='card'>
          <h3>5. Rezultati ({filteredData.length})</h3>

          <div className='row' style={{ marginBottom: "16px" }}>
            <button className='btn' onClick={exportJSON}>
              Izvozi JSON
            </button>
            <button className='btn secondary' onClick={exportXML}>
              Izvozi XML
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className='table'>
              <thead>
                <tr>
                  {filteredData[0] &&
                    Object.keys(filteredData[0])
                      .filter((key) => typeof filteredData[0][key] !== "object")
                      .slice(0, 10) // Limit columns for better display
                      .map((key) => <th key={key}>{key}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, 50).map(
                  (
                    item,
                    index // Limit rows for performance
                  ) => (
                    <tr key={index}>
                      {Object.entries(item)
                        .filter(([_, value]) => typeof value !== "object")
                        .slice(0, 10)
                        .map(([key, value]) => (
                          <td key={key}>
                            {value != null ? String(value) : ""}
                          </td>
                        ))}
                    </tr>
                  )
                )}
              </tbody>
            </table>
            {filteredData.length > 50 && (
              <div
                className='small'
                style={{ textAlign: "center", marginTop: "8px" }}>
                Prikazanih je prvih 50 od {filteredData.length} rezultatov
              </div>
            )}
          </div>
        </div>
      )}

      {/* Usage Examples */}
      {documents.length === 0 && (
        <div className='card'>
          <h3>Navodila za Uporabo</h3>
          <div className='small'>
            <p>
              <strong>1. Naloži XML datoteke:</strong> Izberite eno ali več XML
              datotek
            </p>
            <p>
              <strong>2. Poveži podatke:</strong> Uporabite avtomatsko
              povezovanje ali definirajte ročne JOIN-e
            </p>
            <p>
              <strong>3. Filtriraj:</strong> Dodajte filtre za iskanje
              specifičnih podatkov
            </p>
            <p>
              <strong>4. Izvozi:</strong> Shranite rezultate v JSON ali XML
              format
            </p>

            <h4>Primeri filtrov:</h4>
            <ul>
              <li>
                <code>zaloga &lt; 5</code> - Izdelki z majhno zalogo
              </li>
              <li>
                <code>status = "V obdelavi"</code> - Naročila v obdelavi
              </li>
              <li>
                <code>kategorija vsebuje "Avto"</code> - Avtomobilska oprema
              </li>
              <li>
                <code>cena &gt; 100</code> - Dragi izdelki
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenericXMLParserComponent;
