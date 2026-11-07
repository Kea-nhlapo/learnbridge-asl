// Signchat's lean-options sentence reconstruction, adapted for SA Educate.
// Only admitted sign labels and scores leave the browser. Camera frames do not.
const SYSTEM = 'You reconstruct what a Deaf signer just said in casual English from a noisy classifier\'s top-K output. Match the energy and topic of the hearing user\'s last line. If the top-1 token is contextually wrong but a top-2 alternative fits, prefer the alternative and reflect that in usedSigns. Return JSON only with sentence, confidence (high|medium|low), matchedScriptId (null), and usedSigns.';
const SCHEMA = { type: 'object', properties: { sentence: { type: 'string' }, confidence: { type: 'string', enum: ['high', 'medium', 'low'] }, matchedScriptId: { type: ['string', 'null'] }, usedSigns: { type: 'array', items: { type: 'string' } } }, required: ['sentence', 'confidence', 'matchedScriptId', 'usedSigns'], additionalProperties: false };
const LABEL_OVERRIDES = { WEUS: 'we/us', HESHEIT: 'he/she/it', MINEMY: 'my/mine', HAVETO: 'have to', CALLONPHONE: 'call on phone', FRENCHFRIES: 'french fries', GLASSWINDOW: 'window', ICECREAM: 'ice cream', TV: 'TV', THANKYOU: 'thank you', SHHH: 'shush', OWIE: 'owie', YUCKY: 'yucky' };
const dictionaryLabel = label => LABEL_OVERRIDES[label] || label.toLowerCase();

export function signReconstructionMiddleware(apiKey, model = 'gemini-3.5-flash-lite') {
  return async (req, res, next) => {
    if (req.url?.split('?')[0] !== '/api/sign-reconstruct') return next();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ error: 'POST required' })); return; }
    let raw = '';
    try {
      for await (const part of req) {
        raw += part.toString();
        if (raw.length > 12000) throw new Error('Request too large');
      }
      const body = JSON.parse(raw);
      const tokens = body?.tokens;
      const spelledName = body?.spelledName || '';
      if (!Array.isArray(tokens) || tokens.length < 1 || tokens.length > 60 ||
          tokens.some(t => typeof t?.label !== 'string' || !/^[\w -]{1,50}$/.test(t.label) ||
            typeof t.score !== 'number' || !Number.isFinite(t.score) || t.score < 0 || t.score > 1) ||
          typeof spelledName !== 'string' || (spelledName && !/^[A-Za-z ]{1,30}$/.test(spelledName))) {
        res.statusCode = 400; res.end(JSON.stringify({ error: 'Expected 1–60 recognised signs with confidence scores.' })); return;
      }
      const labels = tokens.map(token => token.label.toUpperCase());
      if (spelledName && labels.includes('HELLO') && labels.includes('MINEMY')) {
        // This known introduction does not need an LLM to guess its grammar or name.
        res.end(JSON.stringify({ sentence: `Hello, my name is ${spelledName.trim()}.`, confidence: 'high', matchedScriptId: null, usedSigns: ['HELLO', 'MINEMY', spelledName.trim().toUpperCase()], needsClarification: false })); return;
      }
      if (!apiKey) {
        res.statusCode = 503; res.end(JSON.stringify({ error: 'Set GEMINI_API_KEY on the app server to enable sentence reconstruction.' })); return;
      }
      const topK = tokens.map(t => ({ word: t.label, score: t.score, alternatives: [] }));
      const prompt = `Recent conversation:\n(none)\nTop-K classifier output for the current sign turn:\n${JSON.stringify(topK, null, 2)}\nWord translations: ${[...new Set(tokens.map(t => t.label))].sort().map(label => `${label}=${dictionaryLabel(label)}`).join('\n')}\nFingerspelled name: ${spelledName || '(none)'}. If present, preserve its spelling exactly.\n\nReturn JSON only.`;
      const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 300,
            thinkingConfig: { thinkingLevel: 'MINIMAL' },
            responseFormat: { text: { mimeType: 'APPLICATION_JSON', schema: SCHEMA } },
          },
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!upstream.ok) {
        res.statusCode = 502; res.end(JSON.stringify({ error: `Gemini returned ${upstream.status}. Check the model and API key.` })); return;
      }
      const result = await upstream.json();
      const content = result?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('');
      const parsed = JSON.parse(content);
      if (!parsed || typeof parsed.sentence !== 'string' || !parsed.sentence.trim() ||
          !['high', 'medium', 'low'].includes(parsed.confidence) || !Array.isArray(parsed.usedSigns) ||
          parsed.usedSigns.some(s => typeof s !== 'string')) throw new Error('Sentence service returned invalid output');
      res.end(JSON.stringify({ sentence: parsed.sentence.trim(), confidence: parsed.confidence, matchedScriptId: null, usedSigns: parsed.usedSigns, needsClarification: parsed.confidence === 'low' }));
    } catch (error) {
      res.statusCode = error.message === 'Request too large' ? 413 : 502;
      res.end(JSON.stringify({ error: error.message === 'Request too large' ? error.message : 'Sentence reconstruction failed. Please try again.' }));
    }
  };
}
