/** Static fixtures: offers feed, in-room menu, lighting presets (guest app + owner pulse). */

export const guestProfile = {
  name: "Alex Nguyen",
  room: "NT-D-2135",
  checkIn: "2026-05-03",
  checkOut: "2026-05-06",
  bookingRef: "AZP-88421",
  birthday: "1992-08-14",
  anniversary: "2024-06-01",
  spotifyLinked: false,
};

export const upsellFeed = [
  {
    id: "smart-airport",
    type: "smart_notice",
    title: "Thanks for booking with us!",
    body: "Want a smoother arrival? Pre-book airport pickup and we will meet you at the terminal.",
    cta: "Book airport transfer",
    priceHint: "From 350,000 VND",
  },
  {
    id: "upgrade-sea",
    type: "room_upgrade",
    title: "Upgrade to a sea-view room",
    body: "For just 50,000 VND more, move up to a sea-view room and catch sunset from your balcony. Interested?",
    cta: "Upgrade now",
    priceHint: "+50,000 VND",
    imageAlt: "Balcony sea view at sunset",
  },
  {
    id: "spa-prebook",
    type: "prebook",
    title: "Spa golden hour",
    body: "Spa slots fill fast at peak hours (5–7 PM). Book ahead and save 15%.",
    cta: "Book spa",
    priceHint: "−15%",
  },
  {
    id: "addons",
    type: "addon",
    title: "Customize your room",
    body: "Down pillows, relaxing essential oils, or an early breakfast if you have an early flight.",
    cta: "Choose add-ons",
    priceHint: "From 80,000 VND",
  },
  {
    id: "weather-rain",
    type: "weather",
    title: "Rainy day outside",
    body: "Enjoy afternoon tea in the lounge or order in-room dining with our rainy-day menu.",
    cta: "View rainy-day menu",
    conditional: true,
  },
  {
    id: "happy-hour",
    type: "happy_hour",
    title: "Happy Hour Rooftop",
    body: "Happy Hour at the Rooftop Bar starts in one hour — buy one cocktail, get one free.",
    cta: "Reserve bar seats",
    priceHint: "4:00–6:00 PM",
  },
];

export const dineMenu = [
  {
    id: "burger",
    name: "Wagyu burger & pepper sauce",
    desc: "Mashed potatoes, pickled radish salad.",
    price: 285000,
    imageUrl:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=960&q=80",
    imageTone: "from-amber-900/80 to-stone-900",
    pairingOptions: [
      {
        id: "fries",
        labelVi: "Khoai tây chiên giòn",
        description: "Món kèm — phục vụ phòng",
        priceVnd: 65000,
        category: "dining",
      },
      {
        id: "kids_juice",
        labelVi: "Nước ép táo cho trẻ",
        description: "Ly 250ml, ít đường",
        priceVnd: 55000,
        category: "dining",
      },
      {
        id: "iced_lemongrass",
        labelVi: "Trà chanh sả đá",
        description: "Giải nhiệt khi ăn đồ nóng",
        priceVnd: 45000,
        category: "dining",
      },
    ],
  },
  {
    id: "pho",
    name: "Pho (late-night)",
    desc: "12-hour broth, fresh rice noodles.",
    price: 165000,
    imageUrl:
      "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=960&q=80",
    imageTone: "from-emerald-900/70 to-stone-900",
    pairingOptions: [
      {
        id: "soft_egg",
        labelVi: "Trứng lòng đào thêm",
        description: "Ăn kèm phở",
        priceVnd: 15000,
        category: "dining",
      },
      {
        id: "extra_broth",
        labelVi: "Tô nước dùng thêm",
        description: "Ấm hơn khi trời mưa",
        priceVnd: 35000,
        category: "dining",
      },
      {
        id: "iced_lemongrass",
        labelVi: "Trà chanh sả đá",
        description: "Cân bằng vị ngọt nước dùng",
        priceVnd: 45000,
        category: "dining",
      },
    ],
  },
  {
    id: "tiramisu",
    name: "Espresso tiramisu",
    desc: "Mascarpone, dark cocoa, ladyfingers.",
    price: 95000,
    imageUrl:
      "https://images.unsplash.com/photo-1571877227200-a00810970b03?auto=format&fit=crop&w=960&q=80",
    imageTone: "from-amber-950/90 to-stone-950",
    pairingOptions: [
      {
        id: "affogato",
        labelVi: "Shot espresso affogato",
        description: "Rưới trực tiếp lên tiramisu",
        priceVnd: 45000,
        category: "dining",
      },
      {
        id: "sparkling_split",
        labelVi: "Prosecco ly (187ml)",
        description: "Kỷ niệm / buổi tối lãng mạn",
        priceVnd: 189000,
        category: "dining",
      },
      {
        id: "iced_lemongrass",
        labelVi: "Trà chanh sả đá",
        description: "Nhẹ bụng sau bánh",
        priceVnd: 45000,
        category: "dining",
      },
    ],
  },
];

export const lightingScenes = [
  { id: "reading", label: "Reading", hint: "Warm white light, focused for reading." },
  { id: "relax", label: "Relax", hint: "Dim warm light, soft ambience." },
  { id: "romantic", label: "Romantic", hint: "Amber glow, candle-style mood." },
];

export const ownerPulseRows = [
  {
    guest: "Alex Nguyen",
    room: "NT-D-2135",
    segment: "Guest app",
    lastAction: "Opened spa offer + booked slot",
    upsellValue: 520000,
    status: "in-house",
  },
  {
    guest: "Park Seo-jun",
    room: "NT-B-2125",
    segment: "Pre-arrival",
    lastAction: "Booked round-trip airport transfer",
    upsellValue: 380000,
    status: "arriving",
  },
  {
    guest: "Sarah Okafor",
    room: "NT-E-2144",
    segment: "Guest app",
    lastAction: "Happy hour — confirmed",
    upsellValue: 195000,
    status: "in-house",
  },
  {
    guest: "John Bao",
    room: "NT-D-2135",
    segment: "Family",
    lastAction: "Kids corner pack + minibar",
    upsellValue: 268000,
    status: "in-house",
  },
  {
    guest: "Laura Schmidt",
    room: "NT-F-2142",
    segment: "Bleisure EU",
    lastAction: "Late checkout + express laundry",
    upsellValue: 312000,
    status: "departing-soon",
  },
];

export const ownerPulseKpis = [
  { label: "In-app upsell (7 days)", value: "51.2M ₫", hint: "+14% vs last week" },
  { label: "Guests opted into notifications", value: "72%", hint: "Push / in-stay opt-in" },
  { label: "In-room dining orders", value: "198", hint: "QR + app + room service" },
];
