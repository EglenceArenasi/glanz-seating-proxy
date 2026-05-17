# 🏟 Glanz Light — Final Deploy Package

**Base44 mevcut şemaya bire bir uyumlu**, hiçbir collection değişikliği yok.

---

## 🎯 Mimari özeti

```
[Vercel filesystem]                [Base44 (mevcut collections)]
─────────────────────              ──────────────────────────────
venues-bundesliga-36.json    →     Event (16 field, mevcut)
36 stadyum, 737 blok         →     Ticket (15 field, mevcut)
                             →     EventAttendee (5 field, mevcut)
                             →     Choreography (14 field, mevcut)

         ↓                                   ↑
    /api/venues/*                       upsertByExternalId
    (mobile app çağırır)                (discovery agent yazar)
         ↓                                   ↑
[ Mobile App ]                       [ Discovery Cron ]
```

**Hiçbir yeni Base44 collection gerekmez. Base44 free plan yeterli.**

---

## 📁 Paket içeriği

```
final-deploy/
├── api/
│   ├── seating.ts                 (mevcut, dokunulmadı)
│   ├── lib/
│   │   ├── tmDiscovery.ts         (TM Discovery API client)
│   │   ├── base44.ts              (Server-side Base44 client)
│   │   └── discoveryCore.ts       ⭐ FINAL — Event collection field'larına map ediyor
│   ├── cron/
│   │   └── discover.ts            (Her gün 06:00 UTC)
│   ├── discover/
│   │   └── run.ts                 (Manuel test)
│   └── venues/
│       ├── index.ts               ⭐ YENİ — GET /api/venues (liste)
│       ├── match.ts               ⭐ YENİ — GET /api/venues/match?name=X
│       └── [id].ts                ⭐ YENİ — GET /api/venues/:id (tek venue)
├── seed-data/
│   ├── venues-bundesliga-36.json  (250KB, 36 stadyum)
│   └── generator.py
└── vercel.json
```

---

## 🗄 Base44 Mevcut Collection Mapping

### Event collection (Discovery agent buraya yazar)

TM Discovery API'den çekilen her etkinlik bu field'lara map edilir:

| Base44 Field | Discovery agent value | Örnek |
|--------------|----------------------|-------|
| `title` | event.name | "FC Bayern München vs Borussia Dortmund" |
| `description` | event.info | "Bundesliga matchday 12..." |
| `type` | "match" / "concert" / "festival" / "other" | "match" |
| `date` | event.dates.start.dateTime (ISO) | "2026-11-08T18:30:00+01:00" |
| `doors_open` | (TM'de yok, boş) | — |
| `venue_name` | event._embedded.venues[0].name | "Allianz Arena" |
| `city` | venue.city.name | "München" |
| `country` | venue.country.countryCode | "DE" |
| `image_url` | en büyük 16:9 image | "https://s1.ticketm.net/dam/..." |
| `artist_team` | venue match varsa team_name, yoksa attractions[0].name | "FC Bayern München" |
| `category` | "music" / "sports" / "theater" / "comedy" | "sports" |
| `status` | "upcoming" / "live" / "completed" / "cancelled" | "upcoming" |
| `capacity` | venue match varsa template.capacity | 75024 |
| `attendee_count` | 0 (başlangıçta) | 0 |
| `venue_map_url` | Vercel endpoint URL | "https://glanz-seating-proxy.vercel.app/api/venues/allianz-arena-munchen" |
| `is_featured` | venue match + sport=football ise true | true |

**Ekstra field:** `external_id` — Base44 ekstra field tolere eder, deduplication için kullanılır ("tm:K8vZ...").

### Ticket collection (Mobile app — kullanıcı manuel input)

TIER 2 senaryosunda kullanıcı şunu girer:

| Base44 Field | Kullanıcı input | Örnek |
|--------------|----------------|-------|
| `event_id` | Event collection'daki kayıt id | "abc123" |
| `event_title` | Event title (kopya) | "Bayern vs Dortmund" |
| `event_date` | Event date (kopya) | "2026-11-08T18:30..." |
| `venue_name` | Event venue_name (kopya) | "Allianz Arena" |
| `section` | **Kullanıcı seçer / yazar** | "N-OT-1" (Nordtribüne Obertribüne 1) |
| `row` | **Kullanıcı seçer / yazar** | "12" |
| `seat` | **Kullanıcı seçer / yazar** | "24" |
| `qr_code_data` | (sonra eklenebilir) | — |
| `qr_image_url` | (sonra eklenebilir) | — |
| `ticket_type` | "vip" / "standard" / "premium" / "standing" | "standing" (Yellow Wall için) |
| `status` | "active" | "active" |
| `price` | (opsiyonel) | 45 |
| `currency` | "EUR" | "EUR" |
| `barcode` | (opsiyonel) | — |
| `source_platform` | "manual" / "ticketmaster" / "eventim" | "manual" |

### EventAttendee collection (RSVP)

"Katılıyorum" tıklandığında basit kayıt:

| Base44 Field | Değer |
|--------------|-------|
| `event_id` | Event id |
| `user_email` | Login user email |
| `user_name` | Display name |
| `avatar_initial` | İlk harf |
| `going_public` | true (varsayılan) |

### Choreography (sonraki sprint)

Işık şovu için:
- `type`: flash / color_wave / mexican_wave / logo / text / pattern
- `target_sections`: "N-OT-1,N-OT-2,S-Yellow-Wall" → krokideki bloklar
- `sponsor_name/logo_url` → monetizasyon hazır
- `reward_amount` → kullanıcıya ödül

---

## 🌐 Yeni API Endpoint'ler

### 1. GET /api/venues — Tüm Bundesliga venue'ları
```bash
curl "https://glanz-seating-proxy.vercel.app/api/venues?summary=true"
# → { "count": 36, "venues": [{venue_id, name, city, capacity, league, team_name}, ...] }
```

### 2. GET /api/venues/:id — Tek venue (tam layout dahil)
```bash
curl "https://glanz-seating-proxy.vercel.app/api/venues/allianz-arena-munchen"
# → { venue_id, name, capacity, layout: { tribunes: {...}, extras: [...] } }
```

### 3. GET /api/venues/match?name=X — Venue ismiyle match
```bash
curl "https://glanz-seating-proxy.vercel.app/api/venues/match?name=Allianz%20Arena"
# → { matched: true, confidence: 1.0, ...full template }
```

Mobile app TIER 2 için bu endpoint'ten template çeker, kullanıcının girdiği section/row/seat'i krokisinde işaretler.

---

## 🚀 Deploy Adımları

### 1. Dosyaları kopyala
```bash
cd ~/Desktop/glanz-seating-proxy

# final-deploy/ içindeki tüm dosyaları aynı klasör yapısıyla yerleştir
# Mevcut api/seating.ts'i koru — sadece üzerine yeni dosyalar ekle
```

### 2. Base44 collection'ları → YAPMA
Hiçbir Base44 değişikliği gerekmez. Mevcut Event/Ticket/EventAttendee/Choreography zaten ideal şemaya sahip.

### 3. Vercel env vars (4 adet)
```
TICKETMASTER_API_KEY = (mevcut anahtarın)
BASE44_APP_ID         = 69b5d674771c9e92839d5772
BASE44_TOKEN          = (lib/api.ts'deki DEV_TOKEN JWT)
CRON_SECRET           = (rastgele uzun string)
MANUAL_RUN_SECRET     = (rastgele uzun string)
```

Not: `BASE44_APP_ID` artık URL'den net biliniyor: **`69b5d674771c9e92839d5772`**

### 4. Deploy
```bash
git add . && git commit -m "Final: Base44-aligned discovery + venue API endpoints" && git push origin main
```

### 5. Test (Vercel ready olunca)

**Test A — Venue listesini gör:**
```bash
curl "https://glanz-seating-proxy.vercel.app/api/venues?summary=true"
```
Beklenen: `{"count":36,"venues":[...]}`

**Test B — Allianz Arena template:**
```bash
curl "https://glanz-seating-proxy.vercel.app/api/venues/allianz-arena-munchen"
```
Beklenen: tam layout JSON (tribunes + extras)

**Test C — Venue match:**
```bash
curl "https://glanz-seating-proxy.vercel.app/api/venues/match?name=Westfalenstadion"
```
Beklenen: `{"matched":true, ...Signal Iduna Park}`

**Test D — Discovery test (Münih spor):**
```bash
curl "https://glanz-seating-proxy.vercel.app/api/discover/run?secret=YOUR_MANUAL_SECRET&city=München&genre=Sports&pages=1"
```
Beklenen:
```json
{
  "success": true,
  "fetched": 45,
  "created": 30,
  "updated": 15,
  "matched_venues": 12,
  "football_matches": 12,
  "errors": 0
}
```

### 6. Base44'te doğrula
- Base44 → Glanz Light → Data → **Event** sekmesine bak
- Yeni eklenen Bundesliga maçlarını görmelisin
- `type: "match"`, `category: "sports"`, `is_featured: true`, `venue_map_url` dolu

---

## 🔄 Mobile App'te yapılacaklar (sonraki sprint)

`pixelights/lib/api.ts`'e helper ekle:

```typescript
export async function fetchVenueTemplate(venueMapUrl: string) {
  const res = await fetch(venueMapUrl);
  if (!res.ok) return null;
  return res.json();
}

export async function matchVenueByName(venueName: string) {
  const url = `https://glanz-seating-proxy.vercel.app/api/venues/match?name=${encodeURIComponent(venueName)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}
```

Sonra `SeatingInfoModal` v2'de:
- Event.venue_map_url varsa fetch → layout göster + kullanıcıdan section/row/seat al
- Kullanıcı "Kaydet" → Base44 Ticket collection'a record yarat
- Krokide kullanıcının koltuğunu pin olarak işaretle
