from __future__ import annotations

import math
import random
import sys
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

import pandas as pd
from sqlalchemy import select

PROJECT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.db.session import Base, SessionLocal, engine
from app.models import (
    AlertThreshold,
    Booking,
    CancellationSummary,
    CompetitorData,
    CountrySummary,
    Guest,
    GuestNote,
    GuestTag,
    GuestTimelineEvent,
    MonthlyRevenueSummary,
    Property,
    Room,
    RoomType,
    RoomTypePriceRule,
)
from app.services.competitor_import import import_multiple_competitor_json_files
from app.services.pricing_log import log_pricing_decision

CSV_DIR = PROJECT_DIR
BUNDLED_COMPETITOR_JSON = BACKEND_DIR / "data" / "mvp_competitors_agoda.json"
OPTIONAL_COMPETITOR_JSON_PATHS = [
    Path(r"C:\Users\Vinh\Downloads\Agoda Properties Listings.json"),
    Path(r"C:\Users\Vinh\Downloads\Booking Hotel Listings .json"),
]


MONTH_NAMES_ORDER = (
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
)

MONTH_TO_NUMBER = {
    "January": 1,
    "February": 2,
    "March": 3,
    "April": 4,
    "May": 5,
    "June": 6,
    "July": 7,
    "August": 8,
    "September": 9,
    "October": 10,
    "November": 11,
    "December": 12,
}

ROOM_TYPE_LABELS = {
    "A": "Classic Room",
    "B": "Comfort Room",
    "C": "Superior Room",
    "D": "Deluxe Room",
    "E": "Family Room",
    "F": "Premier Room",
    "G": "Executive Comfort Room",
    "H": "Executive Room",
    "I": "Signature Room",
    "K": "Spacious Room",
    "L": "Studio Room",
    "P": "Premium Room",
}


def find_csv(name_fragment: str) -> Path:
    for path in CSV_DIR.glob("*.csv"):
        if name_fragment.lower() in path.name.lower():
            return path
    raise FileNotFoundError(f"Could not find CSV containing '{name_fragment}'.")


def seed_properties(db) -> tuple[Property, Property]:
    p1 = Property(name="Azure Pearl — Nha Trang Hub", code="NT-HUB", area_name="Nha Trang")
    p2 = Property(name="Pine Mist Đà Lạt Lodge", code="DL-LODGE", area_name="Đà Lạt")
    db.add_all([p1, p2])
    db.flush()
    return p1, p2


def seed_room_types(db) -> dict[str, RoomType]:
    room_type_df = pd.read_csv(find_csv("room_type_summary"))
    room_types: dict[str, RoomType] = {}

    for _, row in room_type_df.iterrows():
        code = str(row["assigned_room_type"]).strip()
        room_type = RoomType(
            code=code,
            name=ROOM_TYPE_LABELS.get(code, f"Room Type {code}"),
            base_price=Decimal(str(row["avg_adr"])),
        )
        db.add(room_type)
        room_types[code] = room_type

    extra_codes = {"A", "B", "C", "D", "E", "F", "G", "H", "I", "K", "L", "P"}
    for code in sorted(extra_codes):
        if code not in room_types:
            room_type = RoomType(
                code=code,
                name=ROOM_TYPE_LABELS.get(code, f"Room Type {code}"),
                base_price=Decimal("100.00"),
            )
            db.add(room_type)
            room_types[code] = room_type

    db.flush()
    return room_types


def seed_rooms(db, room_types: dict[str, RoomType], p_nt: Property, p_dl: Property) -> dict[str, Room]:
    nt_codes = {"A", "B", "C", "D", "E", "F", "G"}
    rooms: dict[str, Room] = {}
    for code, room_type in room_types.items():
        pid = p_nt.id if code in nt_codes else p_dl.id
        room = Room(room_number=f"{code}-101", room_type_id=room_type.id, property_id=pid, status="available")
        db.add(room)
        rooms[code] = room
    db.flush()
    return rooms


def seed_room_price_rules(db, room_types: dict[str, RoomType]) -> None:
    for rt in room_types.values():
        bp = rt.base_price
        lo = max(Decimal("35"), (bp * Decimal("0.55")).quantize(Decimal("0.01")))
        hi = (bp * Decimal("2.25")).quantize(Decimal("0.01"))
        db.add(RoomTypePriceRule(room_type_id=rt.id, min_price=lo, max_price=hi))


def seed_alert_thresholds(db, p_nt: Property, p_dl: Property) -> None:
    db.add_all(
        [
            AlertThreshold(
                property_id=None,
                metric_key="occupancy_below_pct",
                threshold_value=Decimal("14"),
                enabled=True,
                webhook_url=None,
            ),
            AlertThreshold(
                property_id=None,
                metric_key="high_risk_bookings_min",
                threshold_value=Decimal("5"),
                enabled=True,
                webhook_url=None,
            ),
            AlertThreshold(
                property_id=p_nt.id,
                metric_key="occupancy_below_pct",
                threshold_value=Decimal("20"),
                enabled=True,
                webhook_url=None,
            ),
            AlertThreshold(
                property_id=p_dl.id,
                metric_key="occupancy_below_pct",
                threshold_value=Decimal("18"),
                enabled=True,
                webhook_url=None,
            ),
            AlertThreshold(
                property_id=None,
                metric_key="adr_drop_pct_vs_prior_week",
                threshold_value=Decimal("12"),
                enabled=False,
                webhook_url=None,
            ),
        ]
    )


def seed_ideal_country_summary(db) -> None:
    """Portfolios-style mix (ISO 3166-1 alpha-3) — replaces legacy CSV slice."""
    rows: list[tuple[str, int, int, Decimal]] = [
        ("VNM", 1840, 1622, Decimal("88.40")),
        ("KOR", 1126, 1044, Decimal("114.25")),
        ("CHN", 986, 872, Decimal("96.80")),
        ("TWN", 542, 498, Decimal("102.15")),
        ("JPN", 628, 590, Decimal("121.60")),
        ("SGP", 412, 388, Decimal("138.90")),
        ("THA", 356, 318, Decimal("79.25")),
        ("MYS", 298, 266, Decimal("84.50")),
        ("AUS", 274, 252, Decimal("109.75")),
        ("USA", 458, 420, Decimal("132.40")),
        ("GBR", 392, 368, Decimal("118.20")),
        ("DEU", 286, 268, Decimal("112.85")),
        ("FRA", 228, 212, Decimal("106.30")),
        ("CAN", 196, 182, Decimal("124.55")),
        ("IND", 318, 276, Decimal("71.40")),
        ("IDN", 244, 218, Decimal("69.90")),
        ("PHL", 206, 184, Decimal("73.25")),
        ("HKG", 362, 338, Decimal("142.80")),
    ]
    for country, total_bookings, successful_bookings, avg_adr in rows:
        db.add(
            CountrySummary(
                country=country,
                total_bookings=total_bookings,
                successful_bookings=successful_bookings,
                avg_adr=avg_adr,
            )
        )


def seed_ideal_monthly_revenue(db) -> None:
    """36 rolling months with seasonal resort curve + trend — dashboard-friendly."""
    base_rev = Decimal("1180000.00")
    base_adr = Decimal("94.00")
    base_stay = Decimal("3.15")
    year, month_idx = 2023, 6  # June 2023
    for i in range(36):
        month_name = MONTH_NAMES_ORDER[month_idx - 1]
        seasonal = Decimal(str(round(0.88 + 0.26 * math.sin((month_idx - 2) / 12 * 2 * math.pi), 4)))
        trend = Decimal(str(round(1.0 + i * 0.0095, 4)))
        wave = Decimal(str(round(0.94 + (i % 6) * 0.018, 4)))
        revenue = (base_rev * seasonal * trend * wave).quantize(Decimal("0.01"))
        adr_wobble = Decimal(str(round(float(base_adr) + (i % 9) * 3.2 + float(seasonal) * 14 - 12, 2)))
        stay_wobble = (base_stay + Decimal(str((i % 5) * 0.11)) + (seasonal - Decimal("1")) * Decimal("0.35")).quantize(
            Decimal("0.01")
        )
        db.add(
            MonthlyRevenueSummary(
                year=year,
                month_name=month_name,
                total_estimated_revenue=revenue,
                avg_adr=adr_wobble,
                avg_stay_nights=stay_wobble,
            )
        )
        month_idx += 1
        if month_idx > 12:
            month_idx = 1
            year += 1


def seed_ideal_cancellation_summary(db) -> None:
    hotels = [
        "Azure Pearl — Nha Trang Hub",
        "Pine Mist Đà Lạt Lodge",
        "Azure Pearl — Nha Trang Hub",
        "Partner hub OTAs",
        "Pine Mist Đà Lạt Lodge",
        "Resorts cluster Cam Ranh",
        "Azure Pearl — Nha Trang Hub",
        "Pine Mist Đà Lạt Lodge",
    ]
    segments = [
        "Leisure FIT",
        "Corporate negotiated",
        "OTA wholesale",
        "Direct / member",
        "Long-stay remote worker",
        "Domestic weekend",
        "Intl fly-in",
        "Group series",
    ]
    deposits = ["Non-refundable", "Partial 50%", "Flexible 24h", "Credit voucher only"]
    rng = random.Random(2026)
    for idx in range(22):
        total_b = rng.randint(120, 980)
        rate_pct = Decimal(str(round(rng.uniform(7.5, 36.8), 2)))
        canceled = int(round(float(total_b) * float(rate_pct) / 100.0))
        canceled = min(max(canceled, 8), total_b - 40)
        db.add(
            CancellationSummary(
                hotel=hotels[idx % len(hotels)],
                market_segment=segments[idx % len(segments)],
                deposit_type=deposits[idx % len(deposits)],
                total_bookings=total_b,
                canceled_bookings=canceled,
                cancellation_rate_pct=Decimal(str(round(100.0 * canceled / total_b, 2))),
            )
        )


def seed_modern_synthetic_bookings(db, rooms: dict[str, Room]) -> None:
    """Extra confirmed/canceled/checked_in stays Jun 2025–Aug 2026 — no double-book per room (sequential windows)."""
    rng = random.Random(42)
    codes = [c for c in rooms if c in ROOM_TYPE_LABELS]
    if not codes:
        codes = list(rooms.keys())
    last_free = {c: date(2025, 5, 20) for c in codes}
    statuses = ["confirmed"] * 7 + ["canceled"] * 2 + ["checked_in"]
    first_names = (
        "An",
        "Binh",
        "Chi",
        "Dara",
        "Ethan",
        "Freya",
        "Gita",
        "Hugo",
        "Ines",
        "Jon",
        "Kaya",
        "Linh",
        "Mateo",
        "Noor",
        "Opal",
    )
    last_names = ("Nguyen", "Tran", "Pham", "Kim", "Patel", "Silva", "Nowak", "Brown", "Meyer", "Sato")

    bid = 900000
    for _ in range(140):
        code = rng.choice(codes)
        gap = rng.randint(3, 16)
        ci = last_free[code] + timedelta(days=gap)
        if ci > date(2026, 8, 28):
            continue
        nights = rng.randint(2, 7)
        co = ci + timedelta(days=nights)
        last_free[code] = co
        status = rng.choice(statuses)
        guest = Guest(
            full_name=f"{rng.choice(first_names)} {rng.choice(last_names)}",
            email=f"synthetic.{bid}@demo.hotel",
            country_code=rng.choice(["VNM", "KOR", "SGP", "JPN", "USA", "DEU", "AUS"]),
        )
        db.add(guest)
        db.flush()
        adr = Decimal(str(round(rng.uniform(62, 165), 2)))
        db.add(
            Booking(
                booking_id=f"BKG-SYN-{bid}",
                guest_id=guest.id,
                room_id=rooms[code].id,
                check_in=ci,
                check_out=co,
                status=status,
                total_price=(adr * Decimal(nights)).quantize(Decimal("0.01")),
            )
        )
        bid += 1


def seed_pricing_decision_demo(db, rooms: dict[str, Room], room_types: dict[str, RoomType], p_nt: Property, p_dl: Property) -> None:
    rng = random.Random(77)
    nt_codes = [c for c in ("A", "B", "C", "D", "E", "F", "G") if c in rooms and c in room_types]
    dl_codes = [c for c in ("H", "I", "K", "L", "P") if c in rooms and c in room_types]
    scenarios = [
        ("predictive_dynamic", "baseline", "BAR rail within rule band"),
        ("predictive_dynamic", "high_season", "Lift BAR +6% on weekend shoulder"),
        ("predictive_dynamic", "low_season", "Soft BAR −4% midweek fill"),
        ("competitor_match", "baseline", "Trim vs Coral Bay comp set"),
        ("manual_override", "baseline", "GM hold rate — conference block"),
        ("rules_audit", "baseline", "Clamp hit max_price ceiling"),
    ]
    for i in range(48):
        use_nt = rng.random() < 0.62
        codes = nt_codes if use_nt else dl_codes
        if not codes:
            codes = list(rooms.keys())[:4]
        code = rng.choice(codes)
        prop = p_nt if code in nt_codes or use_nt else p_dl
        r = rooms[code]
        rt = room_types.get(code)
        src, demand, label = scenarios[i % len(scenarios)]
        raw_p = Decimal(str(round(rng.uniform(72, 188), 2)))
        clamp = rng.choice([-12, -6, 0, 4, 9, 14])
        final_p = max(Decimal("45"), (raw_p + Decimal(clamp)).quantize(Decimal("0.01")))
        tgt = date(2026, 4, 1) + timedelta(days=(i * 11) % 120)
        log_pricing_decision(
            db,
            source=src,
            property_id=prop.id,
            room_id=r.id,
            room_type_id=rt.id if rt else None,
            target_date=tgt,
            raw_price=raw_p,
            final_price=final_p,
            scenario_label=label,
            demand_scenario=demand,
            applied_rules=["min_price_floor", "max_price_ceiling", "weekend_premium"][: rng.randint(1, 3)],
            context={"demo_seed": True, "iteration": i, "spread_pp": float(final_p - raw_p)},
        )


def seed_da_lat_competitors(db) -> None:
    samples = [
        CompetitorData(
            source="agoda_json_import",
            search_area="Đà Lạt",
            hotel_name="Fog Valley Boutique Đà Lạt",
            current_price=Decimal("62.00"),
            currency="USD",
            availability_status="Few rooms left",
            hotel_url="https://www.agoda.com/",
            reviews=[{"comment": "Quiet hillside rooms; cool nights even without AC.", "reviewer": None, "review_date": None}],
        ),
        CompetitorData(
            source="agoda_json_import",
            search_area="Đà Lạt",
            hotel_name="Pine Terrace Hotel",
            current_price=Decimal("71.00"),
            currency="USD",
            availability_status="available",
            hotel_url="https://www.agoda.com/",
            reviews=[{"comment": "Garden breakfast; slightly uphill walk from town.", "reviewer": None, "review_date": None}],
        ),
        CompetitorData(
            source="agoda_json_import",
            search_area="Đà Lạt",
            hotel_name="Misty Lake Lodge",
            current_price=Decimal("58.00"),
            currency="USD",
            availability_status="Limited availability",
            hotel_url="https://www.agoda.com/",
            reviews=[{"comment": "Lake views on upper floors; thin walls between rooms.", "reviewer": None, "review_date": None}],
        ),
        CompetitorData(
            source="demo_seed",
            search_area="Đà Lạt",
            hotel_name="Dalat Highland Manor",
            current_price=Decimal("67.50"),
            currency="USD",
            availability_status="Few rooms left",
            hotel_url="https://www.agoda.com/",
            reviews=[{"comment": "Fireplace suites; slightly noisy plumbing early morning.", "reviewer": None, "review_date": None}],
        ),
        CompetitorData(
            source="demo_seed",
            search_area="Đà Lạt",
            hotel_name="Lantern Valley Inn",
            current_price=Decimal("54.00"),
            currency="USD",
            availability_status="available",
            hotel_url="https://www.agoda.com/",
            reviews=[{"comment": "Walkable night market; compact bathrooms.", "reviewer": None, "review_date": None}],
        ),
        CompetitorData(
            source="demo_seed",
            search_area="Đà Lạt",
            hotel_name="Tea Hills Retreat",
            current_price=Decimal("89.00"),
            currency="USD",
            availability_status="Selling fast",
            hotel_url="https://www.agoda.com/",
            reviews=[{"comment": "Panorama villas; worth the uphill drive.", "reviewer": None, "review_date": None}],
        ),
        CompetitorData(
            source="demo_seed",
            search_area="Đà Lạt",
            hotel_name="Rosemary Homestay DL",
            current_price=Decimal("41.00"),
            currency="USD",
            availability_status="available",
            hotel_url="https://www.agoda.com/",
            reviews=[{"comment": "Host-led coffee tour; thin walls.", "reviewer": None, "review_date": None}],
        ),
    ]
    db.add_all(samples)


def seed_guest_crm_demo(db) -> None:
    demos = [
        ("m.anh.le@email.com", ["VIP", "Repeat"], "Requested quiet floor and airport pickup."),
        ("sj.park@email.com", ["OTA-lead", "Price-sensitive"], "Considering flexible dates; compares Agoda vs direct."),
        ("minh.tran@email.com", ["Corporate", "Invoice"], "VAT invoice — finance contact verified."),
        ("s.okafor@email.com", ["Family", "High NPS"], "Kids amenity kit; asked about laundry."),
        ("wei.chen@email.com", ["Bleisure", "Late checkout"], "Extend 2h if occupancy allows."),
        ("o.mueller@email.com", ["Intl FIT", "Breakfast plus"], "Vegetarian preference logged."),
        ("j.porter@email.com", ["Member rate", "Upsell spa"], "Interested in couple massage slot."),
        ("thu.nguyen@email.com", ["Domestic weekend", "Repeat"], "Prefers high floor sea corner."),
        ("jisu.kim@email.com", ["K-market", "OTA"], "Mobile-first; responds on Kakao."),
        ("m.santos@email.com", ["Long stay", "Remote work"], "Desk lamp requested."),
        ("a.rivera@email.com", ["Conference adjacent"], "Asked shuttle to convention centre."),
        ("l.dupont@email.com", ["Direct booker"], "Joined newsletter for flash deals."),
        ("e.clarke@email.com", ["Solo", "Low touch"], "Self check-in OK."),
        ("r.walsh@email.com", ["Group split bill"], "Two cards on file."),
        ("fatima.h@email.com", ["Đà Lạt villa curious"], "Compared Pine Mist vs comps."),
        ("t.brennan@email.com", ["Hiking segment"], "Early breakfast 6:30."),
        ("y.tanaka@email.com", ["Photography trip"], "Quiet hours respected."),
        ("s.rossi@email.com", ["Romance package"], "Anniversary wine voucher."),
    ]
    for email, tags, note_body in demos:
        guest = db.scalar(select(Guest).where(Guest.email == email))
        if guest is None:
            continue
        for tag in tags:
            db.add(GuestTag(guest_id=guest.id, tag=tag))
        db.add(GuestNote(guest_id=guest.id, body=note_body, author_label="Front desk"))
        db.add(
            GuestTimelineEvent(
                guest_id=guest.id,
                event_type="profile_enriched",
                detail=f"Tagged {', '.join(tags)} from CRM demo seed.",
            )
        )

    synth_tags = ("Pipeline demo", "Yield cohort", "Intl mix", "Weekend warrior", "Bleisure probe", "Corporate trial")
    synth_guests = db.scalars(select(Guest).where(Guest.email.like("%@demo.hotel")).limit(220)).all()
    for i, guest in enumerate(synth_guests):
        if i % 3 != 0:
            continue
        db.add(GuestTag(guest_id=guest.id, tag=synth_tags[i % len(synth_tags)]))
        if i % 15 == 0:
            db.add(
                GuestNote(
                    guest_id=guest.id,
                    body="Synthetic itinerary — demo CRM breadth.",
                    author_label="System seed",
                )
            )
            db.add(
                GuestTimelineEvent(
                    guest_id=guest.id,
                    event_type="note_added",
                    detail="Auto note from synthetic booking cohort.",
                )
            )


def build_check_in(row: pd.Series) -> date:
    return date(
        int(row["arrival_date_year"]),
        MONTH_TO_NUMBER[str(row["arrival_date_month"])],
        int(row["arrival_date_day_of_month"]),
    )


def seed_bookings(db, rooms: dict[str, Room], limit: int | None = 3200) -> None:
    booking_csv = find_csv("FILE")
    df = pd.read_csv(booking_csv)
    if limit is not None:
        df = df.head(limit)

    guest_cache: dict[str, Guest] = {}
    for index, row in df.iterrows():
        guest_key = f"{row.get('email', '')}|{row.get('phone-number', '')}|{row.get('name', '')}"
        guest = guest_cache.get(guest_key)
        if guest is None:
            guest = Guest(
                full_name=None if pd.isna(row.get("name")) else str(row.get("name")).strip(),
                email=None if pd.isna(row.get("email")) else str(row.get("email")).strip().lower(),
                country_code=(None if pd.isna(row.get("country")) else str(row["country"]).strip()),
            )
            db.add(guest)
            db.flush()
            guest_cache[guest_key] = guest

        room_code = str(row["assigned_room_type"]).strip()
        room = rooms.get(room_code) or next(iter(rooms.values()))
        check_in = build_check_in(row)
        stay_nights = int(row["stays_in_week_nights"]) + int(row["stays_in_weekend_nights"])
        stay_nights = max(stay_nights, 1)
        check_out = pd.Timestamp(check_in) + pd.Timedelta(days=stay_nights)
        total_price = Decimal(str(max(float(row["adr"]), 0))) * Decimal(stay_nights)

        db.add(
            Booking(
                booking_id=f"BKG-{index + 1:07d}",
                guest_id=guest.id,
                room_id=room.id,
                check_in=check_in,
                check_out=check_out.date(),
                status=str(row["reservation_status"]).strip().lower().replace("-", "_"),
                total_price=total_price.quantize(Decimal("0.01")),
            )
        )


def seed_competitor_data(db) -> None:
    if BUNDLED_COMPETITOR_JSON.exists():
        import_multiple_competitor_json_files(
            db=db,
            json_paths=[BUNDLED_COMPETITOR_JSON],
            replace_existing=True,
        )
        return

    extra_paths = [path for path in OPTIONAL_COMPETITOR_JSON_PATHS if path.exists()]
    if extra_paths:
        import_multiple_competitor_json_files(
            db=db,
            json_paths=extra_paths,
            replace_existing=True,
        )
        return

    sample_rows = [
        CompetitorData(
            source="agoda_json_import",
            search_area="Nha Trang",
            hotel_name="Coral Bay Residence Nha Trang",
            current_price=Decimal("74.00"),
            currency="USD",
            availability_status="Few rooms left at this price",
            hotel_url="https://www.agoda.com/",
            reviews=[
                {"reviewer": None, "review_date": None, "comment": "Quiet floor; beach is a short walk."},
                {"reviewer": None, "review_date": None, "comment": "Good value for a sea-view room."},
            ],
        ),
        CompetitorData(
            source="agoda_json_import",
            search_area="Nha Trang",
            hotel_name="Truong Hai Hotel",
            current_price=Decimal("81.00"),
            currency="USD",
            availability_status="unavailable",
            hotel_url="https://www.agoda.com/",
            reviews=[
                {"reviewer": None, "review_date": None, "comment": "Spacious room for the price; clean."},
                {"reviewer": None, "review_date": None, "comment": "Hard to find first time; good stay near beach."},
            ],
        ),
        CompetitorData(
            source="agoda_json_import",
            search_area="Nha Trang",
            hotel_name="Anna Belle Doi Rong Hotel",
            current_price=Decimal("69.00"),
            currency="USD",
            availability_status="available",
            hotel_url="https://www.agoda.com/",
            reviews=[
                {"reviewer": None, "review_date": None, "comment": "View from higher floors; breakfast fresh."},
                {"reviewer": None, "review_date": None, "comment": "Slower check-in at peak hours."},
            ],
        ),
        CompetitorData(
            source="agoda_json_import",
            search_area="Nha Trang",
            hotel_name="Azure Pearl Nha Trang",
            current_price=Decimal("91.00"),
            currency="USD",
            availability_status="Limited availability",
            hotel_url="https://www.agoda.com/",
            reviews=[
                {"reviewer": None, "review_date": None, "comment": "Pool and rooftop bar are the highlight."},
                {"reviewer": None, "review_date": None, "comment": "Premium feel without Cam Ranh resort pricing."},
            ],
        ),
        CompetitorData(
            source="agoda_json_import",
            search_area="Nha Trang",
            hotel_name="Golden Wave Suites",
            current_price=Decimal("72.00"),
            currency="USD",
            availability_status="Only 2 rooms left",
            hotel_url="https://www.agoda.com/",
            reviews=[
                {"reviewer": None, "review_date": None, "comment": "Good value; family room worked for two kids."},
            ],
        ),
        CompetitorData(
            source="agoda_json_import",
            search_area="Nha Trang",
            hotel_name="Seaside Pearl Hotel",
            current_price=Decimal("78.00"),
            currency="USD",
            availability_status="Last rooms — selling fast",
            hotel_url="https://www.agoda.com/",
            reviews=[
                {"reviewer": None, "review_date": None, "comment": "Great beach access; helpful tour desk."},
            ],
        ),
        CompetitorData(
            source="agoda_json_import",
            search_area="Nha Trang",
            hotel_name="Horizon City Hotel Nha Trang",
            current_price=Decimal("86.00"),
            currency="USD",
            availability_status="Limited",
            hotel_url="https://www.agoda.com/",
            reviews=[
                {"reviewer": None, "review_date": None, "comment": "Central for food and night market."},
            ],
        ),
        CompetitorData(
            source="agoda_json_import",
            search_area="Nha Trang",
            hotel_name="Marina Boutique Nha Trang",
            current_price=Decimal("95.00"),
            currency="USD",
            availability_status="Few rooms left",
            hotel_url="https://www.agoda.com/",
            reviews=[
                {"reviewer": None, "review_date": None, "comment": "Personal service; excellent breakfast."},
            ],
        ),
    ]
    db.add_all(sample_rows)


def seed_active_demo_bookings(db, rooms: dict[str, Room]) -> None:
    """Overlapping confirmed stays in May 2026 so the occupancy heatmap shows varied night-by-night %."""
    samples = [
        # Nha Trang hub (A–G): staggered lengths and dates so occupied_room counts range across the month.
        ("Le Thi Mai Anh", "m.anh.le@email.com", "A", date(2026, 5, 1), 5, Decimal("680.00")),
        ("Park Seo-jun", "sj.park@email.com", "B", date(2026, 5, 1), 8, Decimal("920.00")),
        ("Tran Duc Minh", "minh.tran@email.com", "C", date(2026, 5, 3), 10, Decimal("890.00")),
        ("Sarah Okafor", "s.okafor@email.com", "D", date(2026, 5, 5), 12, Decimal("1420.00")),
        ("Chen Wei", "wei.chen@email.com", "E", date(2026, 5, 7), 9, Decimal("810.00")),
        ("Olivia Müller", "o.mueller@email.com", "F", date(2026, 5, 10), 11, Decimal("990.00")),
        ("James Porter", "j.porter@email.com", "G", date(2026, 5, 12), 14, Decimal("1120.00")),
        ("Nguyen Hoai Thu", "thu.nguyen@email.com", "A", date(2026, 5, 14), 4, Decimal("520.00")),
        ("Kim Ji-su", "jisu.kim@email.com", "B", date(2026, 5, 20), 5, Decimal("610.00")),
        ("Maria Santos", "m.santos@email.com", "C", date(2026, 5, 18), 6, Decimal("720.00")),
        ("Alex Rivera", "a.rivera@email.com", "D", date(2026, 5, 22), 5, Decimal("640.00")),
        ("Luc Dupont", "l.dupont@email.com", "E", date(2026, 5, 24), 4, Decimal("480.00")),
        ("Emma Clarke", "e.clarke@email.com", "F", date(2026, 5, 26), 3, Decimal("390.00")),
        ("Ryan Walsh", "r.walsh@email.com", "G", date(2026, 5, 27), 4, Decimal("420.00")),
        # Đà Lạt (H, I, K): adds spread when viewing all properties.
        ("Fatima Al-Hassan", "fatima.h@email.com", "H", date(2026, 5, 2), 7, Decimal("770.00")),
        ("Tom Brennan", "t.brennan@email.com", "I", date(2026, 5, 9), 6, Decimal("690.00")),
        ("Yuki Tanaka", "y.tanaka@email.com", "K", date(2026, 5, 16), 8, Decimal("820.00")),
        ("Sofia Rossi", "s.rossi@email.com", "H", date(2026, 5, 21), 5, Decimal("590.00")),
    ]

    for index, (full_name, email, room_code, check_in, nights, total_price) in enumerate(samples, start=1):
        guest = Guest(full_name=full_name, email=email, country_code="VNM")
        db.add(guest)
        db.flush()

        room = rooms.get(room_code) or next(iter(rooms.values()))
        db.add(
            Booking(
                booking_id=f"ORT-2026-{index:04d}",
                guest_id=guest.id,
                room_id=room.id,
                check_in=check_in,
                check_out=check_in + timedelta(days=nights),
                status="confirmed",
                total_price=total_price,
            )
        )


def main() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        room_types = seed_room_types(db)
        p_nt, p_dl = seed_properties(db)
        rooms = seed_rooms(db, room_types, p_nt, p_dl)
        seed_room_price_rules(db, room_types)
        seed_ideal_country_summary(db)
        seed_ideal_monthly_revenue(db)
        seed_ideal_cancellation_summary(db)
        seed_bookings(db, rooms)
        seed_competitor_data(db)
        seed_da_lat_competitors(db)
        seed_alert_thresholds(db, p_nt, p_dl)
        seed_active_demo_bookings(db, rooms)
        seed_modern_synthetic_bookings(db, rooms)
        seed_pricing_decision_demo(db, rooms, room_types, p_nt, p_dl)
        seed_guest_crm_demo(db)
        db.commit()

    print("Database seeded successfully.")


if __name__ == "__main__":
    main()
