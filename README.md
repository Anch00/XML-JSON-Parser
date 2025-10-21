# XML Parser & Analyzer

Moderna TypeScript React aplikacija za delo z XML dokumenti, povezovanje podatkov in filtriranje rezultatov.

## 🚀 Funkcionalnosti

### ✅ XML Dokumenti

- **4 povezane XML datoteke**: artikli.xml, dobavitelji.xml, narocila.xml, stranke.xml
- **15+ zapisov** v vsaki datoteki
- **Unikatni ID atributi** za povezovanje
- **Datum polja** v formatu YYYY-MM-DD
- **Različni tipi podatkov**: numerični, besedilni, boolean
- **Prazne vrednosti** in manjkajoči podatki

### 🔗 Povezovanje Podatkov

- Avtomatsko **povezovanje prek ID-jev**
- Združevanje podatkov iz različnih XML datotek
- **Denormalizacija** za lažje filtriranje

### 🔍 Filtriranje

Podprte operacije:

- `vsebuje` - besedilno iskanje
- `=` - enakost
- `>` - večje od
- `<` - manjše od
- `≥` - večje ali enako
- `≤` - manjše ali enako

**Predlagani filtri:**

- `zaloga < 5` - artikli z majhno zalogo
- `kategorija vsebuje "Periferija"` - artikli iz določene kategorije
- `status = "V obdelavi"` - naročila v obdelavi
- `drzava = "Slovenija"` - dobavitelji iz Slovenije
- `aktivn = true` - aktivne entitete

### 📤 Izvoz Rezultatov

- **JSON format**: `filtrirano.json`
- **XML format**: `filtrirano.xml`
- Direktno prenašanje v brskalniku

## 🛠 Tehnologije

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **CSS**: Moderní responsive design
- **XML Parsing**: Native DOM Parser API
- **No Backend Required**: Celotna logika v brskalniku

## 📁 Struktura Projekta

```
xml_parser/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── XMLParserComponent.tsx
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   └── xmlParser.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── styles.css
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
└── data/
    ├── artikli.xml
    ├── dobavitelji.xml
    ├── narocila.xml
    └── stranke.xml
```

## 🚀 Namestitev in Zagon

### Predpogoji

- Node.js 16+
- npm ali yarn

### Koraki

1. **Kloniraj projekt**

   ```bash
   git clone <repository-url>
   cd xml_parser
   ```

2. **Namesti odvisnosti**

   ```bash
   cd frontend
   npm install
   ```

3. **Zaženi aplikacijo**

   ```bash
   npm run dev
   ```

4. **Odpri v brskalniku**
   ```
   http://localhost:5173
   ```

## 📖 Navodila za Uporabo

### 1. Naloži XML Datoteke

- Klikni na "Choose Files" ali povleci datoteke
- Izberi vse XML datoteke naenkrat (`artikli.xml`, `dobavitelji.xml`, `narocila.xml`, `stranke.xml`)
- Aplikacija avtomatsko razpozna tip datoteke po imenu

### 2. Poveži Podatke

- Ko so datoteke naložene, klikni "Poveži Podatke"
- Aplikacija avtomatsko poveže podatke prek ID-jev

### 3. Filtriraj Rezultate

- Izberi polje za filtriranje iz dropdown menija
- Izberi operacijo (vsebuje, =, >, <, ≥, ≤)
- Vnesi vrednost za primerjavo
- Klikni "Uporabi Filtre"

### 4. Izvozi Rezultate

- Klikni "Izvozi JSON" za JSON format
- Klikni "Izvozi XML" za XML format

## 📊 Struktura XML Datotek

### artikli.xml

```xml
<artikel id="ART001">
  <naziv>Prenosnik Lenovo ThinkPad</naziv>
  <cena>899.99</cena>
  <zaloga>12</zaloga>
  <dobaviteljId>DOB001</dobaviteljId>
  <kategorija>Računalniki</kategorija>
  <datumDodajanja>2024-01-15</datumDodajanja>
  <aktivn>true</aktivn>
  <!-- ... -->
</artikel>
```

### dobavitelji.xml

```xml
<dobavitelj id="DOB001">
  <naziv>TechnoWorld d.o.o.</naziv>
  <email>info@technoworld.si</email>
  <datumSklenitve>2020-03-15</datumSklenitve>
  <aktivn>true</aktivn>
  <!-- ... -->
</dobavitelj>
```

### narocila.xml

```xml
<narocilo id="NAR001">
  <strankaId>STR001</strankaId>
  <artikelId>ART001</artikelId>
  <dobaviteljId>DOB001</dobaviteljId>
  <datumNarocila>2024-10-15</datumNarocila>
  <status>Poslano</status>
  <!-- ... -->
</narocilo>
```

### stranke.xml

```xml
<stranka id="STR001">
  <ime>Marko</ime>
  <priimek>Novak</priimek>
  <email>marko.novak@example.com</email>
  <datumRegistracije>2023-03-15</datumRegistracije>
  <aktivn>true</aktivn>
  <!-- ... -->
</stranka>
```

## 🎯 Primeri Filtrov

| Filter                            | Opis                    | Rezultat                           |
| --------------------------------- | ----------------------- | ---------------------------------- |
| `zaloga < 5`                      | Artikli z majhno zalogo | Artikli kjer je zaloga manjša od 5 |
| `kategorija vsebuje "Periferija"` | Periferijska oprema     | Miške, tipkovnice, webcam          |
| `status = "V obdelavi"`           | Naročila v obdelavi     | Neobdelana naročila                |
| `drzava = "Slovenija"`            | Slovenski dobavitelji   | Lokalni partnerji                  |
| `skupnaCena > 200`                | Velika naročila         | Naročila nad 200€                  |
| `datumNarocila > "2024-10-01"`    | Nedavna naročila        | Oktobra 2024 in novejša            |

## 💡 TypeScript Prednosti

- **Type Safety**: Preverjanje tipov med razvojem
- **IntelliSense**: Avtomatsko dokončanje kode
- **Refactoring**: Varno preimenovanje
- **Interface Definitions**: Jasna struktura podatkov
- **Compile-time Errors**: Zgodnje odkrivanje napak

## 🔧 Razvojni Ukazi

```bash
# Razvoj
npm run dev

# Gradnja za produkcijo
npm run build

# Predogled produkcije
npm run preview

# TypeScript preverjanje
npx tsc --noEmit
```

## 📝 Dodatne Funkcionalnosti

- **Responsive Design**: Optimizirano za vse naprave
- **Error Handling**: Jasna sporočila o napakah
- **Loading States**: Vizualni indikatorji nalaganja
- **Data Validation**: Preverjanje veljavnosti XML
- **Performance**: Optimizirano za velike podatke

## 🤝 Prispevanje

1. Fork repository
2. Ustvari feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit spremembe (`git commit -m 'Add some AmazingFeature'`)
4. Push v branch (`git push origin feature/AmazingFeature`)
5. Odpri Pull Request

## 📄 Licenca

Ta projekt je licenciran pod MIT licenco.

## 👨‍💻 Avtor

Ustvarjeno za predmet **Tehnike in izgradnja digitalnih storitev (TIDS)**
FERI - Fakulteta za elektrotehniko, računalništvo in informatiko
