// CAPS tags for lessons: phase, CAPS subject, grade, term and topic. There is no open CAPS dataset, so the
// sample lessons' tags were checked by hand against DBE CAPS documents and annual teaching plans; a term is
// left out (null) where it could not be confirmed. Generated lessons get tags suggested by AI.

export const phaseOf = grade => grade >= 10 ? 'FET Phase' : grade >= 7 ? 'Senior Phase' : grade >= 4 ? 'Intermediate Phase' : 'Foundation Phase';

export const SAMPLE_CAPS = {
  'maths-fractions': { subject: 'Mathematics', grade: 7, term: null, strand: 'Numbers, Operations and Relationships', topic: 'Common fractions' },
  'maths-linear-equations': { subject: 'Mathematics', grade: 9, term: null, strand: 'Patterns, Functions and Algebra', topic: 'Algebraic equations' },
  'phys-states-of-matter': { subject: 'Physical Sciences', grade: 10, term: 1, strand: 'Matter and Materials', topic: 'States of matter and the kinetic molecular theory' },
  'phys-electric-circuits': { subject: 'Natural Sciences', grade: 9, term: 3, strand: 'Energy and Change', topic: 'Electric circuits' },
  'bus-environments': { subject: 'Business Studies', grade: 10, term: 1, strand: 'Business Environments', topic: 'Micro, market and macro environments' },
  'bus-entrepreneurship': { subject: 'Business Studies', grade: 10, term: null, strand: 'Business Ventures', topic: 'Entrepreneurial qualities' },
  'geo-water-cycle': { subject: 'Social Sciences (Geography)', grade: 7, term: null, strand: 'Geography', topic: 'The water cycle', note: 'Supporting topic: not a named CAPS topic for Grade 7.' },
  'geo-weather-climate': { subject: 'Social Sciences (Geography)', grade: 8, term: 2, strand: 'Geography', topic: 'Climate regions' },
  'life-human-eye': { subject: 'Life Sciences', grade: 12, term: 2, strand: 'Life Processes in Plants and Animals', topic: 'Human responses to the environment: the eye' },
  'life-photosynthesis': { subject: 'Life Sciences', grade: 11, term: 2, strand: 'Life Processes in Plants and Animals', topic: 'Energy transformations: photosynthesis' },
  'art-elements': { subject: 'Visual Arts', grade: 10, term: null, strand: 'Visual Culture Studies', topic: 'Visual literacy: the elements of art' },
  'art-colour-theory': { subject: 'Visual Arts', grade: 10, term: null, strand: 'Visual Culture Studies', topic: 'Visual literacy: colour theory' },
};

// "CAPS · FET Phase · Life Sciences · Grade 11 · Term 2 · Energy transformations: photosynthesis"
export function capsLabel(caps) {
  if (!caps?.subject) return '';
  const grade = Number(caps.grade);
  return ['CAPS', grade ? phaseOf(grade) : '', caps.subject, grade ? `Grade ${grade}` : '', caps.term ? `Term ${caps.term}` : 'check term', caps.topic]
    .filter(Boolean).join(' · ');
}

// Words that find a lesson by its CAPS tags.
export const capsWords = caps => caps ? [caps.subject, caps.strand, caps.topic, caps.grade && `grade ${caps.grade}`, caps.term && `term ${caps.term}`, caps.grade && phaseOf(caps.grade)].filter(Boolean).join(' ').toLowerCase() : '';
