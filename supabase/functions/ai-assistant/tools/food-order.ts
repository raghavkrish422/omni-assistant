// Food Order Tool — Demo mode with realistic simulated data

const DEMO_RESTAURANTS: Record<string, any> = {
  bawarchi: {
    id: "bawarchi-framingham",
    name: "Bawarchi Biryanis",
    location: "Framingham, MA",
    platform: "DoorDash",
    rating: 4.5,
    delivery_time: "35-45 min",
    delivery_fee: "$3.99",
    menu: [
      { name: "Paneer Butter Masala", price: 15.99, category: "Entrees" },
      { name: "Butter Naan", price: 3.49, category: "Breads" },
      { name: "Chicken Biryani", price: 16.99, category: "Biryanis" },
      { name: "Garlic Naan", price: 3.99, category: "Breads" },
      { name: "Mango Lassi", price: 4.99, category: "Drinks" },
      { name: "Samosa (2 pcs)", price: 5.99, category: "Appetizers" },
      { name: "Dal Tadka", price: 12.99, category: "Entrees" },
      { name: "Tandoori Chicken", price: 14.99, category: "Entrees" },
    ],
  },
  dominos: {
    id: "dominos-boston",
    name: "Domino's Pizza",
    location: "Boston, MA",
    platform: "DoorDash",
    rating: 4.0,
    delivery_time: "25-35 min",
    delivery_fee: "$2.99",
    menu: [
      { name: "Large Pepperoni Pizza", price: 14.99, category: "Pizzas" },
      { name: "Medium Cheese Pizza", price: 11.99, category: "Pizzas" },
      { name: "Chicken Wings (8 pcs)", price: 9.99, category: "Sides" },
      { name: "Breadsticks", price: 5.99, category: "Sides" },
      { name: "2-Liter Coke", price: 3.49, category: "Drinks" },
    ],
  },
  chipotle: {
    id: "chipotle-cambridge",
    name: "Chipotle Mexican Grill",
    location: "Cambridge, MA",
    platform: "UberEats",
    rating: 4.3,
    delivery_time: "20-30 min",
    delivery_fee: "$1.99",
    menu: [
      { name: "Chicken Burrito Bowl", price: 11.75, category: "Bowls" },
      { name: "Steak Burrito", price: 12.50, category: "Burritos" },
      { name: "Chips & Guacamole", price: 5.95, category: "Sides" },
      { name: "Chicken Quesadilla", price: 9.95, category: "Quesadillas" },
      { name: "Sofritas Bowl", price: 10.50, category: "Bowls" },
    ],
  },
};

function findRestaurant(query: string): any | null {
  const q = query.toLowerCase();
  for (const [key, rest] of Object.entries(DEMO_RESTAURANTS)) {
    if (q.includes(key) || q.includes(rest.name.toLowerCase().split(" ")[0].toLowerCase())) {
      return rest;
    }
  }
  // Generic fallback for any restaurant query
  return {
    id: `generic-${Date.now()}`,
    name: query,
    location: "Your area",
    platform: "DoorDash",
    rating: 4.2,
    delivery_time: "30-45 min",
    delivery_fee: "$3.99",
    menu: [
      { name: "Popular Item #1", price: 12.99, category: "Entrees" },
      { name: "Popular Item #2", price: 14.99, category: "Entrees" },
      { name: "Side Dish", price: 5.99, category: "Sides" },
      { name: "Beverage", price: 3.49, category: "Drinks" },
    ],
  };
}

export function executeFoodOrderTool(toolName: string, args: Record<string, any>): string {
  if (toolName === "search_restaurants") {
    const restaurant = findRestaurant(args.query || "");
    if (!restaurant) {
      return JSON.stringify({ error: `No restaurants found for "${args.query}"` });
    }

    return JSON.stringify({
      demo_mode: true,
      results: [
        {
          id: restaurant.id,
          name: restaurant.name,
          location: restaurant.location,
          platform: restaurant.platform,
          rating: restaurant.rating,
          delivery_time: restaurant.delivery_time,
          delivery_fee: restaurant.delivery_fee,
          menu: restaurant.menu,
        },
      ],
    });
  }

  if (toolName === "place_food_order") {
    const items = args.items ?? [];
    let subtotal = 0;
    const orderItems = items.map((item: any) => {
      // Try to find price from demo data
      let price = 12.99; // default
      for (const rest of Object.values(DEMO_RESTAURANTS)) {
        const menuItem = rest.menu.find((m: any) =>
          m.name.toLowerCase().includes(item.name.toLowerCase()) ||
          item.name.toLowerCase().includes(m.name.toLowerCase())
        );
        if (menuItem) {
          price = menuItem.price;
          break;
        }
      }
      const total = price * (item.quantity || 1);
      subtotal += total;
      return {
        name: item.name,
        quantity: item.quantity || 1,
        unit_price: `$${price.toFixed(2)}`,
        total: `$${total.toFixed(2)}`,
        special_instructions: item.special_instructions || null,
      };
    });

    const deliveryFee = 3.99;
    const serviceFee = 2.49;
    const tax = subtotal * 0.0625;
    const total = subtotal + deliveryFee + serviceFee + tax;

    return JSON.stringify({
      demo_mode: true,
      order: {
        order_id: `ORD-${Date.now().toString(36).toUpperCase()}`,
        status: "confirmed",
        restaurant: args.restaurant_id,
        items: orderItems,
        subtotal: `$${subtotal.toFixed(2)}`,
        delivery_fee: `$${deliveryFee.toFixed(2)}`,
        service_fee: `$${serviceFee.toFixed(2)}`,
        tax: `$${tax.toFixed(2)}`,
        total: `$${total.toFixed(2)}`,
        estimated_delivery: "35-45 minutes",
        delivery_address: args.delivery_address || "Your saved address",
        payment: args.payment_method || "demo_card ending in 4242",
      },
    });
  }

  return JSON.stringify({ error: "Unknown food order action" });
}
