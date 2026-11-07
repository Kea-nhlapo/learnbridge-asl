// The voice service reads up to 400 characters at a time, so Listen goes sentence group by sentence group.
export function speechPieces(paragraphs, max = 380) {
  const pieces = [];
  for (const paragraph of paragraphs) {
    let current = '';
    for (const sentence of paragraph.match(/[^.!?]+[.!?]*\s*/g) || [paragraph]) {
      if (current && (current + sentence).length > max) { pieces.push(current.trim()); current = ''; }
      current += sentence;
      while (current.length > max) { const cut = current.lastIndexOf(' ', max) > 0 ? current.lastIndexOf(' ', max) : max; pieces.push(current.slice(0, cut).trim()); current = current.slice(cut); }
    }
    if (current.trim()) pieces.push(current.trim());
  }
  return pieces;
}
