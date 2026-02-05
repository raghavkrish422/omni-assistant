// Calendar Tool — Demo mode

export function executeCalendarTool(toolName: string, args: Record<string, any>): string {
  if (toolName === "create_calendar_event") {
    const eventId = `EVT-${Date.now().toString(36).toUpperCase()}`;
    return JSON.stringify({
      demo_mode: true,
      event: {
        event_id: eventId,
        title: args.title,
        date: args.date,
        start_time: args.start_time,
        end_time: args.end_time || calculateEndTime(args.start_time, 60),
        description: args.description || "",
        attendees: args.attendees || [],
        location: args.location || "",
        status: "created",
        calendar: "Google Calendar (demo)",
        message: `Event "${args.title}" created for ${args.date} at ${args.start_time}.`,
      },
    });
  }

  if (toolName === "list_calendar_events") {
    const startDate = args.start_date || new Date().toISOString().split("T")[0];
    const events = generateDemoEvents(startDate);
    return JSON.stringify({
      demo_mode: true,
      date_range: { start: startDate, end: args.end_date || startDate },
      events,
    });
  }

  return JSON.stringify({ error: "Unknown calendar action" });
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const totalMinutes = h * 60 + m + durationMinutes;
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

function generateDemoEvents(date: string): any[] {
  return [
    {
      event_id: "EVT-DEMO1",
      title: "Team Standup",
      date,
      start_time: "09:00",
      end_time: "09:15",
      location: "Zoom",
      attendees: ["team@company.com"],
    },
    {
      event_id: "EVT-DEMO2",
      title: "Product Review",
      date,
      start_time: "11:00",
      end_time: "12:00",
      location: "Conference Room A",
      attendees: ["pm@company.com", "eng@company.com"],
    },
    {
      event_id: "EVT-DEMO3",
      title: "Lunch with Sarah",
      date,
      start_time: "12:30",
      end_time: "13:30",
      location: "Café Nero",
      attendees: ["sarah@example.com"],
    },
  ];
}
