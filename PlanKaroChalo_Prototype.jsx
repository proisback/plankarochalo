import { useState, useEffect, useMemo } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Outfit:wght@400;500;600;700;800&display=swap');`;

const C = {
  bg: "#FAFAF8", card: "#FFFFFF", primary: "#E86A33", primaryLight: "#FFF0E8",
  primaryDark: "#C65520", accent: "#2D6A4F", accentLight: "#E8F5EE",
  text: "#1A1A1A", textSec: "#6B6B6B", textMut: "#9B9B9B",
  border: "#EBEBEB", success: "#2D6A4F", successLight: "#E8F5EE",
  warning: "#D4940A", warningLight: "#FFF8E1", danger: "#C62828",
  dangerLight: "#FFEBEE", pending: "#7B61FF", pendingLight: "#F0ECFF",
  shadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
};

const MS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DH = ["Su","Mo","Tu","We","Th","Fr","Sa"];
function toK(d){return`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
function same(a,b){return a&&b&&toK(a)===toK(b)}
function inR(d,s,e){if(!s||!e)return false;const t=d.getTime();return t>=s.getTime()&&t<=e.getTime()}
function fS(d){return d?`${MS[d.getMonth()]} ${d.getDate()}`:""}
function fR(s,e){return s&&e?`${fS(s)} – ${fS(e)}`:""}
function dB(s,e){return s&&e?Math.round((e-s)/864e5)+1:0}
function aD(d,n){const r=new Date(d);r.setDate(r.getDate()+n);return r}

const DEST_INIT = [
  {id:"dest1",name:"Coorg",note:"Coffee plantations, waterfalls, 5hr drive",emoji:"🌿"},
  {id:"dest2",name:"Goa",note:"Beaches, nightlife, quick flights",emoji:"🏖️"},
  {id:"dest3",name:"Pondicherry",note:"French Quarter, cafés, calm vibes",emoji:"☕"},
];
const SIM_VOTES = {2:"dest1",3:"dest2",5:"dest1"};
const STAGES = ["dates","destination","commitment","ready"];
const SL = {dates:"Pick Dates",destination:"Choose Place",commitment:"Confirm",ready:"Ready!"};

function simRanges(){
  const b=new Date();b.setHours(0,0,0,0);
  return{2:{start:aD(b,14),end:aD(b,20)},3:{start:aD(b,17),end:aD(b,23)},5:{start:aD(b,12),end:aD(b,22)}};
}

/* ===== Shared UI ===== */
function Badge({status}){
  const m={confirmed_in:{l:"Confirmed",bg:C.successLight,c:C.success,i:"✓"},
    responded:{l:"Dates set",bg:C.accentLight,c:C.accent,i:"●"},
    no_response:{l:"Waiting",bg:C.warningLight,c:C.warning,i:"⏳"},
    confirmed_out:{l:"Out",bg:C.dangerLight,c:C.danger,i:"✕"}};
  const s=m[status]||m.no_response;
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",
    borderRadius:20,fontSize:12,fontWeight:600,background:s.bg,color:s.c}}>
    <span style={{fontSize:10}}>{s.i}</span> {s.l}</span>;
}

function Progress({stage}){
  const idx=STAGES.indexOf(stage);
  return <div>
    <div style={{display:"flex",alignItems:"center",width:"100%"}}>
      {STAGES.map((s,i)=><div key={s} style={{display:"flex",alignItems:"center",flex:1}}>
        <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",
          justifyContent:"center",fontSize:12,fontWeight:700,fontFamily:"'DM Sans',sans-serif",
          background:i<=idx?C.primary:C.border,color:i<=idx?"#fff":C.textMut,
          transition:"all 0.4s",boxShadow:i===idx?`0 0 0 3px ${C.primaryLight}`:"none"}}>
          {i<idx?"✓":i+1}</div>
        {i<STAGES.length-1&&<div style={{flex:1,height:3,borderRadius:2,margin:"0 4px",
          background:i<idx?C.primary:C.border,transition:"all 0.4s"}}/>}
      </div>)}
    </div>
    <div style={{display:"flex",justifyContent:"space-between",padding:"0 6px",marginTop:6}}>
      {STAGES.map(s=><span key={s} style={{fontSize:10,fontWeight:s===stage?700:400,
        color:s===stage?C.primary:C.textMut,fontFamily:"'DM Sans',sans-serif",
        textAlign:"center",flex:1}}>{SL[s]}</span>)}
    </div>
  </div>;
}

function WaitingBanner({members}){
  const w=members.filter(m=>m.status==="no_response"&&!m.isOrg);
  if(!w.length)return null;
  return <div style={{background:C.warningLight,border:"1px solid #F0E0A0",borderRadius:12,
    padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
    <span style={{fontSize:20}}>⏳</span>
    <div><div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:"'DM Sans',sans-serif"}}>
      Waiting on {w.length} {w.length===1?"person":"people"}</div>
      <div style={{fontSize:12,color:C.textSec,marginTop:1,fontFamily:"'DM Sans',sans-serif"}}>
        {w.map(m=>m.name).join(", ")}</div></div>
  </div>;
}

/* ===== #6: Collapsible Member List ===== */
function MemberList({members}){
  const [open,setOpen]=useState(false);
  const responded=members.filter(m=>m.status!=="no_response").length;
  const waiting=members.filter(m=>m.status==="no_response"&&!m.isOrg).length;
  return <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden",boxShadow:C.shadow}}>
    <button onClick={()=>setOpen(!open)} style={{width:"100%",padding:"12px 16px",
      display:"flex",alignItems:"center",justifyContent:"space-between",
      border:"none",background:"transparent",cursor:"pointer"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:14,fontWeight:700,color:C.textSec,fontFamily:"'DM Sans',sans-serif",
          textTransform:"uppercase",letterSpacing:"0.06em",fontSize:12}}>Group · {members.length}</span>
        <span style={{fontSize:12,color:C.accent,fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>
          {responded} responded</span>
        {waiting>0&&<span style={{fontSize:12,color:C.warning,fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>
          · {waiting} waiting</span>}
      </div>
      <span style={{fontSize:16,color:C.textMut,transition:"transform 0.2s",
        transform:open?"rotate(180deg)":"rotate(0)"}}>{open?"▾":"▸"}</span>
    </button>
    {open&&members.map((m,i)=><div key={m.id} style={{display:"flex",alignItems:"center",
      justifyContent:"space-between",padding:"10px 16px",
      borderTop:`1px solid ${C.border}`}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:32,height:32,borderRadius:"50%",
          background:m.isOrg?C.primaryLight:C.accentLight,display:"flex",alignItems:"center",
          justifyContent:"center",fontSize:13,fontWeight:700,
          color:m.isOrg?C.primary:C.accent,fontFamily:"'DM Sans',sans-serif"}}>{m.name[0]}</div>
        <div><div style={{fontSize:14,fontWeight:500,color:C.text,fontFamily:"'DM Sans',sans-serif"}}>{m.name}</div>
          {m.isOrg&&<div style={{fontSize:11,color:C.primary,fontWeight:600}}>Organizer</div>}
          {m.range&&<div style={{fontSize:11,color:C.textMut,fontFamily:"'DM Sans',sans-serif"}}>
            {fR(m.range.start,m.range.end)}</div>}
          {m.constraint&&<div style={{fontSize:11,color:C.warning,fontFamily:"'DM Sans',sans-serif"}}>
            ⚠ {m.constraint}</div>}
        </div>
      </div>
      <Badge status={m.status}/>
    </div>)}
  </div>;
}

/* ===== #3: Lock Confirmation Modal ===== */
function ConfirmModal({title,desc,confirmLabel,onConfirm,onCancel}){
  return <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",
    justifyContent:"center",padding:24,background:"rgba(0,0,0,0.4)",backdropFilter:"blur(4px)"}}>
    <div style={{background:C.card,borderRadius:16,padding:24,maxWidth:340,width:"100%",
      boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}}>
      <div style={{fontSize:16,fontWeight:700,color:C.text,fontFamily:"'DM Sans',sans-serif",marginBottom:8}}>
        {title}</div>
      <div style={{fontSize:13,color:C.textSec,fontFamily:"'DM Sans',sans-serif",lineHeight:1.5,marginBottom:20}}>
        {desc}</div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={onConfirm} style={{flex:1,padding:"12px 0",borderRadius:10,
          background:C.primary,color:"#fff",border:"none",fontSize:14,fontWeight:700,
          cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>{confirmLabel}</button>
        <button onClick={onCancel} style={{flex:1,padding:"12px 0",borderRadius:10,
          background:C.bg,color:C.textSec,border:`1px solid ${C.border}`,fontSize:14,
          fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Wait, not yet</button>
      </div>
    </div>
  </div>;
}

/* ===== Calendar ===== */
function Calendar({selStart,selEnd,onSelect,heatmap,constraints}){
  const today=new Date();today.setHours(0,0,0,0);
  const[vm,setVm]=useState(()=>new Date(today.getFullYear(),today.getMonth(),1));
  const[hover,setHover]=useState(null);
  const y=vm.getFullYear(),mo=vm.getMonth();
  const fd=new Date(y,mo,1).getDay(),dim=new Date(y,mo+1,0).getDate();
  const cells=[];
  for(let i=0;i<fd;i++)cells.push(null);
  for(let d=1;d<=dim;d++)cells.push(new Date(y,mo,d));
  const isSel=selStart&&!selEnd;

  // Check if date has a constraint
  const hasConstraint=(date)=>{
    if(!constraints||!constraints.length)return false;
    return constraints.some(c=>c.start&&c.end&&inR(date,c.start,c.end));
  };

  return <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:"14px 12px",boxShadow:C.shadow}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
      <button onClick={()=>setVm(new Date(y,mo-1,1))} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:C.textSec,padding:"4px 8px"}}>‹</button>
      <div style={{fontSize:15,fontWeight:700,color:C.text,fontFamily:"'DM Sans',sans-serif"}}>{MS[mo]} {y}</div>
      <button onClick={()=>setVm(new Date(y,mo+1,1))} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:C.textSec,padding:"4px 8px"}}>›</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
      {DH.map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:600,color:C.textMut,padding:"4px 0",fontFamily:"'DM Sans',sans-serif"}}>{d}</div>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
      {cells.map((date,i)=>{
        if(!date)return <div key={`e${i}`}/>;
        const past=date<today,isT=same(date,today),isS=same(date,selStart),isE=same(date,selEnd);
        const isIn=selStart&&selEnd&&inR(date,selStart,selEnd);
        const isH=isSel&&hover&&inR(date,selStart<hover?selStart:hover,selStart<hover?hover:selStart);
        const heat=heatmap?(heatmap[toK(date)]||0):0;
        const constr=hasConstraint(date);
        const heatBg=constr?"#FFF3E0":heat>=3?"#D4EDDA":heat>=2?"#E8F5EE":heat>=1?"#F5FAF7":"transparent";
        return <button key={toK(date)} disabled={past}
          onClick={()=>!past&&onSelect(date)}
          onMouseEnter={()=>!past&&setHover(date)} onMouseLeave={()=>setHover(null)}
          style={{position:"relative",aspectRatio:"1",display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center",border:"none",
            cursor:past?"default":"pointer",
            borderRadius:isS?"10px 4px 4px 10px":isE?"4px 10px 10px 4px":(isIn||isH)?4:10,
            background:(isS||isE)?C.primary:isIn?C.primaryLight:isH?"#FFF5EE":heatBg,
            color:(isS||isE)?"#fff":past?C.textMut:isT?C.primary:C.text,
            fontSize:13,fontWeight:(isS||isE||isT)?700:500,fontFamily:"'DM Sans',sans-serif",
            transition:"all 0.15s",opacity:past?0.4:1}}>
          {date.getDate()}
          {constr&&!isS&&!isE&&<div style={{position:"absolute",top:2,right:3,width:5,height:5,borderRadius:"50%",background:C.warning}}/>}
          {heat>0&&!isS&&!isE&&<div style={{position:"absolute",bottom:2,display:"flex",gap:1}}>
            {Array.from({length:Math.min(heat,4)}).map((_,j)=>
              <div key={j} style={{width:3,height:3,borderRadius:"50%",background:(isIn||isH)?C.primaryDark:C.accent}}/>)}
          </div>}
        </button>;
      })}
    </div>
    <div style={{display:"flex",gap:12,marginTop:10,justifyContent:"center",flexWrap:"wrap"}}>
      <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.textMut,fontFamily:"'DM Sans',sans-serif"}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:C.primary}}/> Your range</div>
      <div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.textMut,fontFamily:"'DM Sans',sans-serif"}}>
        <div style={{display:"flex",gap:1}}><div style={{width:3,height:3,borderRadius:"50%",background:C.accent}}/><div style={{width:3,height:3,borderRadius:"50%",background:C.accent}}/></div> Others free</div>
      {constraints&&constraints.length>0&&<div style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:C.textMut,fontFamily:"'DM Sans',sans-serif"}}>
        <div style={{width:5,height:5,borderRadius:"50%",background:C.warning}}/> Unavailable</div>}
    </div>
  </div>;
}

function SelRange({start,end,onClear}){
  if(!start)return null;
  const n=end?dB(start,end)-1:0;
  return <div style={{display:"flex",alignItems:"center",gap:8,background:C.primaryLight,borderRadius:10,padding:"8px 12px",marginBottom:12}}>
    <span style={{fontSize:16}}>📅</span>
    <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:C.text,fontFamily:"'DM Sans',sans-serif"}}>
      {end?fR(start,end):`${fS(start)} → pick end date`}</div>
      {end&&<div style={{fontSize:12,color:C.textSec,fontFamily:"'DM Sans',sans-serif"}}>{n} {n===1?"night":"nights"}</div>}
    </div>
    <button onClick={onClear} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:C.textSec,padding:"4px"}}>✕</button>
  </div>;
}

/* ===== Overlap ===== */
function Overlap({userRange,members,onLock,constraints,tripDays}){
  const targetDays=tripDays||4;
  const all=[];
  if(userRange.start&&userRange.end)all.push({name:"You",...userRange});
  members.forEach(m=>{if(m.range)all.push({name:m.name,...m.range})});
  if(all.length<2)return null;

  // Build date→count map
  const dc={};
  all.forEach(r=>{let d=new Date(r.start);while(d<=r.end){const k=toK(d);if(!dc[k])dc[k]={count:0,date:new Date(d)};dc[k].count++;d=aD(d,1)}});
  const sorted=Object.values(dc).filter(d=>d.count>=2).sort((a,b)=>a.date-b.date);
  if(!sorted.length)return <div style={{background:C.warningLight,borderRadius:12,padding:"12px 14px",marginTop:14}}>
    <div style={{fontSize:13,fontWeight:600,color:C.warning,fontFamily:"'DM Sans',sans-serif"}}>No overlap yet — waiting for more responses</div></div>;

  // Find all consecutive runs
  const runs=[];
  let runStart=0;
  for(let i=1;i<=sorted.length;i++){
    if(i===sorted.length||(sorted[i].date-sorted[i-1].date)/864e5!==1){
      runs.push(sorted.slice(runStart,i));
      runStart=i;
    }
  }

  // For each run, find the best window of exactly targetDays
  let bestWindow=null, bestScore=0;
  runs.forEach(run=>{
    if(run.length<targetDays)return;
    for(let i=0;i<=run.length-targetDays;i++){
      const window=run.slice(i,i+targetDays);
      // Score = minimum overlap count in the window (how many people can make ALL days)
      const minCount=Math.min(...window.map(d=>d.count));
      // Tiebreak: sum of counts (prefer windows where more people overlap more days)
      const sumCount=window.reduce((s,d)=>s+d.count,0);
      const score=minCount*1000+sumCount;
      if(score>bestScore){bestScore=score;bestWindow=window}
    }
  });

  // Fallback: if no run is long enough for targetDays, show the longest available run
  let fallback=false;
  if(!bestWindow){
    const longestRun=runs.reduce((a,b)=>a.length>=b.length?a:b,runs[0]);
    if(longestRun.length>=2){bestWindow=longestRun;fallback=true}
    else return <div style={{background:C.warningLight,borderRadius:12,padding:"12px 14px",marginTop:14}}>
      <div style={{fontSize:13,fontWeight:600,color:C.warning,fontFamily:"'DM Sans',sans-serif"}}>No {targetDays}-day window found yet — waiting for more responses</div></div>;
  }

  const bS=bestWindow[0].date, bE=bestWindow[bestWindow.length-1].date;
  const od=dB(bS,bE);
  const mp=Math.min(...bestWindow.map(d=>d.count));

  // Check constraint conflicts
  const conflicts=[];
  if(constraints&&constraints.length>0){
    constraints.forEach(c=>{if(c.start&&c.end){
      let d=new Date(bS);while(d<=bE){if(inR(d,c.start,c.end)){conflicts.push(c.name);break}d=aD(d,1)}}})};

  return <div style={{marginTop:14}}>
    <div style={{background:"#F0FFF4",border:`1px solid ${C.accent}30`,borderRadius:12,padding:"14px 16px"}}>
      <div style={{fontSize:11,fontWeight:700,color:C.accent,fontFamily:"'DM Sans',sans-serif",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>
        Best {targetDays}-day window found</div>
      <div style={{fontSize:18,fontWeight:700,color:C.text,fontFamily:"'Outfit',sans-serif",marginBottom:4}}>{fR(bS,bE)}</div>
      <div style={{fontSize:13,color:C.textSec,fontFamily:"'DM Sans',sans-serif",marginBottom:conflicts.length||fallback?8:12}}>
        {od} days · {mp} of {all.length} people available all {od} days</div>
      {fallback&&<div style={{background:C.warningLight,borderRadius:8,padding:"8px 12px",marginBottom:8,
        display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:14}}>ℹ️</span>
        <div style={{fontSize:12,color:C.warning,fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>
          No full {targetDays}-day window found — showing best available ({od} days)</div>
      </div>}
      {conflicts.length>0&&<div style={{background:C.warningLight,borderRadius:8,padding:"8px 12px",marginBottom:8,
        display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:14}}>⚠️</span>
        <div style={{fontSize:12,color:C.warning,fontWeight:600,fontFamily:"'DM Sans',sans-serif"}}>
          Conflicts with {conflicts.join(", ")}'s unavailable dates</div>
      </div>}
      <button onClick={()=>onLock(bS,bE)} style={{width:"100%",padding:"13px 0",borderRadius:12,background:C.primary,
        color:"#fff",border:"none",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",
        boxShadow:`0 4px 14px ${C.primary}40`}}
        onMouseOver={e=>e.target.style.background=C.primaryDark}
        onMouseOut={e=>e.target.style.background=C.primary}>Lock Dates → {fR(bS,bE)}</button>
    </div>
  </div>;
}

/* ===== STAGES ===== */
function DatesStage({members,userRange,setUserRange,onLock,isOrgView,deadline,constraints,tripDays}){
  const[sS,setSS]=useState(userRange.start);
  const[sE,setSE]=useState(userRange.end);
  const sel=(date)=>{
    if(!sS||(sS&&sE)){setSS(date);setSE(null);setUserRange({start:date,end:null})}
    else{const[s,e]=date>=sS?[sS,date]:[date,sS];setSS(s);setSE(e);setUserRange({start:s,end:e})}};
  const clr=()=>{setSS(null);setSE(null);setUserRange({start:null,end:null})};
  const hm=useMemo(()=>{const h={};members.forEach(m=>{if(m.range){let d=new Date(m.range.start);
    while(d<=m.range.end){h[toK(d)]=(h[toK(d)]||0)+1;d=aD(d,1)}}});return h},[members]);

  return <div>
    <WaitingBanner members={members}/>
    {deadline&&<div style={{background:C.pendingLight,borderRadius:10,padding:"8px 12px",marginBottom:12,
      display:"flex",alignItems:"center",gap:6,fontSize:12,fontWeight:600,color:C.pending,fontFamily:"'DM Sans',sans-serif"}}>
      ⏰ Voting closes in {deadline}</div>}
    <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:4,fontFamily:"'DM Sans',sans-serif"}}>
      {isOrgView?"When are you free?":"When are you free?"}</div>
    <div style={{fontSize:13,color:C.textSec,fontFamily:"'DM Sans',sans-serif",marginBottom:12}}>
      {!sS?"Tap your start date — looking for a "+tripDays+"-day window":!sE?"Now tap your end date":"Your dates are set — waiting for others"}</div>
    <SelRange start={sS} end={sE} onClear={clr}/>
    <Calendar selStart={sS} selEnd={sE} onSelect={sel} heatmap={hm} constraints={constraints}/>
    {isOrgView&&<Overlap userRange={{start:sS,end:sE}} members={members} onLock={onLock} constraints={constraints} tripDays={tripDays}/>}
    {!isOrgView&&sS&&sE&&<div style={{textAlign:"center",padding:"14px",background:C.successLight,
      borderRadius:12,marginTop:14,fontSize:14,fontWeight:600,color:C.success,fontFamily:"'DM Sans',sans-serif"}}>
      ✓ Your availability submitted!</div>}
    {!sS&&<div style={{textAlign:"center",fontSize:13,color:C.textMut,fontFamily:"'DM Sans',sans-serif",padding:"12px 0"}}>
      Select your available dates to get started</div>}
  </div>;
}

function DestStage({lockedDates,destinations,setDestinations,members,userVote,setUserVote,onLock,isOrgView}){
  const[adding,setAdding]=useState(false);
  const[nn,setNN]=useState("");const[nno,setNNO]=useState("");const[ne,setNE]=useState("📍");
  const emojis=["📍","🌿","🏖️","☕","⛰️","🏛️","🌊","🏕️","🎪","🌴","❄️","🍷"];
  const gc=(id)=>{let c=userVote===id?1:0;members.forEach(m=>{if(m.vote===id)c++});return c};
  const best=destinations.length>0?destinations.reduce((b,d)=>gc(d.id)>gc(b.id)?d:b,destinations[0]):null;
  const addDest=()=>{if(!nn.trim())return;setDestinations(p=>[...p,{id:`dc_${Date.now()}`,name:nn.trim(),note:nno.trim()||"Added by you",emoji:ne}]);setNN("");setNNO("");setNE("📍");setAdding(false)};
  return <div>
    <div style={{background:C.successLight,borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:16}}>✓</span><span style={{fontSize:13,fontWeight:600,color:C.success,fontFamily:"'DM Sans',sans-serif"}}>Dates locked: {lockedDates}</span></div>
    <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:4,fontFamily:"'DM Sans',sans-serif"}}>Vote for your destination</div>
    <div style={{fontSize:13,color:C.textSec,fontFamily:"'DM Sans',sans-serif",marginBottom:12}}>
      {destinations.length===0?"Add options for the group to vote on":"Tap to vote, or add more options"}</div>
    <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:12}}>
      {destinations.map(d=>{const count=gc(d.id),sel=userVote===d.id,lead=best&&d.id===best.id&&count>=2;
        return <button key={d.id} onClick={()=>setUserVote(d.id)} style={{position:"relative",display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:12,border:"2px solid",borderColor:sel?C.primary:C.border,background:sel?C.primaryLight:C.card,cursor:"pointer",transition:"all 0.2s",textAlign:"left",boxShadow:sel?`0 0 0 1px ${C.primary}20`:C.shadow}}>
          <div style={{width:44,height:44,borderRadius:12,background:sel?C.primary:"#F5F5F3",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{d.emoji}</div>
          <div style={{flex:1}}><div style={{fontSize:15,fontWeight:600,color:C.text,fontFamily:"'DM Sans',sans-serif"}}>{d.name}</div>
            <div style={{fontSize:12,color:C.textSec,fontFamily:"'DM Sans',sans-serif",marginTop:2}}>{d.note}</div></div>
          <div style={{minWidth:36,height:36,borderRadius:"50%",background:count>0?C.accentLight:"#F5F5F3",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:count>0?C.accent:C.textMut,fontFamily:"'DM Sans',sans-serif"}}>{count}</div>
          {lead&&<div style={{position:"absolute",top:-8,right:12,background:C.success,color:"#fff",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,fontFamily:"'DM Sans',sans-serif"}}>LEADING</div>}
        </button>})}
    </div>
    {!adding?<button onClick={()=>setAdding(true)} style={{width:"100%",padding:"12px 0",borderRadius:12,border:`2px dashed ${C.border}`,background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize:14,fontWeight:600,color:C.textSec,fontFamily:"'DM Sans',sans-serif",marginBottom:16}}
      onMouseOver={e=>{e.currentTarget.style.borderColor=C.primary;e.currentTarget.style.color=C.primary}}
      onMouseOut={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textSec}}>+ Add a destination option</button>
    :<div style={{background:C.card,border:`2px solid ${C.primary}`,borderRadius:12,padding:16,marginBottom:16}}>
      <div style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:"'DM Sans',sans-serif",marginBottom:10}}>Add a destination</div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>{emojis.map(e=><button key={e} onClick={()=>setNE(e)} style={{width:36,height:36,borderRadius:8,border:`2px solid ${ne===e?C.primary:C.border}`,background:ne===e?C.primaryLight:C.bg,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>{e}</button>)}</div>
      <input type="text" placeholder="Destination name" value={nn} onChange={e=>setNN(e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,outline:"none",fontSize:14,fontFamily:"'DM Sans',sans-serif",color:C.text,background:C.bg,boxSizing:"border-box",marginBottom:8}} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
      <input type="text" placeholder="Short note (optional)" value={nno} onChange={e=>setNNO(e.target.value)} style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,outline:"none",fontSize:14,fontFamily:"'DM Sans',sans-serif",color:C.text,background:C.bg,boxSizing:"border-box",marginBottom:12}} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
      <div style={{display:"flex",gap:8}}>
        <button onClick={addDest} disabled={!nn.trim()} style={{flex:1,padding:"10px 0",borderRadius:8,background:nn.trim()?C.primary:C.border,color:nn.trim()?"#fff":C.textMut,border:"none",fontSize:14,fontWeight:700,cursor:nn.trim()?"pointer":"default",fontFamily:"'DM Sans',sans-serif"}}>Add Option</button>
        <button onClick={()=>{setAdding(false);setNN("");setNNO("")}} style={{padding:"10px 16px",borderRadius:8,background:C.bg,color:C.textSec,border:`1px solid ${C.border}`,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Cancel</button>
      </div>
    </div>}
    {isOrgView&&userVote&&best&&gc(best.id)>=2&&<button onClick={onLock} style={{width:"100%",padding:"14px 0",borderRadius:12,background:C.primary,color:"#fff",border:"none",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",boxShadow:`0 4px 14px ${C.primary}40`}}
      onMouseOver={e=>e.target.style.background=C.primaryDark} onMouseOut={e=>e.target.style.background=C.primary}>Lock Destination → {best.name} {best.emoji}</button>}
    {!isOrgView&&userVote&&<div style={{textAlign:"center",padding:"14px",background:C.successLight,borderRadius:12,marginTop:8,fontSize:14,fontWeight:600,color:C.success,fontFamily:"'DM Sans',sans-serif"}}>✓ Vote submitted!</div>}
  </div>;
}

function CommitStage({lockedDates,lockedDest,members,onCommit,onLockTrip,isOrgView}){
  const confirmed=members.filter(m=>m.status==="confirmed_in").length;
  const userIn=members.find(m=>m.id===1)?.status==="confirmed_in";
  return <div>
    <div style={{background:C.successLight,borderRadius:10,padding:"10px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:16}}>✓</span><span style={{fontSize:13,fontWeight:600,color:C.success,fontFamily:"'DM Sans',sans-serif"}}>Dates: {lockedDates}</span></div>
    <div style={{background:C.successLight,borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:16}}>✓</span><span style={{fontSize:13,fontWeight:600,color:C.success,fontFamily:"'DM Sans',sans-serif"}}>Destination: {lockedDest}</span></div>
    <div style={{fontSize:15,fontWeight:600,color:C.text,marginBottom:4,fontFamily:"'DM Sans',sans-serif"}}>Are you in?</div>
    <div style={{fontSize:13,color:C.textSec,fontFamily:"'DM Sans',sans-serif",marginBottom:16}}>{confirmed} of {members.length} confirmed</div>
    {!userIn?<div style={{display:"flex",gap:10,marginBottom:18}}>
      <button onClick={()=>onCommit(true)} style={{flex:2,padding:"14px 0",borderRadius:12,background:C.success,color:"#fff",border:"none",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",boxShadow:`0 4px 14px ${C.success}30`}}>I'm In ✓</button>
      <button onClick={()=>onCommit(false)} style={{flex:1,padding:"14px 0",borderRadius:12,background:C.card,color:C.danger,border:`2px solid ${C.danger}`,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>I'm Out</button>
    </div>:<div style={{textAlign:"center",padding:"14px",background:C.successLight,borderRadius:12,marginBottom:18,fontSize:14,fontWeight:600,color:C.success,fontFamily:"'DM Sans',sans-serif"}}>✓ You're confirmed!</div>}
    {isOrgView&&userIn&&confirmed>=3&&<button onClick={onLockTrip} style={{width:"100%",padding:"14px 0",borderRadius:12,background:C.primary,color:"#fff",border:"none",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",boxShadow:`0 4px 14px ${C.primary}40`}}>Lock Trip — {confirmed} going! 🎉</button>}
  </div>;
}

function ReadyStage({lockedDates,lockedDest,members}){
  const going=members.filter(m=>m.status==="confirmed_in");
  const[copied,setCopied]=useState(false);
  const summary=`🧳 ${lockedDest} Trip — ${lockedDates}\n👥 ${going.length} confirmed: ${going.map(m=>m.name.replace(" (Organizer)","")).join(", ")}\n\n✅ Locked on plankarochalo.com`;
  return <div style={{textAlign:"center"}}>
    <div style={{fontSize:48,marginBottom:8}}>🎉</div>
    <div style={{fontSize:22,fontWeight:800,color:C.text,fontFamily:"'Outfit',sans-serif",marginBottom:4}}>You're going!</div>
    <div style={{fontSize:14,color:C.textSec,fontFamily:"'DM Sans',sans-serif",marginBottom:20}}>{lockedDest} · {lockedDates} · {going.length} people</div>
    <div style={{background:"#F5F5F3",borderRadius:12,padding:16,marginBottom:16,textAlign:"left",fontFamily:"'DM Sans',sans-serif",fontSize:13,color:C.text,lineHeight:1.6,whiteSpace:"pre-line"}}>{summary}</div>
    <button onClick={()=>{navigator.clipboard?.writeText(summary);setCopied(true);setTimeout(()=>setCopied(false),2000)}} style={{width:"100%",padding:"14px 0",borderRadius:12,background:"#25D366",color:"#fff",border:"none",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
      {copied?"Copied! ✓":"📋 Copy for WhatsApp"}</button>
  </div>;
}

/* ===== #4 & #7 & #8 & #1: Restructured Create Flow ===== */
function CreateScreen({onCreate}){
  const[step,setStep]=useState(1);
  const[name,setName]=useState("");
  const[budget,setBudget]=useState("");
  const[tripDays,setTripDays]=useState(4);
  const[deadline,setDeadline]=useState("48h");
  const[proxyMembers,setProxyMembers]=useState([]);
  const[pName,setPName]=useState("");
  const[pStart,setPStart]=useState("");
  const[pEnd,setPEnd]=useState("");

  const addProxy=()=>{if(!pName.trim())return;
    const s=pStart?new Date(pStart+"T00:00:00"):null;
    const e=pEnd?new Date(pEnd+"T00:00:00"):null;
    setProxyMembers(p=>[...p,{name:pName.trim(),start:s,end:e,label:s&&e?`${fS(s)} – ${fS(e)} unavailable`:"No dates specified"}]);
    setPName("");setPStart("");setPEnd("")};
  const removeProxy=(i)=>setProxyMembers(p=>p.filter((_,j)=>j!==i));

  if(step===1)return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{fontSize:36,fontWeight:800,fontFamily:"'Outfit',sans-serif",color:C.text,lineHeight:1.1}}>
          Plan Karo<span style={{color:C.primary}}>,</span> Chalo<span style={{color:C.primary}}>.</span></div>
        <div style={{fontSize:15,color:C.textSec,fontFamily:"'DM Sans',sans-serif",maxWidth:280,margin:"8px auto 0"}}>
          Stop the back-and-forth. Decide your trip in minutes, not weeks.</div>
      </div>

      {/* #7: How it works */}
      <div style={{display:"flex",gap:12,marginBottom:28,maxWidth:380,width:"100%"}}>
        {[{icon:"🔗",label:"Share a link"},{icon:"📅",label:"Group picks dates"},{icon:"✅",label:"Trip locked"}].map((s,i)=>
          <div key={i} style={{flex:1,textAlign:"center",padding:"12px 8px",background:C.card,borderRadius:12,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:22,marginBottom:4}}>{s.icon}</div>
            <div style={{fontSize:11,fontWeight:600,color:C.textSec,fontFamily:"'DM Sans',sans-serif",lineHeight:1.3}}>{s.label}</div>
          </div>)}
      </div>

      <div style={{width:"100%",maxWidth:380,background:C.card,borderRadius:16,padding:24,boxShadow:C.shadowMd,border:`1px solid ${C.border}`}}>
        <div style={{fontSize:16,fontWeight:700,color:C.text,fontFamily:"'DM Sans',sans-serif",marginBottom:16}}>Start a new trip</div>
        <input type="text" placeholder="Give your trip a name..." value={name} onChange={e=>setName(e.target.value)}
          style={{width:"100%",padding:"12px 14px",borderRadius:10,border:`2px solid ${C.border}`,outline:"none",fontSize:15,fontFamily:"'DM Sans',sans-serif",color:C.text,background:C.bg,boxSizing:"border-box"}}
          onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
        <button onClick={()=>name.trim()&&setStep(2)} disabled={!name.trim()}
          style={{width:"100%",padding:"14px 0",borderRadius:12,marginTop:16,
            background:name.trim()?C.primary:C.border,color:name.trim()?"#fff":C.textMut,
            border:"none",fontSize:15,fontWeight:700,cursor:name.trim()?"pointer":"default",
            fontFamily:"'Outfit',sans-serif",boxShadow:name.trim()?`0 4px 14px ${C.primary}40`:"none"}}>
          Next → Trip Details</button>
      </div>
      <div style={{marginTop:24,fontSize:12,color:C.textMut,fontFamily:"'DM Sans',sans-serif",textAlign:"center"}}>
        🔗 Members join via link · No account needed</div>
    </div>
  );

  /* Step 2: Budget, deadline, proxy members */
  return(
    <div style={{minHeight:"100vh",background:C.bg,padding:24}}>
      <div style={{maxWidth:420,margin:"0 auto"}}>
        <button onClick={()=>setStep(1)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:C.textSec,fontFamily:"'DM Sans',sans-serif",padding:0,marginBottom:16}}>← Back</button>
        <div style={{fontSize:20,fontWeight:700,color:C.text,fontFamily:"'Outfit',sans-serif",marginBottom:4}}>{name}</div>
        <div style={{fontSize:13,color:C.textSec,fontFamily:"'DM Sans',sans-serif",marginBottom:20}}>Set up your trip details before sharing</div>

        {/* #8: Budget */}
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:16,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:"'DM Sans',sans-serif",marginBottom:8}}>Group budget <span style={{fontWeight:400,color:C.textMut}}>(optional)</span></div>
          <input type="text" placeholder="e.g. ₹5,000 - ₹10,000 per person" value={budget} onChange={e=>setBudget(e.target.value)}
            style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,outline:"none",fontSize:14,fontFamily:"'DM Sans',sans-serif",color:C.text,background:C.bg,boxSizing:"border-box"}}
            onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
        </div>

        {/* Trip duration */}
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:16,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:"'DM Sans',sans-serif",marginBottom:8}}>Trip duration</div>
          <div style={{display:"flex",gap:8}}>
            {[2,3,4,5,7].map(d=>
              <button key={d} onClick={()=>setTripDays(d)} style={{flex:1,padding:"10px 0",borderRadius:8,
                border:`2px solid ${tripDays===d?C.primary:C.border}`,
                background:tripDays===d?C.primaryLight:C.bg,color:tripDays===d?C.primary:C.textSec,
                fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",
                display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                <span style={{fontSize:16,fontWeight:700}}>{d}</span>
                <span style={{fontSize:10}}>{d===1?"day":"days"}</span>
              </button>)}
          </div>
          <div style={{fontSize:11,color:C.textMut,fontFamily:"'DM Sans',sans-serif",marginTop:6}}>
            The system will find the best {tripDays}-day window where the most people are free</div>
        </div>

        {/* #5: Deadline */}
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:16,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:"'DM Sans',sans-serif",marginBottom:8}}>Voting deadline</div>
          <div style={{display:"flex",gap:8}}>
            {["24h","48h","72h","No limit"].map(d=>
              <button key={d} onClick={()=>setDeadline(d)} style={{flex:1,padding:"8px 0",borderRadius:8,
                border:`2px solid ${deadline===d?C.primary:C.border}`,
                background:deadline===d?C.primaryLight:C.bg,color:deadline===d?C.primary:C.textSec,
                fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>{d}</button>)}
          </div>
          <div style={{fontSize:11,color:C.textMut,fontFamily:"'DM Sans',sans-serif",marginTop:6}}>
            After the deadline, voting auto-closes and the best option is surfaced</div>
        </div>

        {/* #1: Proxy input */}
        <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:16,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:"'DM Sans',sans-serif",marginBottom:4}}>
            Known constraints <span style={{fontWeight:400,color:C.textMut}}>(optional)</span></div>
          <div style={{fontSize:12,color:C.textSec,fontFamily:"'DM Sans',sans-serif",marginBottom:10,lineHeight:1.4}}>
            Add dates that won't work for members who may not use the tool (e.g. parents, busy friends)</div>

          {proxyMembers.map((p,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:C.bg,borderRadius:8,marginBottom:6}}>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:"'DM Sans',sans-serif"}}>{p.name}</div>
              {p.label&&<div style={{fontSize:11,color:C.warning,fontFamily:"'DM Sans',sans-serif"}}>⚠ {p.label}</div>}
            </div>
            <button onClick={()=>removeProxy(i)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:C.textMut}}>✕</button>
          </div>)}

          <div style={{fontSize:12,fontWeight:600,color:C.textSec,fontFamily:"'DM Sans',sans-serif",marginTop:proxyMembers.length?8:0,marginBottom:6}}>
            Add a member's unavailable dates</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <input type="text" placeholder="Name" value={pName} onChange={e=>setPName(e.target.value)}
              style={{flex:"1 1 100%",padding:"8px 10px",borderRadius:8,border:`1.5px solid ${C.border}`,outline:"none",fontSize:13,fontFamily:"'DM Sans',sans-serif",color:C.text,background:C.bg,boxSizing:"border-box"}}
              onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/>
            <div style={{flex:"1 1 45%",display:"flex",flexDirection:"column",gap:2}}>
              <label style={{fontSize:10,fontWeight:600,color:C.textMut,fontFamily:"'DM Sans',sans-serif"}}>Unavailable from</label>
              <input type="date" value={pStart} onChange={e=>setPStart(e.target.value)}
                style={{padding:"7px 8px",borderRadius:8,border:`1.5px solid ${C.border}`,outline:"none",fontSize:13,fontFamily:"'DM Sans',sans-serif",color:C.text,background:C.bg,boxSizing:"border-box"}}
                onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/></div>
            <div style={{flex:"1 1 45%",display:"flex",flexDirection:"column",gap:2}}>
              <label style={{fontSize:10,fontWeight:600,color:C.textMut,fontFamily:"'DM Sans',sans-serif"}}>Unavailable to</label>
              <input type="date" value={pEnd} onChange={e=>setPEnd(e.target.value)}
                style={{padding:"7px 8px",borderRadius:8,border:`1.5px solid ${C.border}`,outline:"none",fontSize:13,fontFamily:"'DM Sans',sans-serif",color:C.text,background:C.bg,boxSizing:"border-box"}}
                onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border}/></div>
            <button onClick={addProxy} disabled={!pName.trim()} style={{flex:"1 1 100%",padding:"9px 0",borderRadius:8,background:pName.trim()?C.accent:"#eee",color:pName.trim()?"#fff":C.textMut,border:"none",fontSize:13,fontWeight:700,cursor:pName.trim()?"pointer":"default",fontFamily:"'DM Sans',sans-serif",marginTop:2}}>+ Add Constraint</button>
          </div>
        </div>

        <button onClick={()=>onCreate({name:name.trim(),budget:budget.trim(),deadline,tripDays,proxyMembers})}
          style={{width:"100%",padding:"14px 0",borderRadius:12,background:C.primary,color:"#fff",border:"none",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",boxShadow:`0 4px 14px ${C.primary}40`,marginTop:8}}>
          Create Trip & Get Link →</button>
      </div>
    </div>
  );
}

/* ===== Main App ===== */
export default function App(){
  const[screen,setScreen]=useState("create");
  const[tripName,setTripName]=useState("");
  const[tripBudget,setTripBudget]=useState("");
  const[tripDeadline,setTripDeadline]=useState("48h");
  const[tripDays,setTripDays]=useState(4);
  const[stage,setStage]=useState("dates");
  const[members,setMembers]=useState([]);
  const[userRange,setUserRange]=useState({start:null,end:null});
  const[userVote,setUserVote]=useState(null);
  const[lockedDates,setLockedDates]=useState("");
  const[lockedDest,setLockedDest]=useState("");
  const[linkCopied,setLinkCopied]=useState(false);
  const[linkExp,setLinkExp]=useState(true);
  const[destinations,setDestinations]=useState([...DEST_INIT]);
  const[isOrgView,setIsOrgView]=useState(true);
  const[modal,setModal]=useState(null);
  const[proxyConstraints,setProxyConstraints]=useState([]);
  const[lockSuccess,setLockSuccess]=useState(null);

  useEffect(()=>{
    if(screen==="dashboard"&&stage==="dates"&&userRange.end){
      const sr=simRanges();
      const t=setTimeout(()=>{setMembers(p=>p.map(m=>sr[m.id]?{...m,range:sr[m.id],status:"responded"}:m))},1800);
      return()=>clearTimeout(t)}
  },[screen,stage,userRange.end]);

  useEffect(()=>{
    if(stage==="destination"){const t=setTimeout(()=>{setMembers(p=>p.map(m=>SIM_VOTES[m.id]?{...m,vote:SIM_VOTES[m.id]}:m))},1200);return()=>clearTimeout(t)}
  },[stage]);

  useEffect(()=>{
    if(stage==="commitment"){const t=setTimeout(()=>{setMembers(p=>p.map(m=>{
      if([2,3,5].includes(m.id))return{...m,status:"confirmed_in"};
      if(m.id===6)return{...m,status:"confirmed_out"};return m}))},1500);return()=>clearTimeout(t)}
  },[stage]);

  // Lock success toast
  useEffect(()=>{if(lockSuccess){const t=setTimeout(()=>setLockSuccess(null),2000);return()=>clearTimeout(t)}},[lockSuccess]);

  const handleCreate=(config)=>{
    setTripName(config.name);
    setTripBudget(config.budget);
    setTripDeadline(config.deadline);
    setTripDays(config.tripDays);
    const baseMembers=[
      {id:1,name:"You (Organizer)",isOrg:true,status:"confirmed_in",range:null,vote:null,constraint:null},
      {id:2,name:"Priya",isOrg:false,status:"no_response",range:null,vote:null,constraint:null},
      {id:3,name:"Nikhil",isOrg:false,status:"no_response",range:null,vote:null,constraint:null},
      {id:4,name:"Sneha",isOrg:false,status:"no_response",range:null,vote:null,constraint:null},
      {id:5,name:"Amit",isOrg:false,status:"no_response",range:null,vote:null,constraint:null},
      {id:6,name:"Rakshita",isOrg:false,status:"no_response",range:null,vote:null,constraint:null},
    ];
    // Add proxy members
    const proxy=config.proxyMembers.map((p,i)=>({id:100+i,name:p.name,isOrg:false,status:"no_response",range:null,vote:null,constraint:p.label}));
    setMembers([...baseMembers,...proxy]);
    setProxyConstraints(config.proxyMembers);
    setScreen("dashboard");
  };

  const reset=()=>{setScreen("create");setTripName("");setTripBudget("");setTripDays(4);setStage("dates");setMembers([]);setUserRange({start:null,end:null});setUserVote(null);setLockedDates("");setLockedDest("");setDestinations([...DEST_INIT]);setIsOrgView(true);setModal(null);setLinkExp(true)};

  const slug=tripName.toLowerCase().replace(/\s+/g,"-");

  if(screen==="create")return <><style>{FONTS}</style><CreateScreen onCreate={handleCreate}/></>;

  return <><style>{FONTS}</style>
    {modal&&<ConfirmModal {...modal}/>}
    {lockSuccess&&<div style={{position:"fixed",top:80,left:"50%",transform:"translateX(-50%)",zIndex:200,
      background:C.success,color:"#fff",padding:"10px 20px",borderRadius:12,fontSize:14,fontWeight:700,
      fontFamily:"'DM Sans',sans-serif",boxShadow:"0 8px 24px rgba(0,0,0,0.15)",
      animation:"fadeIn 0.3s ease"}}>{lockSuccess}</div>}
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans',sans-serif"}}>
      {/* Header */}
      <div style={{position:"sticky",top:0,zIndex:10,background:"rgba(250,250,248,0.92)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${C.border}`,padding:"12px 20px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:C.primary,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>Plan Karo, Chalo</div>
            <div style={{fontSize:18,fontWeight:700,color:C.text,fontFamily:"'Outfit',sans-serif"}}>{tripName}</div>
            {tripBudget&&<div style={{fontSize:11,color:C.textMut,fontFamily:"'DM Sans',sans-serif"}}>Budget: {tripBudget} · {tripDays} days</div>}
            {!tripBudget&&<div style={{fontSize:11,color:C.textMut,fontFamily:"'DM Sans',sans-serif"}}>{tripDays}-day trip</div>}
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {/* #2: Member view toggle */}
            <button onClick={()=>setIsOrgView(!isOrgView)} style={{padding:"5px 10px",borderRadius:8,
              background:isOrgView?C.primaryLight:"#E8E8FF",border:`1.5px solid ${isOrgView?C.primary:C.pending}`,
              fontSize:11,fontWeight:700,cursor:"pointer",color:isOrgView?C.primary:C.pending,
              fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>
              {isOrgView?"👑 Organizer":"👤 Member"}</button>
            <button onClick={reset} style={{padding:"5px 10px",borderRadius:8,background:"#F5F5F3",border:"none",fontSize:11,fontWeight:600,color:C.textSec,cursor:"pointer"}}>← New</button>
          </div>
        </div>
        <Progress stage={stage}/>
      </div>

      {/* Persistent link bar */}
      {stage!=="ready"&&<div style={{margin:"0 20px",marginTop:12}}>
        {linkExp?<div style={{padding:"10px 14px",borderRadius:12,background:C.pendingLight,border:`1px solid ${C.pending}20`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:"'DM Sans',sans-serif"}}>Share with your group</div>
            <div style={{fontSize:12,color:C.textSec,marginTop:2,fontFamily:"'DM Sans',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>plankarochalo.com/trip/{slug}</div>
          </div>
          <div style={{display:"flex",gap:6,marginLeft:8,flexShrink:0}}>
            <button onClick={()=>{navigator.clipboard?.writeText(`plankarochalo.com/trip/${slug}`);setLinkCopied(true);setTimeout(()=>setLinkCopied(false),2000)}} style={{padding:"6px 12px",borderRadius:8,background:C.pending,color:"#fff",border:"none",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>{linkCopied?"Copied!":"Copy"}</button>
            <button onClick={()=>setLinkExp(false)} style={{padding:"6px 8px",borderRadius:8,background:"transparent",border:"none",fontSize:14,color:C.textMut,cursor:"pointer"}}>✕</button>
          </div>
        </div>:<button onClick={()=>setLinkExp(true)} style={{width:"100%",padding:"8px 14px",borderRadius:10,background:C.pendingLight,border:`1px solid ${C.pending}20`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:12,fontWeight:600,color:C.pending,fontFamily:"'DM Sans',sans-serif"}}>🔗 Show trip link</button>}
      </div>}

      {/* Main */}
      <div style={{padding:"16px 20px 24px"}}>
        {stage==="dates"&&<DatesStage members={members} userRange={userRange} setUserRange={setUserRange}
          isOrgView={isOrgView} deadline={tripDeadline!=="No limit"?tripDeadline:null}
          constraints={proxyConstraints} tripDays={tripDays}
          onLock={(s,e)=>{
            setModal({title:"Lock these dates?",desc:`This will lock ${fR(s,e)} as the trip dates and notify the group. You'll move to destination voting next.`,confirmLabel:"Lock it ✓",
              onConfirm:()=>{setModal(null);setLockedDates(fR(s,e));setLockSuccess("Dates locked! ✓");setStage("destination")},
              onCancel:()=>setModal(null)})}}/>}
        {stage==="destination"&&<DestStage lockedDates={lockedDates} members={members}
          destinations={destinations} setDestinations={setDestinations}
          userVote={userVote} setUserVote={setUserVote} isOrgView={isOrgView}
          onLock={()=>{
            const gc=(id)=>{let c=userVote===id?1:0;members.forEach(m=>{if(m.vote===id)c++});return c};
            const best=destinations.reduce((b,d)=>gc(d.id)>gc(b.id)?d:b,destinations[0]);
            setModal({title:"Lock this destination?",desc:`This will lock ${best.name} ${best.emoji} as the destination and move to commitment confirmation.`,confirmLabel:"Lock it ✓",
              onConfirm:()=>{setModal(null);setLockedDest(`${best.name} ${best.emoji}`);setLockSuccess("Destination locked! ✓");setStage("commitment")},
              onCancel:()=>setModal(null)})}}/>}
        {stage==="commitment"&&<CommitStage lockedDates={lockedDates} lockedDest={lockedDest}
          members={members} isOrgView={isOrgView}
          onCommit={isIn=>setMembers(p=>p.map(m=>m.id===1?{...m,status:isIn?"confirmed_in":"confirmed_out"}:m))}
          onLockTrip={()=>{
            setModal({title:"Lock this trip?",desc:`This finalizes the trip. You'll get a WhatsApp-ready summary to share with the group.`,confirmLabel:"Lock it 🎉",
              onConfirm:()=>{setModal(null);setLockSuccess("Trip locked! 🎉");setStage("ready")},
              onCancel:()=>setModal(null)})}}/>}
        {stage==="ready"&&<ReadyStage lockedDates={lockedDates} lockedDest={lockedDest} members={members}/>}
        <div style={{marginTop:20}}><MemberList members={members}/></div>
      </div>
    </div></>;
}
