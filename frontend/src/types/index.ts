// Generic XML Document Interface
export interface XMLDocument {
  filename: string;
  rootElement: string;
  entities: XMLEntity[];
  fields: string[];
}

export interface XMLEntity {
  id: string;
  [key: string]: any; // Allow any field dynamically
}

export interface JoinConfig {
  sourceDocument: string;
  targetDocument: string;
  sourceField: string;
  targetField: string;
  alias?: string;
}

export interface FilterCriteria {
  field: string;
  operator:
  | "contains"
  | "equals"
  | "greaterThan"
  | "lessThan"
  | "greaterEqual"
  | "lessEqual";
  value: string | number | boolean;
}

export interface JoinedData {
  [key: string]: any;
}

// Legacy interfaces for backward compatibility
export interface Artikel {
  id: string;
  naziv: string;
  cena: number;
  zaloga: number;
  dobaviteljId: string;
  kategorija: string;
  datumDodajanja: string;
  opis?: string;
  aktivn: boolean;
  datumZadnjeNabave?: string;
  dobavitelj?: Dobavitelj;
}

export interface Dobavitelj {
  id: string;
  naziv: string;
  naslov: string;
  telefon: string;
  email: string;
  kontaktnaOseba: string;
  datumSklenitve: string;
  aktivn: boolean;
  popust: number;
  kategorije: string;
  ocena: number;
  drzava: string;
  davcnaStevilka: string;
  placilniPogoji: string;
  opomba?: string;
}

export interface Narocilo {
  id: string;
  strankaId: string;
  artikelId: string;
  dobaviteljId: string;
  datumNarocila: string;
  kolicina: number;
  cenaPoKos: number;
  skupnaCena: number;
  status: string;
  datumDostave?: string;
  naslovDostave: string;
  opomba?: string;
  placilniNacin: string;
  popust: number;
  davek: number;
  stranka?: Stranka;
  artikel?: Artikel;
  dobavitelj?: Dobavitelj;
}

export interface Stranka {
  id: string;
  ime: string;
  priimek: string;
  email: string;
  telefon: string;
  naslov: string;
  datumRegistracije: string;
  aktivn: boolean;
  tipStranke: string;
  popust: number;
  skupniNakupi: number;
  datumZadnjegaNakupa: string;
  opomba?: string;
}

// Trip planner types (LLM JSON shape)
export interface TripActivity {
  time: string; // HH:MM
  title: string;
  type:
  | "sightseeing"
  | "museum"
  | "food"
  | "outdoor"
  | "shopping"
  | "transport"
  | "other";
  address: string;
  durationMinutes: number;
  notes?: string;
  costEstimate?: number;
}

export interface TripDayPlan {
  date: string; // ISO yyyy-mm-dd
  weatherNote: string;
  summary: string;
  activities: TripActivity[];
}

export interface TripPlan {
  destination: string;
  startDate: string; // ISO yyyy-mm-dd
  endDate: string; // ISO yyyy-mm-dd
  days: TripDayPlan[];
  tips: string[];
  _generatedAt?: string; // metadata
}
