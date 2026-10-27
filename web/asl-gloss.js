// Rule-based English -> ASL gloss, applied before signing.
// Sign Translate signs whatever words it receives, in the order given; plain English gives "signed English".
// These well-established ASL rules rewrite each sentence first:
//  - time expressions go first (time-topic-comment): "We go to school tomorrow" -> TOMORROW WE GO SCHOOL
//  - articles (a, an, the), present-tense "be" and auxiliary "do" are dropped
//  - past "was/were/did" become a PAST time marker when no other time is given
//  - negative contractions become NOT: "don't like" -> NOT LIKE
//  - WH-questions put the WH-sign last: "What is your name?" -> YOUR NAME WHAT
//  - I -> ME; "go to"/"want to" lose "to"
// Not covered: classifiers, use of signing space, role shift and facial grammar.
import {splitASLText} from './asl-text.js';

const ARTICLES=new Set(['a','an','the']);
const PRESENT_BE=new Set(['am','is','are']);
const PAST_BE=new Set(['was','were']);
const DO_AUX=new Set(['do','does','did']);
const WH_WORDS=new Set(['what','which','who','whom','whose','where','when','why','how']);
const AUX=new Set([...PRESENT_BE,...PAST_BE,...DO_AUX]);
const CONTRACTIONS={"i'm":'i am',"you're":'you are',"we're":'we are',"they're":'they are',"he's":'he is',"she's":'she is',"it's":'it is',"that's":'that is',"there's":'there is',"what's":'what is',"where's":'where is',"who's":'who is',"how's":'how is',"here's":'here is',"isn't":'is not',"aren't":'are not',"wasn't":'was not',"weren't":'were not',"don't":'do not',"doesn't":'does not',"didn't":'did not',"won't":'will not',"wouldn't":'would not',"shouldn't":'should not',"couldn't":'could not',"haven't":'have not',"hasn't":'has not',"hadn't":'had not',"can't":"can't",cannot:"can't","i'll":'i will',"you'll":'you will',"we'll":'we will',"they'll":'they will',"he'll":'he will',"she'll":'she will',"it'll":'it will',"i've":'i have',"you've":'you have',"we've":'we have',"they've":'they have',"i'd":'i would',"you'd":'you would',"we'd":'we would',"they'd":'they would',"let's":'let us'};
const TIME_WORDS=new Set(['today','tomorrow','yesterday','tonight','now','later','soon','recently','nowadays','earlier']);
const TIME_UNITS=new Set(['morning','afternoon','evening','night','day','days','week','weeks','weekend','month','months','year','years','term','semester','hour','hours','monday','tuesday','wednesday','thursday','friday','saturday','sunday']);
const TIME_LEADS=new Set(['last','next','this','every']);
const NUMBERS=new Set(['one','two','three','four','five','six','seven','eight','nine','ten','a','an','few','several','many',...Array.from({length:100},(_,i)=>String(i+1))]);
const DROP_TO_AFTER=new Set(['go','goes','going','went','come','comes','came','walk','walked','run','ran','drive','drove','travel','travelled','traveled','move','moved','fly','flew','want','wants','wanted','need','needs','needed','like','likes','liked','try','tries','tried','have','has','had','love','loves','loved','learn','learned','begin','began','start','started','forget','forgot','remember','remembered']);
const PRONOUN_GLOSS={i:'me'};

export function splitSentences(text){
  return String(text).replace(/\[Page \d+\]/g,' ').split(/(?<=[.!?])\s+|\n+/).map(s=>s.trim()).filter(s=>/[\p{L}\p{N}]/u.test(s));
}
function tokens(sentence){
  const words=[];
  for(const token of sentence.replace(/[’‘]/g,"'").match(/[\p{L}\p{N}]+(?:'[\p{L}]+)?|[.!?]/gu)||[]){
    const lower=token.toLowerCase();words.push(...(CONTRACTIONS[lower]||lower).split(' '));
  }
  return words;
}
// Time expressions as [start, end, gloss words].
function timeSpans(words){
  const spans=[];
  for(let i=0;i<words.length;){
    const [w,next='',third='']=[words[i],words[i+1],words[i+2]];
    if(TIME_WORDS.has(w)){spans.push([i,i+1,[w]]);i+=1}
    else if(TIME_LEADS.has(w)&&TIME_UNITS.has(next)){spans.push([i,i+2,[w,next]]);i+=2}
    else if(NUMBERS.has(w)&&TIME_UNITS.has(next)&&third==='ago'){spans.push([i,i+3,[w==='a'||w==='an'?'one':w,next,'ago']]);i+=3}
    else if(w==='in'&&next==='the'&&['morning','afternoon','evening'].includes(third)){spans.push([i,i+3,[third]]);i+=3}
    else if(w==='at'&&next==='night'){spans.push([i,i+2,['night']]);i+=2}
    else i+=1;
  }
  return spans;
}
// One English sentence -> ASL gloss words (lowercase).
export function sentenceToGloss(sentence){
  let words=tokens(sentence);
  const question=words.at(-1)==='?';
  words=words.filter(w=>!['.','!','?'].includes(w));
  if(!words.length)return [];
  const spans=timeSpans(words);
  let time=spans.flatMap(([,,g])=>g);
  const consumed=new Set(spans.flatMap(([s,e])=>Array.from({length:e-s},(_,k)=>s+k)));
  let rest=words.filter((_,i)=>!consumed.has(i));
  const markPast=w=>{if((PAST_BE.has(w)||w==='did')&&!time.length)time=['past']};
  let wh=[];
  if(question&&WH_WORDS.has(rest[0])){
    // "How many legs does a spider have?" -> SPIDER HAVE LEGS HOW MANY
    const auxAt=rest.slice(0,4).findIndex(w=>AUX.has(w));
    if(auxAt>=0&&auxAt+1<rest.length){
      markPast(rest[auxAt]);
      const head=rest.slice(0,auxAt),isWH=w=>WH_WORDS.has(w)||w==='many'||w==='much';
      wh=head.filter(isWH);rest=[...rest.slice(auxAt+1),...head.filter(w=>!isWH(w))];
    }else{wh=rest.slice(0,1);rest=rest.slice(1)}
  }else if(question&&AUX.has(rest[0])){
    // Yes/no question: "Do you like it?" -> YOU LIKE IT (raised eyebrows are not shown).
    markPast(rest[0]);rest=rest.slice(1);
  }
  const gloss=[];
  rest.forEach((w,i)=>{
    const following=rest[i+1]||'';
    if(ARTICLES.has(w)||PRESENT_BE.has(w))return;
    if(PAST_BE.has(w)||(w==='did'&&(following==='not'||!following))){markPast(w);return}
    if(DO_AUX.has(w)&&following==='not')return;
    if(w==='to'&&DROP_TO_AFTER.has(gloss.at(-1)))return;
    gloss.push(PRONOUN_GLOSS[w]||w);
  });
  return [...time,...gloss,...wh];
}
export const formatGloss=words=>words.map(w=>w.toUpperCase()).join(' ');
// Lesson text -> [{english, gloss}] short signing sections, one or more per sentence.
export function textToGlossSections(text){
  return splitSentences(text).flatMap(english=>splitASLText(formatGloss(sentenceToGloss(english))).map((gloss,i)=>({english:i?'':english,gloss})));
}
// Hand-corrected gloss (one signing section per line) -> sections, still kept short for the signing service.
export function parseGlossLines(text){
  return String(text).split('\n').map(line=>line.trim().replace(/\s+/g,' ').toUpperCase()).filter(line=>/[\p{L}\p{N}]/u.test(line)).flatMap(line=>splitASLText(line).map(gloss=>({english:'',gloss})));
}
