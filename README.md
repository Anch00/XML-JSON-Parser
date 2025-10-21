# 🧩 XML Parser & Analyzer

Pametna React + TypeScript aplikacija za **analizo, povezovanje in filtriranje XML podatkov** — direktno v brskalniku.  
💡 Naloži svoje XML datoteke, poveži podatke, uporabi napredne filtre in izvozi rezultate v JSON ali XML.

---

## 🚀 Ključne Funkcionalnosti

### 🗂️ Pametno delo z XML datotekami

- Podpora za **več datotek hkrati** (artikli, naročila, stranke, …)
- Samodejno **prepoznavanje struktur** in **povezovanje prek ID-jev**
- Brez strežnika – vse se izvaja **lokalno v brskalniku**

### 🔍 Napredno filtriranje

- Podpira **številčne, besedilne, datum in boolean** filtre
- Operacije: `vsebuje`, `=`, `>`, `<`, `≥`, `≤`
- Možnost kombiniranja več filtrov
- Instantno prikazovanje rezultatov

### 🔗 Povezovanje podatkov

- Denormalizacija XML struktur za lažjo analizo
- Samodejno povezovanje entitet na podlagi **unikatnih ID-jev**
- Vizualno urejeni rezultati v tabelah

### 📤 Izvoz podatkov

- Izvoz **filtriranih rezultatov** v:
  - **JSON (`filtrirano.json`)**
  - **XML (`filtrirano.xml`)**

# 🧩 XML Parser & Analyzer

Pametna **React + TypeScript** aplikacija za **analizo, povezovanje in filtriranje XML podatkov** — neposredno v brskalniku.

💡 Naloži svoje XML datoteke, aplikacija jih samodejno razbere, poveže po ID-jih, omogoči napredno filtriranje in izvoz v **JSON** ali **XML** format.  
Popolno orodje za hitro analizo strukturiranih podatkov brez programiranja in brez backenda.

---

## 🚀 Ključne Funkcionalnosti

### 🗂️ Pametno delo z XML datotekami

- Podpora za **več datotek hkrati**
- Samodejno **prepoznavanje strukture** in povezovanje prek ID atributov
- Brez strežnika – vse se izvaja **lokalno v brskalniku**
- Deluje z **vsemi vrstami XML struktur**

### 🔍 Napredno filtriranje

- Dinamični filtri po poljubnih poljih
- Operacije: `vsebuje`, `=`, `>`, `<`, `≥`, `≤`
- Samodejno prilagajanje tipov (npr. številke, datumi, boolean)
- Instantni prikaz rezultatov med tipkanjem

### 🔗 Povezovanje podatkov

- Avtomatska **denormalizacija XML dokumentov**
- Povezovanje entitet prek unikatnih **ID-jev** (npr. `artikelId`, `strankaId`)
- Združevanje povezanih podatkov v enoten pregled

### 📤 Izvoz rezultatov

- Izvoz **filtriranih rezultatov** v:
  - 📄 **JSON (`filtrirano.json`)**
  - 📄 **XML (`filtrirano.xml`)**
- Prenos datotek direktno iz brskalnika, brez dodatnih orodij

### 💡 Dodatno

- **Modern UI** (responsive dizajn, jasne tabele, ikone)
- **Napredna validacija XML** in obravnava napak
- **Vizualni loading states**
- Optimizirano za **velike količine podatkov**
- Deluje v vseh sodobnih brskalnikih

---

## 🧠 Primeri filtrov

| Primer filtra                  | Opis                                 |
| ------------------------------ | ------------------------------------ |
| `zaloga < 5`                   | Artikli z majhno zalogo              |
| `status = "V obdelavi"`        | Naročila, ki so še v obdelavi        |
| `drzava = "Slovenija"`         | Dobavitelji iz Slovenije             |
| `datumNarocila > "2024-10-01"` | Naročila po določenem datumu         |
| `kategorija vsebuje "Tech"`    | Artikli v kategoriji z besedo "Tech" |

---

## 📁 Mock podatki (za testiranje)

V mapi [`/data`](./data) so priložene testne datoteke, s katerimi lahko hitro preizkusiš aplikacijo:

- `artikli.xml`
- `dobavitelji.xml`
- `narocila.xml`
- `stranke.xml`

Primer strukture:

```xml
<artikel id="ART001">
  <naziv>Prenosnik Lenovo ThinkPad</naziv>
  <cena>899.99</cena>
  <zaloga>12</zaloga>
  <dobaviteljId>DOB001</dobaviteljId>
  <datumDodajanja>2024-01-15</datumDodajanja>
  <aktivn>true</aktivn>
</artikel>
```

## 🛠️ Tehnologije

| Področje      | Uporabljeno orodje / knjižnica      |
| ------------- | ----------------------------------- |
| Frontend      | React 18 + TypeScript               |
| Build Tool    | Vite                                |
| XML Parsing   | Native DOM Parser API               |
| CSS Framework | Tailwind CSS (modern responsive UI) |
| Deployment    | Lokalni razvoj (brez backenda)      |

## ⚙️ Namestitev in zagon

1️⃣ Kloniraj projekt

```bash
git clone https://github.com/Anch00/XML-JSON-Parser.git
cd xml_parser
```

2️⃣ Backend (opcijsko) - namestitev in zagon

Če želite uporabiti tudi strežnik (npr. za server-side upload ali export), namestite in zaženite backend:

```cmd
cd backend
npm install
npm start
```

Namigi za backend:

- Privzeti port: backend privzeto posluša na portu **3000**. Če želite zagnati na drugem portu v cmd.exe:

```cmd
set PORT=4000
npm start
```

- Samodejni restart: za razvoj lahko uporabite `nodemon` (globalno ali kot dev-dependency):

```cmd
npm install -g nodemon
nodemon index.js
```

- Uploads: strežnik uporablja mapo `backend/uploads/` za začasno shranjevanje naloženih datotek. Poskrbite, da mapa obstaja in ima zapisovalne pravice.

- Primeri API endpointov (če strežnik deluje):

  - `POST /api/upload` — sprejme multipart upload XML datotek
  - `POST /api/join` — prejme dokumente in mapping, vrne združene rezultate kot JSON
  - `POST /api/filter` — uporabi filtre na združenih rezultatih
  - `GET /api/export/json` — prenese zadnje filtrirane rezultate v JSON
  - `GET /api/export/xml` — prenese zadnje filtrirane rezultate v saniranem XML formatu

- Če naletite na napako `EADDRINUSE`, preverite kateri proces uporablja port in ga ustavite ali uporabite drug port. Na Windows cmd:

```cmd
netstat -ano | findstr :3000
taskkill /PID <pid> /F
```

3️⃣ Frontend - namestitev in zagon

```bash
cd frontend
npm install
npm run dev
```

4️⃣ Odpri aplikacijo

```text
http://localhost:5173
```

## 🧭 Navodila za uporabo

- Klikni "Choose Files" ali povleci XML datoteke v aplikacijo

- Po nalaganju klikni "Poveži podatke"

- Nastavi filter (npr. zaloga < 10 ali datum > 2024-01-01)

- Preglej rezultate v pregledni tabeli

- Izvozi rezultate z gumbi:

- 💾 "Izvozi JSON"

- 💾 "Izvozi XML"

## 🔧 Razvojni ukazi

```bash
# Zagon aplikacije
npm run dev

# Build za produkcijo
npm run build

# Predogled produkcijske verzije
npm run preview

# Preverjanje tipov
npx tsc --noEmit
```

## 🧩 Standardi in smernice razvoja

- Koda napisana v TypeScript za varnost tipov

- Komponente v skladu s React Hooks principom

- Modularna arhitektura: components, utils, types

- Koda formatirana z Prettier + ESLint

- UI v skladu z Tailwind standardi (mobile-first pristop)

- Polno client-side delovanje – brez zunanjih API-jev

## 🤝 Prispevanje

Veseli bomo tvojih idej in izboljšav!
Sledi standardnemu postopku:

- Forkaj projekt

- Ustvari branch: `feature/nova-funkcija`

- Commitaj spremembe:

```bash
git commit -m "Dodana nova funkcionalnost"
```

- Pushaj branch:

```bash
git push origin feature/nova-funkcija
```

- Odpri Pull Request 🚀

## 🧩 Vizualni vtis aplikacije

- 💻 Moderni dizajn
- 🪶 Čist uporabniški vmesnik
- 📊 Pregledne tabele
- 🎨 Sodobna barvna shema (Tailwind)

Uporabniku prijazno orodje, ki kombinira moč XML struktur z enostavnostjo sodobnih spletnih tehnologij.

## 📄 Licenca

Projekt je objavljen pod MIT licenco.
Lahko uporabljaš, spreminjaš in deliš, dokler ohraniš obvestilo o avtorstvu.

## 👨‍💻 Avtor

Jan Ančevski
Fakulteta za elektrotehniko, računalništvo in informatiko (FERI)
Predmet: Tehnike in izgradnja digitalnih storitev (TIDS)
🌐 GitHub: @Anch00

⭐️ Če ti je aplikacija všeč, pusti zvezdico na GitHubu!
