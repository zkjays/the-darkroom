export interface SlashCommand {
  command: string;
  description: string;
  response: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: "/help",
    description: "List all available commands",
    response: `Available commands:\n\n/help — show this list\n/tutorial — how to use The Darkroom\n/what-is-this — what is The Darkroom?\n/score — how the scoring formula works\n/archetype — all 9 archetypes explained\n/feedback — send feedback to the team\n\nOr just ask me anything about The Darkroom.`,
  },
  {
    command: "/tutorial",
    description: "Step-by-step onboarding",
    response: `Here's how to make the most of The Darkroom:\n\n1. Check your score — your Room Score reflects 3 dimensions: Social Proof, Builder Proof, and Work Proof. Each ring shows where you stand.\n\n2. Submit a proof — go to the Work tab and add a link to something you've built, shipped, or published. This directly raises your Work Proof score.\n\n3. Go public — enable your public profile in Settings. Private profiles can't receive endorsements.\n\n4. Share your ID — your Darkroom ID is a proof-of-work resume. Drop it in your bio.\n\nUse the Guide tab above to track your progress.`,
  },
  {
    command: "/what-is-this",
    description: "Explain The Darkroom",
    response: `The Darkroom is a builder OS — a place to track, prove, and grow your builder signal.\n\nIt analyzes your real activity (X presence + shipped work) to give you a Room Score and a builder archetype. Unlike LinkedIn, nothing here is self-reported. Your score is earned, not claimed.\n\nBuilt for builders who ship. Not for people who talk about shipping.`,
  },
  {
    command: "/score",
    description: "Explain the scoring formula",
    response: `Your Room Score = (Social Proof × 35%) + (Builder Proof × 35%) + (Work Proof × 30%)\n\nSocial Proof — your X presence: engagement quality, consistency, community signal.\n\nBuilder Proof — evidence you actually build: technical content, projects shipped, public learning.\n\nWork Proof — fully in your hands: submit links to real work. 3 community endorsements = 1 validated proof.\n\nBase score: 0–100. Up to +25 bonus from certifications (coming soon).`,
  },
  {
    command: "/archetype",
    description: "List all 9 archetypes",
    response: `The 9 Darkroom archetypes:\n\nHigh tier (score ≥50)\n◈ Ghost Builder — ships in the dark, drops in the light\n◈ Silent Architect — the blueprint speaks for itself\n◈ Shadow Operator — you won't see me, but you'll see my work\n\nMid tier (score 32–49)\n◈ Half Built — foundation solid, still stacking floors\n◈ Curious Lurker — reads everything, ships soon\n◈ Almost Based — one commit away from greatness\n\nEarly tier (score 0–31)\n◈ Main Character Loading — the arc hasn't even started\n◈ Fresh Compile — first build, first bugs, first glory\n◈ NPC (for now) — everyone's origin story starts somewhere`,
  },
  {
    command: "/feedback",
    description: "Send feedback to the team",
    response: `Thanks for wanting to share feedback. Type your message and I'll make sure it reaches the team.\n\nWhat's on your mind?`,
  },
];

export function matchSlashCommand(message: string): SlashCommand | null {
  const trimmed = message.trim().toLowerCase();
  return SLASH_COMMANDS.find(
    (cmd) => trimmed === cmd.command || trimmed.startsWith(cmd.command + " ")
  ) ?? null;
}
