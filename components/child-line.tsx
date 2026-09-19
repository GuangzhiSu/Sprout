"use client";

import { useSyncExternalStore } from "react";
import { profileSnapshot, serverProfileSnapshot, subscribeProfile } from "@/lib/profile";

/**
 * Who the panel is about, using only what the child actually told the tutorial.
 * A name they declined to give is not invented here, and neither is an age.
 */
export function ChildLine({ questionnaires }: { questionnaires: number }) {
  const profile = useSyncExternalStore(subscribeProfile, profileSnapshot, serverProfileSnapshot);

  const parts = [
    profile.name || "Your child",
    profile.age !== null ? `${profile.age} years old` : null,
    `${questionnaires} questionnaires since April`,
  ].filter(Boolean);

  return <p className="pv__sub">{parts.join(" · ")}</p>;
}

/** The label on the child's side of a transcript. */
export function useChildLabel() {
  const profile = useSyncExternalStore(subscribeProfile, profileSnapshot, serverProfileSnapshot);
  const name = profile.name || "Your child";
  return { name, initials: name.slice(0, 1).toUpperCase() };
}
