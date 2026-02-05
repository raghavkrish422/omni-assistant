// Meeting Tool — Demo mode for Zoom/Google Meet

export function executeMeetingTool(toolName: string, args: Record<string, any>): string {
  if (toolName === "join_meeting") {
    const meetingId = `MTG-${Date.now().toString(36).toUpperCase()}`;
    const action = args.action || "join_and_record";

    if (action === "join_and_record") {
      return JSON.stringify({
        demo_mode: true,
        meeting: {
          meeting_id: meetingId,
          url: args.meeting_url,
          status: "recording",
          started_at: new Date().toISOString(),
          message: `Joined meeting and started recording. Meeting ID: ${meetingId}. I'll provide a summary when the meeting ends.`,
          capabilities: ["audio_recording", "transcription", "speaker_identification"],
        },
      });
    }

    if (action === "get_transcript") {
      return JSON.stringify({
        demo_mode: true,
        transcript: {
          meeting_id: meetingId,
          duration: "45 minutes",
          speakers: ["Alice", "Bob", "Charlie"],
          segments: [
            { speaker: "Alice", time: "00:00", text: "Let's start with the project update..." },
            { speaker: "Bob", time: "05:30", text: "The backend API is now complete..." },
            { speaker: "Charlie", time: "12:00", text: "I've finished the design mockups..." },
            { speaker: "Alice", time: "20:00", text: "Great progress. Let's discuss the timeline..." },
            { speaker: "Bob", time: "35:00", text: "I think we can launch by next Friday..." },
          ],
        },
      });
    }

    if (action === "summarize") {
      return JSON.stringify({
        demo_mode: true,
        summary: {
          meeting_id: meetingId,
          title: "Project Status Meeting",
          duration: "45 minutes",
          participants: ["Alice", "Bob", "Charlie"],
          key_points: [
            "Backend API is complete and tested",
            "Design mockups are ready for review",
            "Target launch date: next Friday",
            "Need to finalize QA testing by Wednesday",
          ],
          action_items: [
            { assignee: "Bob", task: "Complete integration tests by Tuesday", due: "Tuesday" },
            { assignee: "Charlie", task: "Share design specs with frontend team", due: "Tomorrow" },
            { assignee: "Alice", task: "Schedule QA review meeting", due: "Wednesday" },
          ],
          decisions: [
            "Launch date confirmed for next Friday",
            "Using feature flags for gradual rollout",
          ],
        },
      });
    }
  }

  if (toolName === "get_meeting_summary") {
    return JSON.stringify({
      demo_mode: true,
      summary: {
        meeting_id: args.meeting_id,
        title: "Recorded Meeting",
        duration: "30 minutes",
        key_points: [
          "Discussed project milestones",
          "Reviewed budget allocation",
          "Planned next sprint",
        ],
        action_items: [
          { assignee: "You", task: "Follow up with the team", due: "End of week" },
        ],
      },
    });
  }

  return JSON.stringify({ error: "Unknown meeting action" });
}
