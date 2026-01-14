# 🚗 DriveBeat Trips - Smart Travel Planning Application

**DriveBeat Trips** je pametna aplikacija za načrtovanje potovanj in odkrivanje nenavadnih znamenitosti. Aplikacija združuje več spletnih storitev in tehnologij za pridobivanje podatkov ter omogoča avtomatsko generiranje personaliziranih potovalnih načrtov.

---

## 🌟 Glavne Funkcionalnosti

### 🗺️ DriveBeat - Načrtovanje Potovanj

#### 🔍 Iskanje Atrakcij (Web Scraping)

- Pridobivanje podatkov o nenavadnih turističnih znamenitostih z različnih spletnih virov
- Podpora za različne destinacije (Berlin, London, itd.)
- Shranjevanje najdenih atrakcij za kasnejšo uporabo v načrtovanju
- Izvoz rezultatov v JSON format

#### 🤖 AI Načrtovalec Poti (LLM Integration)

- Uporaba Google Gemini AI za generiranje personaliziranih potovalnih načrtov
- Vnos destinacije, datumov in preferenc
- Avtomatska razporeditev aktivnosti po dnevih
- Vključitev shranjenih atrakcij v načrt
- **Google Maps integracija** - avtomatska generacija poti z vsemi postanki
- Vremenske napovedi in priporočila
- Filtriranje aktivnosti po kategorijah (sightseeing, muzej, hrana, itd.)
- Ocena stroškov in trajanja aktivnosti

### 🔧 Tehnološki Moduli

Aplikacija vključuje demonstracijo različnih tehnologij za pridobivanje in obdelavo podatkov:

#### 📄 XML Parser & Analyzer

- Nalaganje in analiza več XML datotek hkrati
- Avtomatsko povezovanje podatkov (JOIN operacije)
- Napredno filtriranje rezultatov
- Izvoz v JSON ali XML format
- Vizualni prikaz podatkov v tabelah

#### 📊 PC-Axis Vizualizacija

- Branje in analiza .px statističnih datotek
- Grafični prikaz podatkov (grafi, diagrami)
- Interaktivna vizualizacija

#### ⚡ gRPC Demo

- Komunikacija med storitvami preko gRPC protokola
- Hitri RPC klici za izmenjavo podatkov
- Demonstracija moderne storitvene arhitekture

#### 🔌 Named Pipes Demo

- Medprocesna komunikacija preko Named Pipes
- Izmenjava podatkov med procesi

#### 📨 Event-Driven Architecture (RabbitMQ)

- Asinhrona komunikacija preko sporočilne vrste
- Publish/Subscribe vzorec
- Demonstracija dogodkovno vodene arhitekture

---

## 🛠️ Tehnologije

### Frontend

- **React 18** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** (modern responsive design)
- **React Icons** (ikone)
- **Axios** (HTTP klici)
- **Chart.js** (vizualizacija podatkov)

### Backend

- **Node.js** + **Express**
- **Puppeteer** (web scraping)
- **Google Gemini AI** (generiranje potovalnih načrtov)
- **gRPC** (service-to-service communication)
- **RabbitMQ** (message queuing)
- **Fast XML Parser** (XML obdelava)

### Uporabljene Tehnologije za Pridobivanje Podatkov

1. **REST API** - komunikacija z Google Gemini AI
2. **Web Scraping** - Puppeteer za pridobivanje atrakcij
3. **gRPC** - komunikacija med mikroservisi
4. **Event-Driven (RabbitMQ)** - asinhrona izmenjava sporočil
5. **PC-Axis Format** - branje statističnih podatkov

---

## 📋 Zahteve Projekta

Projekt izpolnjuje vse zahteve naloge:

✅ **4+ različnih zunanjih virov podatkov:**

- Web scraping (Atlas Obscura)
- Google Gemini AI API
- PC-Axis statistični podatki
- XML podatkovne datoteke
- gRPC servisi

✅ **3+ različne tehnologije za dostop:**

- REST API
- Web Scraping
- gRPC
- Event-Driven (RabbitMQ)
- PC-Axis parser

✅ **Interaktivni uporabniški vmesnik:**

- Iskanje in filtriranje
- Shranjevanje in uporaba podatkov
- Izvoz rezultatov
- Dinamično generiranje načrtov

✅ **Smiselna celota:**

- Povezava med iskanjem atrakcij in generiranjem načrta
- Logičen pretok podatkov med moduli
- Uporaba podatkov iz različnih virov za eno funkcionalnost

---

## ⚙️ Namestitev in Zagon

### Predpogoji

- Node.js (v18+)
- npm ali yarn
- Google Gemini API ključ

### 1️⃣ Kloniraj projekt

```bash
git clone <repository-url>
cd xml_parser
```

### 2️⃣ Konfiguriraj backend

Ustvari `.env` datoteko v mapi `backend`:

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-flash
PORT=3000
```

### 3️⃣ Namesti odvisnosti

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4️⃣ Zaženi aplikacijo

**Možnost 1: Z priloženimi skrip tami (Windows)**

```bash
# V root direktoriju projekta
start-backend.cmd    # Zažene backend server
start-app.cmd        # Zažene frontend aplikacijo
```

**Možnost 2: Ročno**

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 5️⃣ Odpri aplikacijo

```
Frontend: http://localhost:5173
Backend:  http://localhost:3000
```

---

## 🧭 Navodila za Uporabo

### DriveBeat - Načrtovanje Potovanj

1. **Iskanje Atrakcij:**

   - Pojdi na `DriveBeat > Search Attractions`
   - Izberi destinacijo iz seznama
   - Klikni "Search Attractions"
   - Po končanem iskanju klikni "Save for Planning"

2. **Generiranje Načrta:**

   - Pojdi na `DriveBeat > Generate Plan`
   - Vnesi destinacijo, državo in datume
   - (Opcijsko) Označi checkbox za uporabo shranjenih atrakcij
   - Klikni "Generate Trip Plan"
   - Pregledaj generirani načrt z aktivnostmi, časi in stroški
   - Klikni "View Route on Google Maps" za prikaz poti

3. **Filtriranje Aktivnosti:**
   - V generiranem načrtu uporabi filter za prikaz samo določenih vrst aktivnosti
   - Izberi med: Sightseeing, Museum, Food & Dining, Outdoor, Shopping, Transport, Other

### Moduli - Tehnološke Demonstracije

#### XML Parser

- Naloži XML datoteke (lahko več hkrati)
- Aplikacija avtomatsko poveže podatke po ID-jih
- Nastavi filtre za iskanje specifičnih podatkov
- Izvozi rezultate v JSON ali XML format

#### PC-Axis Vizualizacija

- Naloži .px datoteko
- Pregledaj podatke v tabelah in grafih
- Interaktivna vizualizacija statističnih podatkov

#### gRPC Demo

- Testiraj gRPC komunikacijo med servisi
- Pošilj zahteve in prejemaj odgovore v realnem času

#### Named Pipes & RabbitMQ

- Demonstracija medprocesne komunikacije
- Publish/Subscribe vzorec za asinhrono komunikacijo

---

## 📁 Struktura Projekta

```
xml_parser/
├── backend/
│   ├── handlers/          # Request handlers
│   │   ├── scrapeHandler.js      # Web scraping
│   │   ├── llmPlanHandler.js     # AI trip planning
│   │   ├── pxHandler.js          # PC-Axis parser
│   │   └── ...
│   ├── grpc/              # gRPC services
│   ├── pipes/             # Named Pipes implementation
│   ├── lib/               # Utilities
│   └── index.js           # Main server
│
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── AttractionsComponent.tsx
│   │   │   ├── LLMTripPlanner.tsx
│   │   │   ├── XMLParserComponent.tsx
│   │   │   └── ...
│   │   ├── utils/         # Helper functions
│   │   ├── types/         # TypeScript type definitions
│   │   ├── App.tsx        # Main application
│   │   └── main.tsx       # Entry point
│   └── package.json
│
├── data/                  # Sample data files
│   ├── attractions.xml
│   ├── artikli.xml
│   ├── prenocitvene.px
│   └── ...
│
└── README.md
```

---

## 🔧 Dodatne Funkcionalnosti (Za Prihodnjo Nadgradnjo)

- 🎵 **Spotify Integration** - Ustvarjanje playlist za vožnjo
- 📅 **Google Calendar Export** - Izvoz načrta v koledar
- 🌤️ **OpenWeather API** - Podrobne vremenske napovedi
- 🗺️ **Google Places API** - Dodatne informacije o lokacijah
- 💾 **Podatkovn a Baza** - Shranjevanje uporabniških načrtov

---

## 📝 Licence in Avtorstvo

Projekt razvit za potrebe predmeta **Tehnologije Izmenjave Podatkov in Storitev (TIDS)** na **Fakulteti za Elektrotehniko, Računalništvo in Informatiko (FERI)**, Univerza v Mariboru.

---

## 🤝 Prispevanje

Veseli bomo tvojih idej in izboljšav! Kontaktiraj nas ali odpri issue/pull request.

---

## 📞 Kontakt

Za vprašanja in predloge nas kontaktirajte preko GitHub repozitorija.

---

**Uživaj v načrtovanju potovanj s DriveBeat Trips! 🚗✨**
git commit -m "Dodana nova funkcionalnost"

````

- Pushaj branch:

```bash
git push origin feature/nova-funkcija
````

- Odpri Pull Request 🚀

## 🧩 Vizualni vtis aplikacije

- 💻 Moderni dizajn
- 🪶 Čist uporabniški vmesnik
- 📊 Pregledne tabele
- 🎨 Sodobna barvna shema (Tailwind)

Uporabniku prijazno orodje, ki kombinira moč XML struktur z enostavnostjo sodobnih spletnih tehnologij.

## 👨‍💻 Avtor

Jan Ančevski
Fakulteta za elektrotehniko, računalništvo in informatiko (FERI)
Predmet: Tehnike in izgradnja digitalnih storitev (TIDS)
🌐 GitHub: [@Anch00](https://github.com/Anch00)

⭐️ Če ti je aplikacija všeč, pusti zvezdico na GitHubu!
