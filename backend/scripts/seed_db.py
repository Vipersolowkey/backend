from __future__ import annotations

import os
import sys
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path

import pandas as pd

PROJECT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.db.session import Base, SessionLocal, engine
from app.models import (
    Booking,
    CancellationSummary,
    CompetitorData,
    CountrySummary,
    Guest,
    MonthlyRevenueSummary,
    Room,
    RoomType,
)
from app.services.competitor_import import import_multiple_competitor_json_files

CSV_DIR = PROJECT_DIR
BUNDLED_COMPETITOR_JSON = BACKEND_DIR / "data" / "mvp_competitors_agoda.json"
OPTIONAL_COMPETITOR_JSON_PATHS = [
    Path(r"C:\Users\Vinh\Downloads\Agoda Properties Listings.json"),
    Path(r"C:\Users\Vinh\Downloads\Booking Hotel Listings .json"),
]


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


def seed_rooms(db, room_types: dict[str, RoomType]) -> dict[str, Room]:
    rooms: dict[str, Room] = {}
    for code, room_type in room_types.items():
        room = Room(room_number=f"{code}-101", room_type_id=room_type.id, status="available")
        db.add(room)
        rooms[code] = room
    db.flush()
    return rooms


def seed_country_summary(db) -> None:
    df = pd.read_csv(find_csv("country_summary"))
    for _, row in df.iterrows():
        db.add(
            CountrySummary(
                country=str(row["country"]).strip(),
                total_bookings=int(row["total_bookings"]),
                successful_bookings=int(row["successful_bookings"]),
                avg_adr=Decimal(str(row["avg_adr"])),
            )
        )


def seed_monthly_revenue(db) -> None:
    df = pd.read_csv(find_csv("monthly_revenue_summary"))
    for _, row in df.iterrows():
        db.add(
            MonthlyRevenueSummary(
                year=int(row["arrival_date_year"]),
                month_name=str(row["arrival_date_month"]),
                total_estimated_revenue=Decimal(str(row["total_estimated_revenue"])),
                avg_adr=Decimal(str(row["avg_adr"])),
                avg_stay_nights=Decimal(str(row["avg_stay_nights"])),
            )
        )


def seed_cancellation_summary(db) -> None:
    df = pd.read_csv(find_csv("cancellation_summary"))
    for _, row in df.iterrows():
        db.add(
            CancellationSummary(
                hotel=str(row["hotel"]),
                market_segment=str(row["market_segment"]),
                deposit_type=str(row["deposit_type"]),
                total_bookings=int(row["total_bookings"]),
                canceled_bookings=int(row["canceled_bookings"]),
                cancellation_rate_pct=Decimal(str(row["cancellation_rate_pct"])),
            )
        )


def build_check_in(row: pd.Series) -> date:
    return date(
        int(row["arrival_date_year"]),
        MONTH_TO_NUMBER[str(row["arrival_date_month"])],
        int(row["arrival_date_day_of_month"]),
    )


def seed_bookings(db, rooms: dict[str, Room], limit: int | None = 5000) -> None:
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
    samples = [
        ("Le Thi Mai Anh", "m.anh.le@email.com", "A", date(2026, 5, 2), 3, Decimal("540.00")),
        ("Park Seo-jun", "sj.park@email.com", "D", date(2026, 5, 8), 2, Decimal("420.00")),
        ("Tran Duc Minh", "minh.tran@email.com", "E", date(2026, 5, 18), 3, Decimal("390.00")),
        ("Sarah Okafor", "s.okafor@email.com", "I", date(2026, 5, 22), 4, Decimal("1180.00")),
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
        rooms = seed_rooms(db, room_types)
        seed_country_summary(db)
        seed_monthly_revenue(db)
        seed_cancellation_summary(db)
        seed_bookings(db, rooms)
        seed_competitor_data(db)
        seed_active_demo_bookings(db, rooms)
        db.commit()

    print("Database seeded successfully.")


if __name__ == "__main__":
    main()
