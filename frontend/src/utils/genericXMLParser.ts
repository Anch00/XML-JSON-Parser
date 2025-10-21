import {
  FilterCriteria,
  JoinConfig,
  JoinedData,
  XMLDocument,
  XMLEntity,
} from "../types";

export class GenericXMLParser {
  /**
   * Parse any XML document generically
   */
  static parseXMLDocument(xmlString: string, filename: string): XMLDocument {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    // Check for parsing errors
    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      throw new Error(`XML Parse Error: ${parseError.textContent}`);
    }

    const rootElement = xmlDoc.documentElement;
    const rootElementName = rootElement.tagName;

    // Get all child elements (assuming they are the main entities)
    const entityElements = Array.from(rootElement.children);
    const entities: XMLEntity[] = [];
    const fieldsSet = new Set<string>();

    entityElements.forEach((element) => {
      const entity: XMLEntity = {
        id:
          element.getAttribute("id") ||
          element.getAttribute("ID") ||
          `${entities.length + 1}`,
      };

      // Extract all child elements as fields
      Array.from(element.children).forEach((child) => {
        const fieldName = child.tagName;
        const fieldValue = child.textContent?.trim() || "";

        fieldsSet.add(fieldName);

        // Try to convert to appropriate type
        entity[fieldName] = this.convertValue(fieldValue);
      });

      // Also extract attributes
      Array.from(element.attributes).forEach((attr) => {
        if (attr.name !== "id" && attr.name !== "ID") {
          fieldsSet.add(attr.name);
          entity[attr.name] = this.convertValue(attr.value);
        }
      });

      entities.push(entity);
    });

    return {
      filename,
      rootElement: rootElementName,
      entities,
      fields: Array.from(fieldsSet),
    };
  }

  /**
   * Convert string value to appropriate type
   */
  private static convertValue(value: string): any {
    if (value === "") return "";
    if (value === "true") return true;
    if (value === "false") return false;

    // Check if it's a number
    const num = Number(value);
    if (!isNaN(num) && isFinite(num)) {
      return num;
    }

    // Check if it's a date (YYYY-MM-DD format)
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value; // Keep as string for now
    }

    return value;
  }

  /**
   * Get all available fields from documents
   */
  static getAllFields(documents: XMLDocument[]): string[] {
    const fieldsSet = new Set<string>();

    documents.forEach((doc) => {
      doc.fields.forEach((field) => fieldsSet.add(field));
      fieldsSet.add("id"); // Always include ID
    });

    return Array.from(fieldsSet).sort();
  }

  /**
   * Auto-detect possible join relationships
   */
  static detectPossibleJoins(documents: XMLDocument[]): JoinConfig[] {
    const joins: JoinConfig[] = [];

    documents.forEach((sourceDoc) => {
      documents.forEach((targetDoc) => {
        if (sourceDoc.filename === targetDoc.filename) return;

        sourceDoc.fields.forEach((sourceField) => {
          // Look for fields that might reference other documents
          if (
            sourceField.toLowerCase().includes("id") &&
            sourceField !== "id"
          ) {
            // Try to match with target document
            const targetDocName = targetDoc.rootElement.toLowerCase();
            const sourceFieldLower = sourceField.toLowerCase();

            if (
              sourceFieldLower.includes(targetDocName.slice(0, -1)) || // Remove plural ending
              sourceFieldLower.includes(targetDocName)
            ) {
              joins.push({
                sourceDocument: sourceDoc.filename,
                targetDocument: targetDoc.filename,
                sourceField: sourceField,
                targetField: "id",
                alias: targetDoc.rootElement.slice(0, -1), // Remove plural ending
              });
            }
          }
        });
      });
    });

    return joins;
  }
}

export class GenericDataJoiner {
  /**
   * Join documents based on join configurations
   */
  static joinDocuments(
    documents: XMLDocument[],
    joins: JoinConfig[]
  ): JoinedData[] {
    if (documents.length === 0) return [];

    // Start with the first document as base
    const baseDoc = documents[0];
    let result: JoinedData[] = baseDoc.entities.map((entity) => ({
      ...entity,
    }));

    // Apply each join
    joins.forEach((join) => {
      const sourceDoc = documents.find(
        (d) => d.filename === join.sourceDocument
      );
      const targetDoc = documents.find(
        (d) => d.filename === join.targetDocument
      );

      if (!sourceDoc || !targetDoc) return;

      // Create lookup map for target document
      const targetMap = new Map();
      targetDoc.entities.forEach((entity) => {
        const key = entity[join.targetField];
        if (key) {
          targetMap.set(String(key), entity);
        }
      });

      // Apply join to result
      result = result.map((item) => {
        const joinKey = item[join.sourceField];
        if (joinKey && targetMap.has(String(joinKey))) {
          const targetEntity = targetMap.get(String(joinKey));
          const rawAlias =
            join.alias || join.targetDocument.replace(".xml", "");

          // Create a safe alias/key to avoid spaces or punctuation being used as object keys
          const alias = String(rawAlias)
            .replace(/[^a-zA-Z0-9_]/g, "_")
            .replace(/^_+/, "");

          // Attach the full target entity under the sanitized alias
          // and also provide stable flattened id and name fields using safe keys
          const nameValue = targetEntity.naziv || targetEntity.name || null;

          return {
            ...item,
            [alias]: targetEntity,
            [`${alias}_id`]: targetEntity.id,
            ...(nameValue ? { [`${alias}_name`]: nameValue } : {}),
          };
        }
        return item;
      });
    });

    return result;
  }

  /**
   * Auto-join all documents using detected relationships
   */
  static autoJoin(documents: XMLDocument[]): JoinedData[] {
    const possibleJoins = GenericXMLParser.detectPossibleJoins(documents);
    return this.joinDocuments(documents, possibleJoins);
  }
}

export class GenericDataFilter {
  /**
   * Apply filters to joined data
   */
  static applyFilters(
    data: JoinedData[],
    filters: FilterCriteria[]
  ): JoinedData[] {
    return data.filter((item) => {
      return filters.every((filter) => {
        if (!filter.field || filter.value === "") return true;

        const value = this.getNestedValue(item, filter.field);
        return this.matchesFilter(value, filter);
      });
    });
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  private static matchesFilter(value: any, filter: FilterCriteria): boolean {
    const { operator, value: filterValue } = filter;

    if (value == null) return false;

    switch (operator) {
      case "contains":
        return String(value)
          .toLowerCase()
          .includes(String(filterValue).toLowerCase());
      case "equals":
        return String(value) === String(filterValue);
      case "greaterThan":
        return Number(value) > Number(filterValue);
      case "lessThan":
        return Number(value) < Number(filterValue);
      case "greaterEqual":
        return Number(value) >= Number(filterValue);
      case "lessEqual":
        return Number(value) <= Number(filterValue);
      default:
        return false;
    }
  }
}

export class GenericExporter {
  /**
   * Export data to JSON
   */
  static exportToJSON(data: JoinedData[]): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Export data to XML
   */
  static exportToXML(
    data: JoinedData[],
    rootElement: string = "filteredResults"
  ): string {
    const safeRoot = this.safeTagName(rootElement);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${safeRoot}>\n`;

    data.forEach((item, index) => {
      const itemId = item.id || index + 1;
      xml += `  <item id="${this.escapeXML(String(itemId))}">\n`;

      const serialize = (obj: any, isRoot = false, indent = "    ") => {
        Object.entries(obj).forEach(([key, value]) => {
          // Only skip id when serializing the root/top-level item (it's used as attribute)
          if (key === "id" && isRoot) return;
          const tag = this.safeTagName(key);

          if (value == null || value === "") {
            xml += `${indent}<${tag}></${tag}>\n`;
          } else if (Array.isArray(value)) {
            // Serialize arrays by repeating tag elements
            value.forEach((v) => {
              if (typeof v === "object") {
                xml += `${indent}<${tag}>\n`;
                serialize(v, false, indent + "  ");
                xml += `${indent}</${tag}>\n`;
              } else {
                xml += `${indent}<${tag}>${this.escapeXML(
                  String(v)
                )}</${tag}>\n`;
              }
            });
          } else if (typeof value === "object") {
            xml += `${indent}<${tag}>\n`;
            serialize(value, false, indent + "  ");
            xml += `${indent}</${tag}>\n`;
          } else {
            xml += `${indent}<${tag}>${this.escapeXML(
              String(value)
            )}</${tag}>\n`;
          }
        });
      };

      serialize(item, true);

      xml += `  </item>\n`;
    });

    xml += `</${safeRoot}>`;
    return xml;
  }

  private static safeTagName(raw: string): string {
    // XML element names must start with a letter or underscore, and contain letters, digits, hyphens, underscores, and periods.
    // Replace invalid characters with underscore and ensure it doesn't start with a digit.
    let s = String(raw || "").trim();
    s = s.replace(/[^A-Za-z0-9_\-.]/g, "_");
    if (/^[0-9]/.test(s)) s = "_" + s;
    if (s === "") s = "field";
    return s;
  }

  private static escapeXML(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Download file in browser
   */
  static downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
