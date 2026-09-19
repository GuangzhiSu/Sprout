"use client";

import { useState } from "react";
import { Clock, MessageSquare, Sparkles } from "lucide-react";
import { useChildLabel } from "@/components/child-line";
import { conversations, duration, longDate, shortDate, type Turn } from "@/lib/tracking";

const speakers: Record<Exclude<Turn["from"], "child">, { name: string; initials: string }> = {
  peer: { name: "New friend", initials: "NF" },
  coach: { name: "Sprout", initials: "S" },
};

/**
 * What the child and the scenario actually said to each other. A session list
 * on the left, the transcript on the right: the child's turns on one side, the
 * other child's on the other, and the coach's prompts between them, because
 * they are the app talking rather than a third person in the room.
 */
export function ConversationLog() {
  /* The child is named only if they gave a name in the tutorial. */
  const child = useChildLabel();
  const [openId, setOpenId] = useState(conversations[0].id);
  const open = conversations.find((entry) => entry.id === openId) ?? conversations[0];

  return (
    <div className="chat">
      <div className="chat__list" role="tablist" aria-label="Recent conversations">
        {conversations.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            id={`tab-${entry.id}`}
            aria-selected={entry.id === open.id}
            aria-controls="conversation-panel"
            className={entry.id === open.id ? "chat-item chat-item--open" : "chat-item"}
            onClick={() => setOpenId(entry.id)}
          >
            <span className="chat-item__date">{shortDate(entry.date)}</span>
            <span className="chat-item__name">{entry.courseName}</span>
            <span className="chat-item__note">{entry.note}</span>
            <span className="chat-item__meta">
              <MessageSquare aria-hidden="true" /> {entry.turns.length} turns
              <Clock aria-hidden="true" /> {duration(entry.seconds)}
            </span>
          </button>
        ))}
      </div>

      <div
        className="card chat__panel"
        id="conversation-panel"
        role="tabpanel"
        aria-labelledby={`tab-${open.id}`}
      >
        <div className="chat__head">
          <div>
            <h3 className="chart-card__title">{open.courseName}</h3>
            <p className="chart-card__about">{longDate(open.date)} · {duration(open.seconds)} · {open.turns.length} turns</p>
          </div>
        </div>

        <ol className="chat__thread">
          {open.turns.map((turn, index) => {
            const speaker = turn.from === "child" ? child : speakers[turn.from];
            if (turn.from === "coach") {
              return (
                <li className="chat-turn chat-turn--coach" key={index}>
                  <span className="chat-turn__coach">
                    <Sparkles aria-hidden="true" />
                    <span><strong>{speaker.name}</strong> {turn.text}</span>
                  </span>
                </li>
              );
            }
            return (
              <li className={`chat-turn chat-turn--${turn.from}`} key={index}>
                <span className="chat-turn__avatar" aria-hidden="true">{speaker.initials}</span>
                <span className="chat-turn__bubble">
                  <span className="chat-turn__who">{speaker.name}</span>
                  {turn.text}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
