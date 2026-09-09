const $=id=>document.getElementById(id);

const samples={
  leak:`From: sarah.lee@example.com\nSubject: Water leaking under kitchen sink\n\nHi, I'm Sarah at 18 Lakeview Rd, Como. There is water leaking heavily under the kitchen sink and the cupboard is getting wet. It started this morning.`,
  power:`From: daniel.wong@example.com\nSubject: Power keeps tripping\n\nHi, Daniel here from Unit 7, 42 Oxford St, Leederville. The power keeps tripping whenever we use the kitchen outlets. There are no sparks or smoke, but we have lost power to half the apartment.`,
  lock:`From: aisha.khan@example.com\nSubject: Front door lock broken\n\nHello, I'm Aisha at 9 Park Lane, Victoria Park. The front door lock has broken and the property is not secure.`,
  gas:`From: michael.chen@example.com\nSubject: Strong gas smell near stove\n\nHi, Michael at 31 River View, East Perth. There is a strong smell of gas near the stove and it has become worse in the last 20 minutes.`
};

function parseEmail(raw){
  const from=(raw.match(/^From:\s*(.+)$/mi)||[,'tenant@example.com'])[1].trim();
  const subject=(raw.match(/^Subject:\s*(.+)$/mi)||[,'Maintenance request'])[1].trim();
  const body=raw.replace(/^From:.*$/mi,'').replace(/^Subject:.*$/mi,'').trim();
  return{from,subject,body};
}

function classify(text){
  const t=text.toLowerCase();
  if(/gas smell|smell of gas|gas leak|carbon monoxide/.test(t))return['Gas / safety','Emergency'];
  if(/spark|sparking|smoke|burning smell|exposed wire/.test(t)&&!/no spark|no sparking|no smoke/.test(t))return['Electrical','Emergency'];
  if(/lock|not secure|door.*secure|break.?in/.test(t))return['Security','High'];
  if(/leak|water|tap|sink|toilet|pipe|plumb/.test(t))return['Plumbing',/flood|burst|heavily|ceiling|cannot stop/.test(t)?'High':'Medium'];
  if(/power|electric|outlet|socket|tripping|circuit/.test(t))return['Electrical',/lost power|no power|half the apartment/.test(t)?'High':'Medium'];
  return['General','Low'];
}

function extractAddress(text){
  const afterAt=text.match(/\b(?:at|from)\s+((?:Unit\s+[\w-]+,\s*)?\d+(?:\/\d+)?\s+[A-Za-z0-9][A-Za-z0-9 .'-]+,\s*[A-Za-z][A-Za-z .'-]+?)(?=[.!?]|$)/i);
  if(afterAt)return afterAt[1].trim();
  const generic=text.match(/((?:Unit\s+[\w-]+,\s*)?\d+(?:\/\d+)?\s+[A-Za-z0-9][A-Za-z0-9 .'-]+,\s*[A-Za-z][A-Za-z .'-]+?)(?=[.!?]|$)/i);
  return generic?generic[1].trim():'Needs confirmation';
}

function extractName(text,email){
  const patterns=[/(?:i['’]?m|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,/(?:hi,?\s+)([A-Z][a-z]+)\s+(?:here|at|from)/,/(?:hello,?\s+i['’]?m\s+)([A-Z][a-z]+)/i];
  for(const p of patterns){const m=text.match(p);if(m)return m[1];}
  const local=email.split('@')[0].replace(/[._-]+/g,' ');
  return local.split(' ').map(w=>w?w[0].toUpperCase()+w.slice(1):'').join(' ')||'Tenant';
}

function reply(name,priority){
  const first=name.split(' ')[0]||'there';
  if(priority==='Emergency')return`Hi ${first}, thanks for letting us know. We've marked this as an emergency and a property manager will review it immediately.`;
  if(priority==='High')return`Hi ${first}, thanks for letting us know. We've marked this as high priority and a property manager will review it shortly.`;
  return`Hi ${first}, thanks for letting us know. Your maintenance request has been logged for review.`;
}

function showResult(){
  const raw=$('emailInput').value.trim();
  if(!raw)return toast('Paste an email first.');
  const{from,subject,body}=parseEmail(raw);
  const[category,priority]=classify(`${subject} ${body}`);
  const property=extractAddress(body);
  const tenant=extractName(body,from);

  $('propertyValue').textContent=property;
  $('issueValue').textContent=subject;
  $('tenantValue').textContent=`${tenant} · ${category}`;
  $('priorityPill').textContent=priority;
  $('priorityPill').className=`priority ${priority.toLowerCase()}`;
  $('replyValue').value=reply(tenant,priority);
  $('actions').classList.remove('hidden');
  $('doneState').className='done hidden';
  $('inputView').classList.add('hidden');
  $('resultView').classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
}

function back(){
  $('resultView').classList.add('hidden');
  $('inputView').classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
}

function review(type){
  $('actions').classList.add('hidden');
  const done=$('doneState');
  done.textContent=type==='approved'?'Approved':'Rejected';
  done.className=`done ${type}`;
}

function reset(){
  $('emailInput').value='';
  back();
}

let toastTimer;
function toast(message){
  const el=$('toast');
  el.textContent=message;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.add('hidden'),1800);
}

$('analyseBtn').addEventListener('click',showResult);
$('backBtn').addEventListener('click',back);
$('approveBtn').addEventListener('click',()=>review('approved'));
$('rejectBtn').addEventListener('click',()=>review('rejected'));
$('clearBtn').addEventListener('click',reset);
document.querySelectorAll('[data-sample]').forEach(btn=>btn.addEventListener('click',()=>{$('emailInput').value=samples[btn.dataset.sample];}));
