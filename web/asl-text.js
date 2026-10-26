// Keep sentence boundaries where possible and never silently discard lesson text.
export function splitASLText(text, maxCharacters = 80, maxWords = 12) {
  const sentences = String(text).trim().match(/[^.!?\n]+[.!?]*|[.!?]+/g) || [];
  const parts = [];
  for (const sentence of sentences) {
    let words = [];
    for (const word of sentence.trim().split(/\s+/).filter(Boolean)) {
      if (words.length && (words.length >= maxWords || [...words, word].join(' ').length > maxCharacters)) {
        parts.push(words.join(' ')); words = [];
      }
      words.push(word);
    }
    if (words.length) parts.push(words.join(' '));
  }
  return parts;
}
