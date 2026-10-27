import React,{useRef,useState}from'react';
import{evaluateExpression}from'./calculator.js';
import'./question-overlap.css';

const keys=[
  {label:'π',value:'π',tone:'function'},
  {label:'x²',value:'^2',tone:'function'},
  {label:'√',value:'√(',tone:'function'},
  {label:'←',action:'left',tone:'function'},
  {label:'→',action:'right',tone:'function'},
  {label:'7',value:'7'},{label:'8',value:'8'},{label:'9',value:'9'},{label:'(',value:'(',tone:'operator'},{label:')',value:')',tone:'operator'},
  {label:'4',value:'4'},{label:'5',value:'5'},{label:'6',value:'6'},{label:'×',value:'×',tone:'operator'},{label:'÷',value:'÷',tone:'operator'},
  {label:'1',value:'1'},{label:'2',value:'2'},{label:'3',value:'3'},{label:'+',value:'+',tone:'operator'},{label:'-',value:'-',tone:'operator'},
  {label:'0',value:'0'},{label:'.',value:'.'},{label:'⌫',action:'backspace'},{label:'%',value:'%',tone:'operator'},{label:'=',action:'equals',tone:'equals'},
];

export default function LessonCalculator({onClose}){
  const[expression,setExpression]=useState('');
  const[result,setResult]=useState('');
  const[error,setError]=useState('');
  const inputRef=useRef(null);
  const focus=position=>requestAnimationFrame(()=>{let input=inputRef.current;if(!input)return;input.focus();input.setSelectionRange(position,position)});
  const insert=value=>{let input=inputRef.current,start=input?.selectionStart??expression.length,end=input?.selectionEnd??start;setExpression(expression.slice(0,start)+value+expression.slice(end));setResult('');setError('');focus(start+value.length)};
  const move=direction=>{let position=inputRef.current?.selectionStart??expression.length;focus(Math.max(0,Math.min(expression.length,position+direction)))};
  const backspace=()=>{let input=inputRef.current,start=input?.selectionStart??expression.length,end=input?.selectionEnd??start;if(!start&&!end)return;let removeFrom=start===end?start-1:start;setExpression(expression.slice(0,removeFrom)+expression.slice(end));setResult('');setError('');focus(removeFrom)};
  const calculate=()=>{try{setResult(evaluateExpression(expression));setError('')}catch{setResult('');setError('Check the expression')}};
  const press=key=>{if(key.action==='left')move(-1);else if(key.action==='right')move(1);else if(key.action==='backspace')backspace();else if(key.action==='equals')calculate();else insert(key.value)};
  const clear=()=>{setExpression('');setResult('');setError('');focus(0)};
  return <aside className="lesson-calculator" role="dialog" aria-modal="false" aria-labelledby="lesson-calculator-title">
    <h2 id="lesson-calculator-title" className="dj-sr-only">Calculator</h2>
    <div className="lesson-calculator-display"><input ref={inputRef} value={expression} aria-label="Calculator expression" inputMode="decimal" autoFocus onChange={event=>{setExpression(event.target.value);setResult('');setError('')}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();calculate()}else if(event.key==='Escape')onClose()}}/><output aria-live="polite">{error||result}</output></div>
    <div className="lesson-calculator-keys">{keys.map((key,index)=><button type="button" key={key.label+index} className={key.tone?'is-'+key.tone:''} aria-label={key.label==='⌫'?'Backspace':key.label==='x²'?'Square':key.label==='√'?'Square root':key.label} onClick={()=>press(key)}>{key.label}</button>)}</div>
    <div className="lesson-calculator-footer"><button type="button" aria-label="Close calculator" onClick={onClose}>⌄</button><button type="button" className="clear" aria-label="Clear calculator" onClick={clear}>⌫</button></div>
  </aside>
}
