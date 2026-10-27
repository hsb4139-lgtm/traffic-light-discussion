import type { CardRow, Color, GroupVoteRow } from "./types";

export type CardSpread = {
  card: CardRow;
  counts: Record<Color, number>;
  voted: number;
  /** 가장 많은 색 개수 ÷ 전체 모둠 수. 낮을수록 갈린 카드 */
  score: number;
  kinds: number;
};

export function cardSpreads(cards: CardRow[], votes: GroupVoteRow[], groupCount: number): CardSpread[] {
  return cards.map((card) => {
    const counts: Record<Color, number> = { green: 0, yellow: 0, red: 0 };
    for (const v of votes) if (v.card_id === card.id) counts[v.color]++;
    const voted = counts.green + counts.yellow + counts.red;
    const max = Math.max(counts.green, counts.yellow, counts.red);
    const kinds = (Object.values(counts) as number[]).filter((n) => n > 0).length;
    return { card, counts, voted, score: max / Math.max(groupCount, voted, 1), kinds };
  });
}

/** 가장 갈린 카드 id (모둠이 2곳 이상 투표한 카드 중). 없으면 null */
export function mostDividedId(spreads: CardSpread[]): string | null {
  const ranked = spreads
    .filter((s) => s.voted >= 2 && s.kinds >= 2)
    .sort((a, b) => a.score - b.score || b.kinds - a.kinds || a.card.position - b.card.position);
  return ranked[0]?.card.id ?? null;
}
