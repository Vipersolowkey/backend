from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from app.db.session import Base, SessionLocal, engine
from app.models import (
    Booking,
    CancellationSummary,
    CountrySummary,
    Guest,
    MonthlyRevenueSummary,
    Property,
    Room,
    RoomType,
)


def main() -> None:
    print("Ensuring schema...", flush=True)
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        print("Writing compact demo dataset...", flush=True)
        if db.query(Booking).count() > 0:
            print("Bookings already exist, skipping reseed.", flush=True)
            return

        property_main = Property(name="Azure Pearl — Nha Trang Hub", code="NT-HUB", area_name="Nha Trang")
        room_type = RoomType(code="A", name="Classic Room", base_price=Decimal("85.00"))
        db.add_all([property_main, room_type])
        db.flush()

        room = Room(room_number="A-101", room_type_id=room_type.id, property_id=property_main.id, status="available")
        guest_1 = Guest(full_name="Tran Minh", email="tran.minh@example.com", country_code="VNM")
        guest_2 = Guest(full_name="Anna Lee", email="anna.lee@example.com", country_code="KOR")
        db.add_all([room, guest_1, guest_2])
        db.flush()

        today = date.today()
        db.add_all(
            [
                Booking(
                    booking_id="LIVE-0001",
                    guest_id=guest_1.id,
                    room_id=room.id,
                    check_in=today - timedelta(days=5),
                    check_out=today - timedelta(days=2),
                    status="confirmed",
                    total_price=Decimal("330.00"),
                ),
                Booking(
                    booking_id="LIVE-0002",
                    guest_id=guest_2.id,
                    room_id=room.id,
                    check_in=today + timedelta(days=1),
                    check_out=today + timedelta(days=4),
                    status="confirmed",
                    total_price=Decimal("420.00"),
                ),
            ]
        )

        db.add_all(
            [
                MonthlyRevenueSummary(
                    year=today.year,
                    month_name=today.strftime("%B"),
                    total_estimated_revenue=Decimal("245000.00"),
                    avg_adr=Decimal("89.50"),
                    avg_stay_nights=Decimal("2.80"),
                ),
                CountrySummary(country="VNM", total_bookings=90, successful_bookings=83, avg_adr=Decimal("91.20")),
                CountrySummary(country="KOR", total_bookings=52, successful_bookings=47, avg_adr=Decimal("104.70")),
                CancellationSummary(
                    hotel="Azure Pearl",
                    market_segment="Online",
                    deposit_type="No Deposit",
                    total_bookings=140,
                    canceled_bookings=18,
                    cancellation_rate_pct=Decimal("12.86"),
                ),
            ]
        )
        db.commit()

    print("Minimal remote seed completed.", flush=True)


if __name__ == "__main__":
    main()
