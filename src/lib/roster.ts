export type ParsedStudent = { number: number; name: string; group_no: number | null; leader: boolean };

/**
 * 명단 붙여넣기. 한 줄에 한 명, 이름 뒤에 모둠·대표를 여러 방식으로 쓸 수 있다.
 * "1 김민준 2 대표" / "1 김민준 2모둠 대표" / "2 이서연 1모둠원" / "3 박지호 1모둠대표" / "김민준"(번호 자동)
 * 엑셀에서 복사한 탭 구분도 된다. 대표는 모둠이 있어야 하고, 한 모둠에 1명만(먼저 나온 사람).
 */
export function parseRoster(text: string): ParsedStudent[] {
  const out: ParsedStudent[] = [];
  const leaderGroups = new Set<number>();
  let auto = 1;
  for (const raw of text.split(/\r?\n/)) {
    const parts = raw.trim().split(/[\s,]+/).filter(Boolean);
    if (parts.length === 0) continue;
    let number = auto;
    if (/^\d+번?$/.test(parts[0])) number = parseInt(parts.shift()!, 10);

    let leader = false;
    let group_no: number | null = null;
    const nameParts: string[] = [];
    for (const [i, p] of parts.entries()) {
      const m = /^([1-6])(모둠)?(원|대표)?$/.exec(p);
      if (i > 0 && m) {
        group_no = Number(m[1]);
        if (m[3] === "대표") leader = true;
      } else if (i > 0 && /^(모둠)?대표$|^\*$/.test(p)) {
        leader = true;
      } else if (i > 0 && p === "모둠원") {
        // 그냥 모둠원
      } else {
        nameParts.push(p);
      }
    }

    leader = leader && group_no !== null && !leaderGroups.has(group_no);
    if (leader) leaderGroups.add(group_no!);
    const name = nameParts.join(" ").slice(0, 20);
    if (!name) continue;
    out.push({ number, name, group_no, leader });
    auto = number + 1;
  }
  return out;
}
