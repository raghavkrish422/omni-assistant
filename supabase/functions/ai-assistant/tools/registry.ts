// Tool Registry — defines all available tools for the AI agent

export const TOOL_DEFINITIONS = [
  // ─── Pica Integration Tools ───────────────────────────────────
  {
    type: "function",
    function: {
      name: "pica_list_connections",
      description:
        "List all connected third-party platforms (Gmail, Calendly, Slack, Canva, etc.). Call this first to see what integrations the user has available.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pica_search_actions",
      description:
        "Search for available API actions on a connected platform. Call this after listing connections to discover what you can do (e.g., read emails, create events, send messages).",
      parameters: {
        type: "object",
        properties: {
          platform: {
            type: "string",
            description: "Platform name in kebab-case (e.g. 'gmail', 'google-calendar', 'slack', 'calendly')",
          },
          query: {
            type: "string",
            description: "Optional search query to filter actions by title (e.g. 'send email', 'list events')",
          },
        },
        required: ["platform"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pica_get_action_knowledge",
      description:
        "Get detailed API documentation for a specific action, including required parameters, headers, and request/response format. ALWAYS call this before executing an action.",
      parameters: {
        type: "object",
        properties: {
          action_id: {
            type: "string",
            description: "The action ID from the search results",
          },
        },
        required: ["action_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pica_execute_action",
      description:
        "Execute an action on a connected platform via the Pica Passthrough API. REQUIRED WORKFLOW: First call pica_list_connections, then pica_search_actions, then pica_get_action_knowledge, and finally this tool.",
      parameters: {
        type: "object",
        properties: {
          connection_key: {
            type: "string",
            description: "The connection key for the specific platform (from pica_list_connections)",
          },
          method: {
            type: "string",
            enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
            description: "HTTP method for the API call",
          },
          path: {
            type: "string",
            description: "API endpoint path (from action knowledge), e.g. '/gmail/v1/users/me/messages'",
          },
          action_id: {
            type: "string",
            description: "The action ID (from search results)",
          },
          platform: {
            type: "string",
            description: "Platform name",
          },
          headers: {
            type: "object",
            description: "Additional headers if needed",
          },
          query_params: {
            type: "object",
            description: "Query parameters as key-value pairs",
          },
          body: {
            type: "object",
            description: "Request body for POST/PUT/PATCH requests",
          },
        },
        required: ["connection_key", "path", "platform"],
      },
    },
  },

  // ─── Weather ──────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_weather",
      description:
        "Get weather forecast for a location. Returns current conditions and multi-day forecast. Always use this for any weather-related queries.",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "City name or location, e.g. 'Boston, MA'" },
          days: { type: "number", description: "Number of forecast days (1-16, default 1)" },
          unit: { type: "string", enum: ["fahrenheit", "celsius"], description: "Temperature unit" },
        },
        required: ["location"],
      },
    },
  },

  // ─── Calculator ───────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "calculate",
      description:
        "Perform mathematical calculations. Supports basic arithmetic, percentages, unit conversions, and common formulas.",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "Math expression to evaluate, e.g. '47 + 89' or '15% of 200'" },
        },
        required: ["expression"],
      },
    },
  },

  // ─── Food Ordering (Demo) ────────────────────────────────────
  {
    type: "function",
    function: {
      name: "search_restaurants",
      description:
        "Search for restaurants and their menus on delivery platforms. Use this when the user wants to order food.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Restaurant name or cuisine type" },
          location: { type: "string", description: "Delivery address or city" },
          platform: { type: "string", enum: ["doordash", "ubereats", "grubhub", "any"], description: "Preferred platform" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "place_food_order",
      description:
        "Place a food delivery order with specified items. Use after searching restaurants and confirming with the user.",
      parameters: {
        type: "object",
        properties: {
          restaurant_id: { type: "string", description: "Restaurant identifier from search results" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "number" },
                special_instructions: { type: "string" },
              },
              required: ["name", "quantity"],
            },
            description: "Items to order",
          },
          delivery_address: { type: "string", description: "Delivery address" },
          payment_method: { type: "string", description: "Payment method (demo_card, etc.)" },
        },
        required: ["restaurant_id", "items"],
      },
    },
  },

  // ─── Travel (Demo) ───────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "search_flights",
      description: "Search for flights between two cities.",
      parameters: {
        type: "object",
        properties: {
          origin: { type: "string", description: "Departure city or airport code" },
          destination: { type: "string", description: "Arrival city or airport code" },
          departure_date: { type: "string", description: "Departure date (YYYY-MM-DD)" },
          return_date: { type: "string", description: "Return date for round trip (YYYY-MM-DD)" },
          passengers: { type: "number", description: "Number of passengers" },
          cabin_class: { type: "string", enum: ["economy", "business", "first"], description: "Cabin class" },
        },
        required: ["origin", "destination", "departure_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_hotels",
      description: "Search for hotels in a city.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name" },
          check_in: { type: "string", description: "Check-in date (YYYY-MM-DD)" },
          check_out: { type: "string", description: "Check-out date (YYYY-MM-DD)" },
          guests: { type: "number", description: "Number of guests" },
          budget: { type: "string", enum: ["budget", "mid-range", "luxury"], description: "Budget category" },
        },
        required: ["city", "check_in", "check_out"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "book_travel",
      description: "Book a flight or hotel. Requires prior search and user confirmation.",
      parameters: {
        type: "object",
        properties: {
          booking_type: { type: "string", enum: ["flight", "hotel"] },
          booking_id: { type: "string", description: "ID from search results" },
          passenger_name: { type: "string" },
          payment_method: { type: "string" },
        },
        required: ["booking_type", "booking_id"],
      },
    },
  },

  // ─── Calendar (Demo) ─────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "create_calendar_event",
      description: "Create a calendar event. Use for scheduling meetings, reminders, and appointments.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Event title" },
          date: { type: "string", description: "Date (YYYY-MM-DD)" },
          start_time: { type: "string", description: "Start time (HH:MM)" },
          end_time: { type: "string", description: "End time (HH:MM)" },
          description: { type: "string", description: "Event description" },
          attendees: { type: "array", items: { type: "string" }, description: "Email addresses of attendees" },
          location: { type: "string", description: "Event location or meeting link" },
        },
        required: ["title", "date", "start_time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_calendar_events",
      description: "List upcoming calendar events for a date range.",
      parameters: {
        type: "object",
        properties: {
          start_date: { type: "string", description: "Start date (YYYY-MM-DD)" },
          end_date: { type: "string", description: "End date (YYYY-MM-DD)" },
        },
        required: ["start_date"],
      },
    },
  },

  // ─── Meetings (Demo) ─────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "join_meeting",
      description: "Join an online meeting (Zoom/Google Meet) to record, transcribe, and summarize.",
      parameters: {
        type: "object",
        properties: {
          meeting_url: { type: "string", description: "Meeting URL" },
          action: { type: "string", enum: ["join_and_record", "get_transcript", "summarize"], description: "Action to take" },
        },
        required: ["meeting_url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_meeting_summary",
      description: "Get summary and action items from a recorded meeting.",
      parameters: {
        type: "object",
        properties: {
          meeting_id: { type: "string", description: "Meeting ID from join_meeting result" },
        },
        required: ["meeting_id"],
      },
    },
  },

  // ─── Email & Messaging (Demo) ────────────────────────────────
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Compose and send an email (demo mode). For real Gmail, use pica_execute_action with Gmail connection.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Email subject" },
          body: { type: "string", description: "Email body" },
          cc: { type: "array", items: { type: "string" }, description: "CC recipients" },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_message",
      description: "Send a message via SMS, WhatsApp, or Telegram.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["sms", "whatsapp", "telegram"], description: "Messaging platform" },
          to: { type: "string", description: "Recipient phone number or username" },
          message: { type: "string", description: "Message content" },
        },
        required: ["platform", "to", "message"],
      },
    },
  },

  // ─── Payments (Demo) ─────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "process_payment",
      description: "Process a payment (demo/sandbox). Always confirm amount with user first.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Payment amount in dollars" },
          currency: { type: "string", description: "Currency code (USD)" },
          description: { type: "string", description: "Payment description" },
          method: { type: "string", enum: ["demo_card", "demo_paypal", "demo_applepay"], description: "Payment method" },
        },
        required: ["amount", "description"],
      },
    },
  },

  // ─── Memory / Preferences ────────────────────────────────────
  {
    type: "function",
    function: {
      name: "save_preference",
      description: "Save a user preference for future reference.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Preference key (e.g. 'home_address', 'favorite_airline')" },
          value: { type: "string", description: "Preference value" },
        },
        required: ["key", "value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_preferences",
      description: "Retrieve saved user preferences.",
      parameters: {
        type: "object",
        properties: {
          keys: { type: "array", items: { type: "string" }, description: "Specific preference keys. Omit for all." },
        },
      },
    },
  },
];
