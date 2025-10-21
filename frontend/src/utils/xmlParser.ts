import {
  Artikel,
  Dobavitelj,
  FilterCriteria,
  JoinedData,
  Narocilo,
  Stranka,
} from "../types";

export class XMLParser {
  static parseXMLString(xmlString: string): Document {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    // Check for parsing errors
    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      throw new Error(`XML Parse Error: ${parseError.textContent}`);
    }

    return xmlDoc;
  }

  static parseArtikli(xmlString: string): Artikel[] {
    const xmlDoc = this.parseXMLString(xmlString);
    const artikli: Artikel[] = [];

    const artikelElements = xmlDoc.getElementsByTagName("artikel");

    for (let i = 0; i < artikelElements.length; i++) {
      const element = artikelElements[i];

      const artikel: Artikel = {
        id: element.getAttribute("id") || "",
        naziv: this.getElementText(element, "naziv"),
        cena: parseFloat(this.getElementText(element, "cena")) || 0,
        zaloga: parseInt(this.getElementText(element, "zaloga")) || 0,
        dobaviteljId: this.getElementText(element, "dobaviteljId"),
        kategorija: this.getElementText(element, "kategorija"),
        datumDodajanja: this.getElementText(element, "datumDodajanja"),
        opis: this.getElementText(element, "opis") || undefined,
        aktivn: this.getElementText(element, "aktivn") === "true",
        datumZadnjeNabave:
          this.getElementText(element, "datumZadnjeNabave") || undefined,
      };

      artikli.push(artikel);
    }

    return artikli;
  }

  static parseDobavitelji(xmlString: string): Dobavitelj[] {
    const xmlDoc = this.parseXMLString(xmlString);
    const dobavitelji: Dobavitelj[] = [];

    const dobaviteljElements = xmlDoc.getElementsByTagName("dobavitelj");

    for (let i = 0; i < dobaviteljElements.length; i++) {
      const element = dobaviteljElements[i];

      const dobavitelj: Dobavitelj = {
        id: element.getAttribute("id") || "",
        naziv: this.getElementText(element, "naziv"),
        naslov: this.getElementText(element, "naslov"),
        telefon: this.getElementText(element, "telefon"),
        email: this.getElementText(element, "email"),
        kontaktnaOseba: this.getElementText(element, "kontaktnaOseba"),
        datumSklenitve: this.getElementText(element, "datumSklenitve"),
        aktivn: this.getElementText(element, "aktivn") === "true",
        popust: parseFloat(this.getElementText(element, "popust")) || 0,
        kategorije: this.getElementText(element, "kategorije"),
        ocena: parseFloat(this.getElementText(element, "ocena")) || 0,
        drzava: this.getElementText(element, "drzava"),
        davcnaStevilka: this.getElementText(element, "davcnaStevilka"),
        placilniPogoji: this.getElementText(element, "placilniPogoji"),
        opomba: this.getElementText(element, "opomba") || undefined,
      };

      dobavitelji.push(dobavitelj);
    }

    return dobavitelji;
  }

  static parseNarocila(xmlString: string): Narocilo[] {
    const xmlDoc = this.parseXMLString(xmlString);
    const narocila: Narocilo[] = [];

    const narociloElements = xmlDoc.getElementsByTagName("narocilo");

    for (let i = 0; i < narociloElements.length; i++) {
      const element = narociloElements[i];

      const narocilo: Narocilo = {
        id: element.getAttribute("id") || "",
        strankaId: this.getElementText(element, "strankaId"),
        artikelId: this.getElementText(element, "artikelId"),
        dobaviteljId: this.getElementText(element, "dobaviteljId"),
        datumNarocila: this.getElementText(element, "datumNarocila"),
        kolicina: parseInt(this.getElementText(element, "kolicina")) || 0,
        cenaPoKos: parseFloat(this.getElementText(element, "cenaPoKos")) || 0,
        skupnaCena: parseFloat(this.getElementText(element, "skupnaCena")) || 0,
        status: this.getElementText(element, "status"),
        datumDostave: this.getElementText(element, "datumDostave") || undefined,
        naslovDostave: this.getElementText(element, "naslovDostave"),
        opomba: this.getElementText(element, "opomba") || undefined,
        placilniNacin: this.getElementText(element, "placilniNacin"),
        popust: parseFloat(this.getElementText(element, "popust")) || 0,
        davek: parseFloat(this.getElementText(element, "davek")) || 0,
      };

      narocila.push(narocilo);
    }

    return narocila;
  }

  static parseStranke(xmlString: string): Stranka[] {
    const xmlDoc = this.parseXMLString(xmlString);
    const stranke: Stranka[] = [];

    const strankaElements = xmlDoc.getElementsByTagName("stranka");

    for (let i = 0; i < strankaElements.length; i++) {
      const element = strankaElements[i];

      const stranka: Stranka = {
        id: element.getAttribute("id") || "",
        ime: this.getElementText(element, "ime"),
        priimek: this.getElementText(element, "priimek"),
        email: this.getElementText(element, "email"),
        telefon: this.getElementText(element, "telefon"),
        naslov: this.getElementText(element, "naslov"),
        datumRegistracije: this.getElementText(element, "datumRegistracije"),
        aktivn: this.getElementText(element, "aktivn") === "true",
        tipStranke: this.getElementText(element, "tipStranke"),
        popust: parseFloat(this.getElementText(element, "popust")) || 0,
        skupniNakupi:
          parseFloat(this.getElementText(element, "skupniNakupi")) || 0,
        datumZadnjegaNakupa: this.getElementText(
          element,
          "datumZadnjegaNakupa"
        ),
        opomba: this.getElementText(element, "opomba") || undefined,
      };

      stranke.push(stranka);
    }

    return stranke;
  }

  private static getElementText(parent: Element, tagName: string): string {
    const element = parent.getElementsByTagName(tagName)[0];
    return element?.textContent?.trim() || "";
  }
}

export class DataJoiner {
  static joinData(
    artikli: Artikel[],
    dobavitelji: Dobavitelj[],
    narocila: Narocilo[],
    stranke: Stranka[]
  ): JoinedData[] {
    // Create lookup maps for better performance
    const dobaviteljiMap = new Map(dobavitelji.map((d) => [d.id, d]));
    const artikliMap = new Map(artikli.map((a) => [a.id, a]));
    const strankeMap = new Map(stranke.map((s) => [s.id, s]));

    // Join artikli with dobavitelji
    const artikliWithDobavitelji = artikli.map((artikel) => ({
      ...artikel,
      dobavitelj: dobaviteljiMap.get(artikel.dobaviteljId),
    }));

    // Join narocila with all related data
    const joinedNarocila = narocila.map((narocilo) => {
      const artikel = artikliMap.get(narocilo.artikelId);
      const dobavitelj = dobaviteljiMap.get(narocilo.dobaviteljId);
      const stranka = strankeMap.get(narocilo.strankaId);

      return {
        ...narocilo,
        artikel: artikel
          ? {
              ...artikel,
              dobavitelj: dobaviteljiMap.get(artikel.dobaviteljId),
            }
          : undefined,
        dobavitelj,
        stranka,
        // Flattened fields for easier filtering
        artikelNaziv: artikel?.naziv,
        artikelKategorija: artikel?.kategorija,
        dobaviteljNaziv: dobavitelj?.naziv,
        dobaviteljDrzava: dobavitelj?.drzava,
        strankaIme: stranka ? `${stranka.ime} ${stranka.priimek}` : undefined,
        strankaTip: stranka?.tipStranke,
      };
    });

    return [...artikliWithDobavitelji, ...joinedNarocila];
  }
}

export class DataFilter {
  static applyFilters(
    data: JoinedData[],
    filters: FilterCriteria[]
  ): JoinedData[] {
    return data.filter((item) => {
      return filters.every((filter) => {
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
        return value === filterValue;
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

export class XMLExporter {
  static exportToXML(
    data: JoinedData[],
    rootElement: string = "results"
  ): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${this.safeTagName(
      rootElement
    )}>\n`;

    const indent = (level: number) => "  ".repeat(level);

    const serializeValue = (key: string, value: any, level: number): string => {
      if (value == null) return "";

      const tag = this.safeTagName(key);

      // Primitive value
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        return `${indent(level)}<${tag}>${this.escapeXML(
          String(value)
        )}</${tag}>\n`;
      }

      // Array - emit repeated child elements
      if (Array.isArray(value)) {
        let out = `${indent(level)}<${tag}>\n`;
        value.forEach((el) => {
          if (
            typeof el === "string" ||
            typeof el === "number" ||
            typeof el === "boolean"
          ) {
            out += `${indent(level + 1)}<value>${this.escapeXML(
              String(el)
            )}</value>\n`;
          } else if (typeof el === "object") {
            out += `${indent(level + 1)}<item>\n`;
            Object.entries(el).forEach(([k, v]) => {
              out += serializeValue(k, v, level + 2);
            });
            out += `${indent(level + 1)}</item>\n`;
          }
        });
        out += `${indent(level)}</${tag}>\n`;
        return out;
      }

      // Object - serialize properties as nested elements
      if (typeof value === "object") {
        let out = `${indent(level)}<${tag}>\n`;
        Object.entries(value).forEach(([k, v]) => {
          out += serializeValue(k, v, level + 1);
        });
        out += `${indent(level)}</${tag}>\n`;
        return out;
      }

      return "";
    };

    data.forEach((item, index) => {
      // Normalize item before serializing to handle legacy dynamic keys
      const normalizedItem = this.normalizeForExport(item);

      const itemId = (normalizedItem as any).id || index + 1;
      xml += `${indent(1)}<item id="${this.escapeXML(String(itemId))}">\n`;

      Object.entries(normalizedItem).forEach(([key, value]) => {
        // Skip internal id field already used as attribute if present
        if (key === "id") return;
        xml += serializeValue(key, value, 2);
      });

      xml += `${indent(1)}</item>\n`;
    });

    xml += `</${this.safeTagName(rootElement)}>`;
    return xml;
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
   * Make a string safe to use as an XML tag name.
   * Replaces invalid characters with underscores and ensures the name doesn't start with a digit.
   */
  private static safeTagName(name: string): string {
    if (!name) return "node";
    // Replace characters not allowed in XML names with underscore
    // Allow letters, digits, underscore, hyphen and dot
    let safe = String(name).replace(/[^A-Za-z0-9_\-\.]/g, "_");
    // Name must not start with a digit, dot or hyphen
    if (/^[0-9\.-]/.test(safe)) {
      safe = `_${safe}`;
    }
    return safe;
  }

  /**
   * Normalize an item object produced by joins so that any legacy keys like
   * `dobavitelj_<name>` or `dobavitelj_id` are converted into a nested
   * `dobavitelj: { id, naziv }` object. This makes export stable and valid.
   */
  private static normalizeForExport(item: any): any {
    if (!item || typeof item !== "object") return item;

    const normalized: any = { ...item };

    // If there are keys that start with 'dobavitelj_' (legacy), prefer
    // extracting the human-readable name and set it under normalized.dobavitelj.naziv
    const supplierNameKey = Object.keys(normalized).find((k) =>
      k.startsWith("dobavitelj_")
    );

    if (supplierNameKey) {
      const naziv = normalized[supplierNameKey];
      // ensure dobavitelj object exists
      normalized.dobavitelj = normalized.dobavitelj || {};
      if (!normalized.dobavitelj.naziv) normalized.dobavitelj.naziv = naziv;
      // remove the legacy dynamic key
      delete normalized[supplierNameKey];
    }

    // If there is dobavitelj_id (possibly duplicate), move it into dobavitelj.id
    if (normalized["dobavitelj_id"]) {
      normalized.dobavitelj = normalized.dobavitelj || {};
      if (!normalized.dobavitelj.id)
        normalized.dobavitelj.id = normalized["dobavitelj_id"];
      delete normalized["dobavitelj_id"];
    }

    // If dobaviteljId exists, ensure dobavitelj.id is set
    if (normalized["dobaviteljId"]) {
      normalized.dobavitelj = normalized.dobavitelj || {};
      if (!normalized.dobavitelj.id)
        normalized.dobavitelj.id = normalized["dobaviteljId"];
    }

    return normalized;
  }
}

export class JSONExporter {
  static exportToJSON(data: JoinedData[]): string {
    return JSON.stringify(data, null, 2);
  }
}
