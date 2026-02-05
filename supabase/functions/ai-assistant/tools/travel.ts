// Travel Tool — Demo mode with realistic simulated data

function generateFlights(origin: string, destination: string, date: string): any[] {
  const airlines = ["Delta", "United", "JetBlue", "American", "Southwest"];
  const times = ["06:15", "08:30", "10:45", "13:00", "15:30", "18:00", "20:15"];

  return Array.from({ length: 5 }, (_, i) => {
    const airline = airlines[i % airlines.length];
    const depart = times[i];
    const durationH = 2 + Math.floor(Math.random() * 4);
    const durationM = Math.floor(Math.random() * 60);
    const departMin = parseInt(depart.split(":")[0]) * 60 + parseInt(depart.split(":")[1]);
    const arriveMin = departMin + durationH * 60 + durationM;
    const arriveH = Math.floor(arriveMin / 60) % 24;
    const arriveM = arriveMin % 60;
    const arrive = `${String(arriveH).padStart(2, "0")}:${String(arriveM).padStart(2, "0")}`;
    const basePrice = 150 + Math.floor(Math.random() * 350);

    return {
      flight_id: `FL-${airline.substring(0, 2).toUpperCase()}${1000 + i}`,
      airline,
      flight_number: `${airline.substring(0, 2).toUpperCase()}${100 + Math.floor(Math.random() * 900)}`,
      origin,
      destination,
      date,
      departure_time: depart,
      arrival_time: arrive,
      duration: `${durationH}h ${durationM}m`,
      stops: i < 2 ? 0 : i < 4 ? 1 : 2,
      price: {
        economy: `$${basePrice}`,
        business: `$${Math.round(basePrice * 2.5)}`,
        first: `$${Math.round(basePrice * 4.5)}`,
      },
      seats_available: 3 + Math.floor(Math.random() * 20),
    };
  });
}

function generateHotels(city: string, checkIn: string, checkOut: string): any[] {
  const hotels = [
    { name: "The Ritz-Carlton", stars: 5, tier: "luxury" },
    { name: "Marriott Downtown", stars: 4, tier: "mid-range" },
    { name: "Hilton Garden Inn", stars: 4, tier: "mid-range" },
    { name: "Holiday Inn Express", stars: 3, tier: "budget" },
    { name: "Hampton Inn & Suites", stars: 3, tier: "budget" },
  ];

  return hotels.map((h, i) => {
    const basePrice = h.stars === 5 ? 350 : h.stars === 4 ? 200 : 120;
    const price = basePrice + Math.floor(Math.random() * 80);
    return {
      hotel_id: `HTL-${i + 1}`,
      name: `${h.name} ${city}`,
      location: `Downtown ${city}`,
      stars: h.stars,
      tier: h.tier,
      rating: (3.5 + Math.random() * 1.5).toFixed(1),
      price_per_night: `$${price}`,
      check_in: checkIn,
      check_out: checkOut,
      amenities: ["WiFi", "Pool", "Gym", "Breakfast"].slice(0, 2 + h.stars - 3),
      cancellation: h.stars >= 4 ? "Free cancellation until 24h before" : "Non-refundable",
    };
  });
}

export function executeTravelSearchTool(toolName: string, args: Record<string, any>): string {
  if (toolName === "search_flights") {
    const flights = generateFlights(
      args.origin || "BOS",
      args.destination || "NYC",
      args.departure_date || new Date().toISOString().split("T")[0],
    );

    return JSON.stringify({
      demo_mode: true,
      origin: args.origin,
      destination: args.destination,
      date: args.departure_date,
      passengers: args.passengers || 1,
      results: flights,
    });
  }

  if (toolName === "search_hotels") {
    const hotels = generateHotels(
      args.city || "Boston",
      args.check_in || new Date().toISOString().split("T")[0],
      args.check_out || new Date(Date.now() + 86400000).toISOString().split("T")[0],
    );

    return JSON.stringify({
      demo_mode: true,
      city: args.city,
      check_in: args.check_in,
      check_out: args.check_out,
      results: hotels,
    });
  }

  if (toolName === "book_travel") {
    const confirmationCode = `AXM-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    return JSON.stringify({
      demo_mode: true,
      booking: {
        confirmation_code: confirmationCode,
        type: args.booking_type,
        booking_id: args.booking_id,
        status: "confirmed",
        passenger_name: args.passenger_name || "Demo User",
        payment: args.payment_method || "demo_card ending in 4242",
        message: `Your ${args.booking_type} has been booked successfully. Confirmation: ${confirmationCode}`,
      },
    });
  }

  return JSON.stringify({ error: "Unknown travel action" });
}
