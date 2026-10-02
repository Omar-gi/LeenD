export type Decision = "CLARIFY" | "FULL" | "PARTIAL" | "REFER";
export type Safety = "none" | "threat" | "immediate" | "uncertain";
export type SourceCard = {
  id: string; title: string; sourceQuote: string; sourceReference: string;
  sourceUrl: string; isExcerpt: boolean; permittedExplanation: string;
  boundaries: string[]; reviewStatus: "draft" | "approved";
};
export type ConversationTurn = { user: string; assistant: string; receipt?: string };
export type Segment = { kind: "explanation" | "quote"; text: string; sourceIds: string[]; quoteId: string | null };
export type Candidate = { decision: Decision; safety: Safety; segments: Segment[] };
export type Answer = {
  decision: Decision; safety: Safety; answer: string; segments: Segment[];
  sources: SourceCard[]; grounded: boolean; limited: boolean;
};
export type TurnResponse = Answer & {
  transcript: string; receipt: string; audio: string | null;
  audioStatus: "ready" | "unavailable" | "disabled";
  elapsedMs: number; reviewStatus: "draft" | "approved";
};
