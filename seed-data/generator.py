"""
Bundesliga 1 + 2 (2025-26) Stadyum Seed Generator
==================================================
36 stadyum için venue_seating_templates JSON'unu üretir.

Stadyum mimari kuralları:
- Tüm Bundesliga stadyumları 4 tribünlü oval/dikdörtgen yapıda
- Nord/Süd/Ost/West tribün isimleri standart
- Bazı stadyumlarda standing terraces (özellikle Süd/Nord curve)
- Büyük stadyumlarda Unter-/Mittel-/Obertribüne (UT/MT/OT) katmanları
- Modern stadyumlarda VIP/Business/Logen bölümü

Çıktı: venues-bundesliga-36.json — Base44 seed için hazır.
"""

import json
from typing import Any

# ============================================================================
# STADYUM VERİSİ - Wikipedia 2025-26 sezonu, resmi kaynaklar
# ============================================================================

BUNDESLIGA_1 = [
    {
        "team": "FC Bayern München", "team_id": "bayern-munchen",
        "venue_id": "allianz-arena-munchen",
        "name": "Allianz Arena", "city": "München", "capacity": 75024,
        "match_patterns": ["Allianz Arena", "Allianz Arena München", "Allianz Arena Munich"],
        "lat": 48.21878, "lng": 11.62461,
        "fan_stand": "north",  # FCB Südkurve aslında north dive
        "yellow_wall": False,
        "tier_count": 3,  # 3 katmanlı (UT/MT/OT)
        "league": 1,
    },
    {
        "team": "Borussia Dortmund", "team_id": "borussia-dortmund",
        "venue_id": "signal-iduna-park-dortmund",
        "name": "Signal Iduna Park", "city": "Dortmund", "capacity": 81365,
        "match_patterns": ["Signal Iduna Park", "Westfalenstadion", "BVB Stadion Dortmund"],
        "lat": 51.49256, "lng": 7.45178,
        "fan_stand": "south",  # Yellow Wall - Südtribüne
        "yellow_wall": True,
        "tier_count": 3,
        "league": 1,
    },
    {
        "team": "RB Leipzig", "team_id": "rb-leipzig",
        "venue_id": "red-bull-arena-leipzig",
        "name": "Red Bull Arena", "city": "Leipzig", "capacity": 47800,
        "match_patterns": ["Red Bull Arena", "Red Bull Arena Leipzig", "Zentralstadion"],
        "lat": 51.34581, "lng": 12.34813,
        "fan_stand": "north",
        "yellow_wall": False,
        "tier_count": 2,  # UT + OT
        "league": 1,
    },
    {
        "team": "Bayer 04 Leverkusen", "team_id": "bayer-leverkusen",
        "venue_id": "bayarena-leverkusen",
        "name": "BayArena", "city": "Leverkusen", "capacity": 30210,
        "match_patterns": ["BayArena", "BayArena Leverkusen", "Bayer 04 Stadion"],
        "lat": 51.03833, "lng": 7.00222,
        "fan_stand": "north",
        "yellow_wall": False,
        "tier_count": 2,
        "league": 1,
    },
    {
        "team": "Eintracht Frankfurt", "team_id": "eintracht-frankfurt",
        "venue_id": "deutsche-bank-park-frankfurt",
        "name": "Deutsche Bank Park", "city": "Frankfurt", "capacity": 59500,
        "match_patterns": ["Deutsche Bank Park", "Commerzbank-Arena", "Waldstadion Frankfurt"],
        "lat": 50.06889, "lng": 8.64639,
        "fan_stand": "north",
        "yellow_wall": False,
        "tier_count": 3,
        "league": 1,
    },
    {
        "team": "VfB Stuttgart", "team_id": "vfb-stuttgart",
        "venue_id": "mhparena-stuttgart",
        "name": "MHPArena", "city": "Stuttgart", "capacity": 60058,
        "match_patterns": ["MHPArena", "MHP Arena Stuttgart", "Mercedes-Benz Arena Stuttgart", "Neckarstadion"],
        "lat": 48.79236, "lng": 9.23223,
        "fan_stand": "south",  # Cannstatter Kurve
        "yellow_wall": False,
        "tier_count": 2,
        "league": 1,
    },
    {
        "team": "TSG 1899 Hoffenheim", "team_id": "tsg-hoffenheim",
        "venue_id": "prezero-arena-sinsheim",
        "name": "PreZero Arena", "city": "Sinsheim", "capacity": 30150,
        "match_patterns": ["PreZero Arena", "Rhein-Neckar-Arena", "WIRSOL Rhein-Neckar-Arena"],
        "lat": 49.23903, "lng": 8.88791,
        "fan_stand": "south",
        "yellow_wall": False,
        "tier_count": 2,
        "league": 1,
    },
    {
        "team": "VfL Wolfsburg", "team_id": "vfl-wolfsburg",
        "venue_id": "volkswagen-arena-wolfsburg",
        "name": "Volkswagen Arena", "city": "Wolfsburg", "capacity": 30000,
        "match_patterns": ["Volkswagen Arena", "VW Arena", "AOK Stadion"],
        "lat": 52.43275, "lng": 10.80361,
        "fan_stand": "north",
        "yellow_wall": False,
        "tier_count": 2,
        "league": 1,
    },
    {
        "team": "Borussia Mönchengladbach", "team_id": "borussia-monchengladbach",
        "venue_id": "borussia-park-monchengladbach",
        "name": "Borussia-Park", "city": "Mönchengladbach", "capacity": 54057,
        "match_patterns": ["Borussia-Park", "Borussia Park", "Stadion im Borussia-Park"],
        "lat": 51.17472, "lng": 6.38528,
        "fan_stand": "north",  # Nordkurve
        "yellow_wall": False,
        "tier_count": 2,
        "league": 1,
    },
    {
        "team": "1. FC Köln", "team_id": "fc-koln",
        "venue_id": "rheinenergiestadion-koln",
        "name": "RheinEnergieStadion", "city": "Köln", "capacity": 49698,
        "match_patterns": ["RheinEnergieStadion", "Müngersdorfer Stadion", "RheinEnergie Stadion"],
        "lat": 50.93361, "lng": 6.87500,
        "fan_stand": "south",  # Südkurve
        "yellow_wall": False,
        "tier_count": 2,
        "league": 1,
    },
    {
        "team": "1. FSV Mainz 05", "team_id": "mainz-05",
        "venue_id": "mewa-arena-mainz",
        "name": "MEWA Arena", "city": "Mainz", "capacity": 33305,
        "match_patterns": ["MEWA Arena", "Opel Arena", "Coface Arena"],
        "lat": 49.98417, "lng": 8.22417,
        "fan_stand": "south",
        "yellow_wall": False,
        "tier_count": 2,
        "league": 1,
    },
    {
        "team": "FC Augsburg", "team_id": "fc-augsburg",
        "venue_id": "wwk-arena-augsburg",
        "name": "WWK Arena", "city": "Augsburg", "capacity": 30660,
        "match_patterns": ["WWK Arena", "SGL Arena", "impuls Arena"],
        "lat": 48.32333, "lng": 10.89167,
        "fan_stand": "south",
        "yellow_wall": False,
        "tier_count": 2,
        "league": 1,
    },
    {
        "team": "1. FC Heidenheim", "team_id": "fc-heidenheim",
        "venue_id": "voith-arena-heidenheim",
        "name": "Voith-Arena", "city": "Heidenheim", "capacity": 15000,
        "match_patterns": ["Voith-Arena", "Voith Arena Heidenheim"],
        "lat": 48.66833, "lng": 10.14056,
        "fan_stand": "west",
        "yellow_wall": False,
        "tier_count": 1,
        "league": 1,
    },
    {
        "team": "SV Werder Bremen", "team_id": "werder-bremen",
        "venue_id": "weserstadion-bremen",
        "name": "Weserstadion", "city": "Bremen", "capacity": 42100,
        "match_patterns": ["Weserstadion", "Wohninvest Weserstadion", "Weser-Stadion"],
        "lat": 53.06639, "lng": 8.83778,
        "fan_stand": "east",  # Ostkurve
        "yellow_wall": False,
        "tier_count": 2,
        "league": 1,
    },
    {
        "team": "1. FC Union Berlin", "team_id": "union-berlin",
        "venue_id": "alten-forsterei-berlin",
        "name": "Stadion An der Alten Försterei", "city": "Berlin", "capacity": 22012,
        "match_patterns": ["An der Alten Försterei", "Stadion An der Alten Försterei", "Alte Försterei"],
        "lat": 52.45722, "lng": 13.56806,
        "fan_stand": "north",  # %78 standing!
        "yellow_wall": False,
        "tier_count": 1,
        "league": 1,
        "mostly_standing": True,  # Unique - bu stadyum çoğunlukla standing
    },
    {
        "team": "SC Freiburg", "team_id": "sc-freiburg",
        "venue_id": "europa-park-stadion-freiburg",
        "name": "Europa-Park Stadion", "city": "Freiburg", "capacity": 34700,
        "match_patterns": ["Europa-Park Stadion", "Europa Park Stadion Freiburg", "SC-Stadion"],
        "lat": 48.02194, "lng": 7.83000,
        "fan_stand": "north",
        "yellow_wall": False,
        "tier_count": 2,
        "league": 1,
    },
    {
        "team": "FC St. Pauli", "team_id": "fc-st-pauli",
        "venue_id": "millerntor-stadion-hamburg",
        "name": "Millerntor-Stadion", "city": "Hamburg", "capacity": 29546,
        "match_patterns": ["Millerntor-Stadion", "Millerntor Stadion", "St. Pauli Stadion"],
        "lat": 53.55444, "lng": 9.96750,
        "fan_stand": "south",
        "yellow_wall": False,
        "tier_count": 1,
        "league": 1,
    },
    {
        "team": "Hamburger SV", "team_id": "hamburger-sv",
        "venue_id": "volksparkstadion-hamburg",
        "name": "Volksparkstadion", "city": "Hamburg", "capacity": 57000,
        "match_patterns": ["Volksparkstadion", "Imtech Arena", "AOL Arena", "HSH Nordbank Arena"],
        "lat": 53.58722, "lng": 9.89889,
        "fan_stand": "north",  # Nordtribüne
        "yellow_wall": False,
        "tier_count": 2,
        "league": 1,
    },
]

BUNDESLIGA_2 = [
    {
        "team": "Hertha BSC", "team_id": "hertha-bsc",
        "venue_id": "olympiastadion-berlin",
        "name": "Olympiastadion Berlin", "city": "Berlin", "capacity": 74649,
        "match_patterns": ["Olympiastadion Berlin", "Olympic Stadium Berlin", "Olympiastadion"],
        "lat": 52.51472, "lng": 13.23944,
        "fan_stand": "east",  # Ostkurve
        "yellow_wall": False,
        "tier_count": 2,
        "league": 2,
        "has_marathon_gate": True,  # Marathontor unique VIP feature
    },
    {
        "team": "Arminia Bielefeld", "team_id": "arminia-bielefeld",
        "venue_id": "schuco-arena-bielefeld",
        "name": "Schüco-Arena", "city": "Bielefeld", "capacity": 27332,
        "match_patterns": ["Schüco-Arena", "Schueco Arena", "Bielefelder Alm", "SchücoArena"],
        "lat": 52.03139, "lng": 8.51694,
        "fan_stand": "south",
        "yellow_wall": False,
        "tier_count": 2,
        "league": 2,
    },
    {
        "team": "VfL Bochum", "team_id": "vfl-bochum",
        "venue_id": "vonovia-ruhrstadion-bochum",
        "name": "Vonovia Ruhrstadion", "city": "Bochum", "capacity": 26000,
        "match_patterns": ["Vonovia Ruhrstadion", "Ruhrstadion", "rewirpowerSTADION"],
        "lat": 51.48972, "lng": 7.23556,
        "fan_stand": "east",  # Ostkurve
        "yellow_wall": False,
        "tier_count": 1,
        "league": 2,
    },
    {
        "team": "Eintracht Braunschweig", "team_id": "eintracht-braunschweig",
        "venue_id": "eintracht-stadion-braunschweig",
        "name": "Eintracht-Stadion", "city": "Braunschweig", "capacity": 23325,
        "match_patterns": ["Eintracht-Stadion", "Eintracht Stadion Braunschweig", "Stadion Hamburger Strasse"],
        "lat": 52.29139, "lng": 10.54639,
        "fan_stand": "south",  # Südtribüne
        "yellow_wall": False,
        "tier_count": 1,
        "league": 2,
    },
    {
        "team": "SV Darmstadt 98", "team_id": "darmstadt-98",
        "venue_id": "boellenfalltor-darmstadt",
        "name": "Merck-Stadion am Böllenfalltor", "city": "Darmstadt", "capacity": 17650,
        "match_patterns": ["Merck-Stadion am Böllenfalltor", "Böllenfalltor", "Bölle"],
        "lat": 49.85583, "lng": 8.66833,
        "fan_stand": "north",
        "yellow_wall": False,
        "tier_count": 1,
        "league": 2,
    },
    {
        "team": "Dynamo Dresden", "team_id": "dynamo-dresden",
        "venue_id": "rudolf-harbig-stadion-dresden",
        "name": "Rudolf-Harbig-Stadion", "city": "Dresden", "capacity": 32249,
        "match_patterns": ["Rudolf-Harbig-Stadion", "Glücksgas-Stadion", "DDV-Stadion", "Heinz-Steyer-Stadion"],
        "lat": 51.04000, "lng": 13.74722,
        "fan_stand": "k-block",  # K-Block - famous standing
        "yellow_wall": False,
        "tier_count": 1,
        "league": 2,
    },
    {
        "team": "Fortuna Düsseldorf", "team_id": "fortuna-dusseldorf",
        "venue_id": "merkur-spiel-arena-dusseldorf",
        "name": "Merkur Spiel-Arena", "city": "Düsseldorf", "capacity": 54600,
        "match_patterns": ["Merkur Spiel-Arena", "Esprit Arena", "LTU Arena", "Düsseldorf Arena"],
        "lat": 51.26139, "lng": 6.73333,
        "fan_stand": "south",
        "yellow_wall": False,
        "tier_count": 2,
        "league": 2,
    },
    {
        "team": "SV Elversberg", "team_id": "sv-elversberg",
        "venue_id": "kaiserlinde-elversberg",
        "name": "Waldstadion an der Kaiserlinde", "city": "Spiesen-Elversberg", "capacity": 10000,
        "match_patterns": ["Waldstadion an der Kaiserlinde", "Kaiserlinde", "Ursapharm-Arena"],
        "lat": 49.32417, "lng": 7.13556,
        "fan_stand": "north",
        "yellow_wall": False,
        "tier_count": 1,
        "league": 2,
    },
    {
        "team": "SpVgg Greuther Fürth", "team_id": "greuther-furth",
        "venue_id": "ronhof-furth",
        "name": "Sportpark Ronhof Thomas Sommer", "city": "Fürth", "capacity": 16626,
        "match_patterns": ["Sportpark Ronhof", "Sportpark Ronhof Thomas Sommer", "Ronhof", "Trolli Arena"],
        "lat": 49.49250, "lng": 10.99861,
        "fan_stand": "south",
        "yellow_wall": False,
        "tier_count": 1,
        "league": 2,
    },
    {
        "team": "Hannover 96", "team_id": "hannover-96",
        "venue_id": "heinz-von-heiden-arena-hannover",
        "name": "Heinz von Heiden Arena", "city": "Hannover", "capacity": 49000,
        "match_patterns": ["Heinz von Heiden Arena", "HDI Arena", "Niedersachsenstadion", "AWD-Arena"],
        "lat": 52.36028, "lng": 9.73111,
        "fan_stand": "north",  # Nordkurve
        "yellow_wall": False,
        "tier_count": 2,
        "league": 2,
    },
    {
        "team": "1. FC Kaiserslautern", "team_id": "fc-kaiserslautern",
        "venue_id": "fritz-walter-stadion-kaiserslautern",
        "name": "Fritz-Walter-Stadion", "city": "Kaiserslautern", "capacity": 49327,
        "match_patterns": ["Fritz-Walter-Stadion", "Fritz Walter Stadion", "Betzenberg"],
        "lat": 49.43417, "lng": 7.77639,
        "fan_stand": "west",  # Westkurve
        "yellow_wall": False,
        "tier_count": 2,
        "league": 2,
    },
    {
        "team": "Karlsruher SC", "team_id": "karlsruher-sc",
        "venue_id": "bbbank-wildpark-karlsruhe",
        "name": "BBBank Wildpark", "city": "Karlsruhe", "capacity": 34302,
        "match_patterns": ["BBBank Wildpark", "Wildparkstadion", "Wildpark Stadion"],
        "lat": 49.02000, "lng": 8.41306,
        "fan_stand": "south",
        "yellow_wall": False,
        "tier_count": 2,
        "league": 2,
    },
    {
        "team": "Holstein Kiel", "team_id": "holstein-kiel",
        "venue_id": "holstein-stadion-kiel",
        "name": "Holstein-Stadion", "city": "Kiel", "capacity": 15034,
        "match_patterns": ["Holstein-Stadion", "Holstein Stadion Kiel"],
        "lat": 54.34944, "lng": 10.12056,
        "fan_stand": "north",
        "yellow_wall": False,
        "tier_count": 1,
        "league": 2,
    },
    {
        "team": "1. FC Magdeburg", "team_id": "fc-magdeburg",
        "venue_id": "avnet-arena-magdeburg",
        "name": "Avnet Arena", "city": "Magdeburg", "capacity": 30098,
        "match_patterns": ["Avnet Arena", "MDCC-Arena", "Magdeburg Arena"],
        "lat": 52.13361, "lng": 11.66722,
        "fan_stand": "south",  # Block U/Südtribüne
        "yellow_wall": False,
        "tier_count": 2,
        "league": 2,
    },
    {
        "team": "Preußen Münster", "team_id": "preussen-munster",
        "venue_id": "preussenstadion-munster",
        "name": "LVM-Preußenstadion", "city": "Münster", "capacity": 14300,
        "match_patterns": ["LVM-Preußenstadion", "Preußenstadion", "Preussenstadion"],
        "lat": 51.94917, "lng": 7.59750,
        "fan_stand": "east",
        "yellow_wall": False,
        "tier_count": 1,
        "league": 2,
    },
    {
        "team": "1. FC Nürnberg", "team_id": "fc-nurnberg",
        "venue_id": "max-morlock-stadion-nurnberg",
        "name": "Max-Morlock-Stadion", "city": "Nürnberg", "capacity": 49923,
        "match_patterns": ["Max-Morlock-Stadion", "Max Morlock Stadion", "Grundig-Stadion", "easyCredit-Stadion", "Frankenstadion"],
        "lat": 49.42611, "lng": 11.12583,
        "fan_stand": "north",  # Nordkurve
        "yellow_wall": False,
        "tier_count": 2,
        "league": 2,
    },
    {
        "team": "SC Paderborn 07", "team_id": "sc-paderborn",
        "venue_id": "home-deluxe-arena-paderborn",
        "name": "Home Deluxe Arena", "city": "Paderborn", "capacity": 15000,
        "match_patterns": ["Home Deluxe Arena", "Benteler-Arena", "Energieteam Arena"],
        "lat": 51.71028, "lng": 8.74778,
        "fan_stand": "south",
        "yellow_wall": False,
        "tier_count": 1,
        "league": 2,
    },
    {
        "team": "FC Schalke 04", "team_id": "fc-schalke-04",
        "venue_id": "veltins-arena-gelsenkirchen",
        "name": "Veltins-Arena", "city": "Gelsenkirchen", "capacity": 62271,
        "match_patterns": ["Veltins-Arena", "Arena AufSchalke", "Schalke Arena", "Veltins Arena"],
        "lat": 51.55444, "lng": 7.06778,
        "fan_stand": "north",  # Nordkurve
        "yellow_wall": False,
        "tier_count": 2,
        "league": 2,
    },
]

ALL_STADIUMS = BUNDESLIGA_1 + BUNDESLIGA_2

# ============================================================================
# BLOK YAPISI ÜRETİCİ FONKSİYONLAR
# ============================================================================

DIRECTIONS = ["north", "south", "east", "west"]
DIRECTION_LABELS_DE = {
    "north": "Nordtribüne",
    "south": "Südtribüne", 
    "east": "Osttribüne",
    "west": "Westtribüne",
}

def estimate_blocks_per_tribune(capacity: int, tier_count: int) -> int:
    """Tribün başına blok sayısını kapasiteye göre tahmin et."""
    # Toplam blok hedefi: capacity / 1500'e yakın
    # 4 tribün eşit dağıtılır, tier_count ile çarpılır
    total_target = max(8, capacity // 1500)
    per_tribune = max(2, total_target // 4)
    return per_tribune

def estimate_rows_per_block(capacity: int, tier_count: int) -> int:
    """Blok başına sıra sayısı."""
    if capacity < 18000: return 18
    if capacity < 30000: return 22
    if capacity < 50000: return 26
    if capacity < 65000: return 28
    return 32  # 65K+

def estimate_seats_per_row(capacity: int) -> int:
    """Sıra başına koltuk sayısı."""
    if capacity < 18000: return 22
    if capacity < 30000: return 26
    if capacity < 50000: return 30
    if capacity < 65000: return 32
    return 36

def build_tribune_blocks(
    direction: str,
    is_fan_stand: bool,
    capacity: int,
    tier_count: int,
    is_yellow_wall: bool = False,
    is_mostly_standing: bool = False,
) -> list[dict[str, Any]]:
    """Bir tribün için blok listesini üret."""
    label_de = DIRECTION_LABELS_DE[direction]
    direction_prefix = direction[0].upper()  # N, S, E, W
    
    blocks = []
    
    # FAN STAND ÖZELLİĞİ: Bu tribün taraftar curve mı?
    if is_fan_stand:
        if is_yellow_wall:
            # Dortmund Yellow Wall - massive standing terrace
            blocks.append({
                "id": f"{direction}-yellow-wall",
                "label": f"Südtribüne (Gelbe Wand)",
                "type": "standing",
                "capacity_approx": 24454,
                "has_rows": False,
                "has_seats": False,
            })
            return blocks
        else:
            # Normal Fankurve - standing
            standing_cap = int(capacity * 0.10)  # ~10% of total
            blocks.append({
                "id": f"{direction}-stehplatz",
                "label": f"{label_de} (Stehplatz / Fankurve)",
                "type": "standing",
                "capacity_approx": standing_cap,
                "has_rows": False,
                "has_seats": False,
            })
            # Yanlardaki sitzplatz blokları
            n_seated = 2
            rows = estimate_rows_per_block(capacity, tier_count)
            seats = estimate_seats_per_row(capacity)
            for i in range(1, n_seated + 1):
                blocks.append({
                    "id": f"{direction_prefix}{i}",
                    "label": f"{label_de} Block {direction_prefix}{i}",
                    "type": "seated",
                    "capacity_approx": rows * seats,
                    "has_rows": True,
                    "max_row": rows,
                    "max_seat": seats,
                })
            return blocks
    
    # Genel oturma tribün
    if is_mostly_standing:
        # Union Berlin tarzı: tribünün %70'i standing
        blocks.append({
            "id": f"{direction}-stehplatz",
            "label": f"{label_de} (Stehplatz)",
            "type": "standing",
            "capacity_approx": int(capacity * 0.15),
            "has_rows": False,
            "has_seats": False,
        })
        return blocks
    
    # Multi-tier yapısı (büyük stadyumlar)
    n_blocks = estimate_blocks_per_tribune(capacity, tier_count)
    rows = estimate_rows_per_block(capacity, tier_count)
    seats = estimate_seats_per_row(capacity)
    
    if tier_count >= 2:
        # Untertribüne (UT) + Obertribüne (OT)
        half = max(1, n_blocks // 2)
        for i in range(1, half + 1):
            blocks.append({
                "id": f"{direction_prefix}-ut-{i}",
                "label": f"{label_de} Untertribüne {direction_prefix}{i}",
                "type": "seated",
                "capacity_approx": rows * seats,
                "has_rows": True,
                "max_row": rows,
                "max_seat": seats,
                "tier": "lower",
            })
        for i in range(1, half + 1):
            blocks.append({
                "id": f"{direction_prefix}-ot-{i}",
                "label": f"{label_de} Obertribüne {direction_prefix}{i}",
                "type": "seated",
                "capacity_approx": int(rows * seats * 0.85),  # OT genelde daha küçük
                "has_rows": True,
                "max_row": int(rows * 0.85),
                "max_seat": seats,
                "tier": "upper",
            })
    else:
        # Tek katman
        for i in range(1, n_blocks + 1):
            blocks.append({
                "id": f"{direction_prefix}{i}",
                "label": f"{label_de} Block {direction_prefix}{i}",
                "type": "seated",
                "capacity_approx": rows * seats,
                "has_rows": True,
                "max_row": rows,
                "max_seat": seats,
            })
    
    return blocks

def build_layout(stadium: dict) -> dict:
    """Bir stadyum için tam layout objesi inşa et."""
    capacity = stadium["capacity"]
    fan_stand = stadium["fan_stand"]
    tier_count = stadium["tier_count"]
    yellow_wall = stadium.get("yellow_wall", False)
    mostly_standing = stadium.get("mostly_standing", False)
    
    tribunes = {}
    
    for direction in DIRECTIONS:
        is_fan = (direction == fan_stand) or (
            fan_stand == "k-block" and direction == "north"
        )
        blocks = build_tribune_blocks(
            direction=direction,
            is_fan_stand=is_fan,
            capacity=capacity,
            tier_count=tier_count,
            is_yellow_wall=(yellow_wall and is_fan),
            is_mostly_standing=mostly_standing,
        )
        tribunes[direction] = {
            "label": DIRECTION_LABELS_DE[direction],
            "is_fan_stand": is_fan,
            "blocks": blocks,
        }
    
    # VIP/Logen — 30K+ stadyumlarda
    vip_blocks = []
    if capacity >= 30000:
        vip_blocks.append({
            "id": "vip-business",
            "label": "VIP / Business Seats",
            "type": "vip",
            "capacity_approx": int(capacity * 0.03),
            "has_rows": True,
            "max_row": 8,
            "max_seat": 20,
        })
    if capacity >= 50000:
        vip_blocks.append({
            "id": "logen",
            "label": "Logen / Skyboxes",
            "type": "vip",
            "capacity_approx": int(capacity * 0.02),
            "has_rows": False,
            "has_seats": False,
        })
    
    # Marathon Gate (sadece Olympiastadion Berlin)
    if stadium.get("has_marathon_gate"):
        vip_blocks.append({
            "id": "marathontor",
            "label": "Marathontor (Premium)",
            "type": "vip",
            "capacity_approx": 800,
            "has_rows": True,
            "max_row": 12,
            "max_seat": 30,
        })
    
    return {
        "shape": "oval",
        "pitch_orientation": "north-south",
        "tribunes": tribunes,
        "extras": vip_blocks,
    }

# ============================================================================
# JSON ÜRETIMI
# ============================================================================

def build_venue_record(stadium: dict) -> dict:
    """Bir stadyum için tam Base44 record'unu üret."""
    layout = build_layout(stadium)
    
    return {
        "venue_id": stadium["venue_id"],
        "name": stadium["name"],
        "city": stadium["city"],
        "country": "DE",
        "capacity": stadium["capacity"],
        "type": "stadium",
        "sport": "football",
        "league": f"Bundesliga {stadium['league']}",
        "team_id": stadium["team_id"],
        "team_name": stadium["team"],
        "lat": stadium["lat"],
        "lng": stadium["lng"],
        "match_patterns": stadium["match_patterns"],
        "layout": layout,
        "source": "manual-bundesliga-2025-26",
    }

records = [build_venue_record(s) for s in ALL_STADIUMS]

with open("/home/claude/bundesliga-venues/venues-bundesliga-36.json", "w", encoding="utf-8") as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

# İstatistikler
print(f"✓ Toplam stadyum: {len(records)}")
print(f"  Bundesliga 1: {sum(1 for s in ALL_STADIUMS if s['league'] == 1)}")
print(f"  Bundesliga 2: {sum(1 for s in ALL_STADIUMS if s['league'] == 2)}")

total_capacity = sum(s["capacity"] for s in ALL_STADIUMS)
print(f"\n  Toplam kapasite: {total_capacity:,}")
print(f"  Ortalama: {total_capacity // len(ALL_STADIUMS):,}")
print(f"  En büyük: {max(ALL_STADIUMS, key=lambda x: x['capacity'])['name']} ({max(s['capacity'] for s in ALL_STADIUMS):,})")
print(f"  En küçük: {min(ALL_STADIUMS, key=lambda x: x['capacity'])['name']} ({min(s['capacity'] for s in ALL_STADIUMS):,})")

# Toplam blok sayısı
total_blocks = 0
for r in records:
    for t in r["layout"]["tribunes"].values():
        total_blocks += len(t["blocks"])
    total_blocks += len(r["layout"]["extras"])
print(f"\n  Toplam blok sayısı: {total_blocks}")
print(f"  Stadyum başına ortalama: {total_blocks // len(records)}")

# Dosya boyutu
import os
size_kb = os.path.getsize("/home/claude/bundesliga-venues/venues-bundesliga-36.json") / 1024
print(f"\n  JSON boyutu: {size_kb:.1f} KB")
