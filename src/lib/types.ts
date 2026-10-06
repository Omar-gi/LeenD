export type Decision = "CLARIFY" | "FULL" | "PARTIAL" | "REFER";
export type Safety = "none" | "threat" | "immediate" | "uncertain";
export type SourceCard = {
  id: string; title: string; sourceQuote: string; quoteIntroduction: string; sourceReference: string;
  sourceUrl: string; referenceLinks?: string[]; isExcerpt: boolean; permittedExplanation: string;
  childExplanation: string; simpleExplanation: string;
  boundaries: string[]; reviewStatus: "draft" | "approved";
  kind: "hadith" | "quran";
  keywords: string[];
  workbook: { version: string; sheet: string; row: number; quoteCell: string; meaningCell: string; referenceCell: string; linkVerification: string };
};
export type ConversationTurn = { user: string; assistant: string; receipt?: string };
export type Segment = { kind: "explanation" | "quote"; text: string; sourceIds: string[]; quoteId: string | null };
export type CandidateSegment = Segment | { kind: "meaning"; text: string; sourceIds: string[]; quoteId: null };
export type Candidate = { decision: Decision; safety: Safety; segments: CandidateSegment[] };
export type Answer = {
  decision: Decision; safety: Safety; answer: string; segments: Segment[];
  sources: SourceCard[]; grounded: boolean; limited: boolean;
};
export type TurnResponse = Answer & {
  transcript: string; receipt: string; audio: string | null;
  audioStatus: "ready" | "unavailable" | "disabled";
  elapsedMs: number; reviewStatus: "draft" | "approved";
};
