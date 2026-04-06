'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, CartesianGrid, LineChart, Line, Cell, PieChart, Pie
} from 'recharts';
import {
  Brain, Zap, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Star, Euro, Target, ArrowUpRight, ArrowDownRight,
  Building2, RefreshCw, ChevronRight, Info,
  Lightbulb, ShieldCheck, Activity, BarChart2, Users, Clock,
  Award, Flame
} from 'lucide-react';
import { useBNB } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';

/* ═══════════════════════ TYPES ═══════════════════════ */
interface DimScore { occupancy:number; revenue:number; quality:number; maintenance:number; pricing:number; loyalty:number; }
interface PropertyScore extends DimScore {
  propertyId:number; propertyName:string; total:number;
  trend:'up'|'down'|'stable'; trendDelta:number;
  cancellationRisk:number; optimalStay:number; repeatGuestRate:number; avgLeadTime:number;
}
interface ActionItem {
  id:string; propertyId:number; propertyName:string;
  type:'pricing'|'maintenance'|'review'|'gap'|'alert'|'risk'|'loyalty';
  priority:'critical'|'high'|'medium'|'low';
  title:string; description:string; impact:string; impactValue:number; icon:string; insight?:string;
}
interface PricingOpp {
  propertyId:number; propertyName:string; currentPrice:number; suggestedPrice:number;
  delta:number; deltaPct:number; reason:string; confidence:'high'|'medium'|'low';
  period:string; demandSignal:'hot'|'warm'|'cold'; elasticity:number;
}
interface CancelRisk { propertyId:number; bookingId:number; guestName:string; checkIn:string; riskScore:number; factors:string[]; }

/* ═══════════════════════ HELPERS ═══════════════════════ */
const SF:Record<number,number>={0:.75,1:.80,2:.90,3:1.00,4:1.05,5:1.15,6:1.30,7:1.35,8:1.20,9:1.05,10:.85,11:.80};
const MFR=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const SNM=['Hiver','Hiver','Printemps','Printemps','Printemps','Été','Été','Été','Automne','Automne','Automne','Hiver'];
const DLBL=['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
function ddays(a:string,b:string){return Math.max(0,Math.ceil((new Date(b).getTime()-new Date(a).getTime())/86400000));}
function clamp(v:number,lo:number,hi:number){return Math.max(lo,Math.min(hi,v));}
function sc(s:number){return s>=80?'#22c55e':s>=60?'#f59e0b':'#ef4444';}
function sl(s:number){return s>=80?'Excellent':s>=65?'Bon':s>=50?'Correct':'À améliorer';}
function rc(r:number){return r>=70?'#ef4444':r>=40?'#f59e0b':'#22c55e';}

/* ═══════════════════════ COMPONENT ═══════════════════════ */
export default function SmartPropertyIntelligence() {
  const {properties,bookings,maintenanceTasks,reviews,inventory,guests,getOccupancyRate,getRevenueByProperty}=useBNB();
  const {isDark}=useTheme();
  const [selId,setSelId]=useState<number|null>(null);
  const [tab,setTab]=useState<'scores'|'actions'|'pricing'|'risk'|'patterns'>('scores');
  const [spin,setSpin]=useState(false);

  const now=new Date();
  const today=now.toISOString().split('T')[0];
  const d30=new Date(now.getTime()-30*86400000).toISOString().split('T')[0];
  const d60=new Date(now.getTime()-60*86400000).toISOString().split('T')[0];
  const d90=new Date(now.getTime()-90*86400000).toISOString().split('T')[0];
  const d30f=new Date(now.getTime()+30*86400000).toISOString().split('T')[0];
  const mo=now.getMonth();

  /* ── SCORES ── */
  const scores:PropertyScore[]=useMemo(()=>properties.map(p=>{
    const pb=bookings.filter(b=>b.propertyId===p.id);
    const conf=pb.filter(b=>b.status==='confirmed'||b.status==='completed');
    const done=pb.filter(b=>b.status==='completed');
    const occN=getOccupancyRate(p.id,d30,today);
    const occP=getOccupancyRate(p.id,d60,d30);
    const revN=getRevenueByProperty(p.id,d30,today);
    const revP=getRevenueByProperty(p.id,d60,d30);
    const occupancy=clamp(occN,0,100);
    const revenue=p.price>0?clamp((revN/(p.price*30))*100,0,100):50;
    const rr=reviews.filter(r=>r.propertyId===p.id);
    const rr90=rr.filter(r=>r.createdAt>=d90);
    const avg=rr90.length>0?rr90.reduce((s,r)=>s+r.rating,0)/rr90.length:rr.length>0?rr.reduce((s,r)=>s+r.rating,0)/rr.length:3.5;
    const quality=clamp((avg/5)*100+(rr90.length>=3?5:0),0,100);
    const tasks=maintenanceTasks.filter(t=>t.propertyId===p.id&&t.status!=='completed');
    const ov=tasks.filter(t=>new Date(t.scheduledDate)<now).length;
    const ur=tasks.filter(t=>t.priority==='urgent').length;
    const hi=tasks.filter(t=>t.priority==='high').length;
    const maintenance=clamp(100-ov*20-ur*15-hi*8,0,100);
    const sf=SF[mo];
    const avgS=conf.length>0?conf.reduce((s,b)=>s+ddays(b.checkIn,b.checkOut),0)/conf.length:3;
    const avgV=conf.length>0?conf.reduce((s,b)=>s+b.totalPrice,0)/conf.length:p.price*avgS;
    const eff=avgS>0?avgV/avgS:p.price;
    const pg=sf>0?eff/(p.price*sf):1;
    const pricing=clamp(pg>1.1?100:pg<0.5?10:pg*80,0,100);
    const gids=done.map(b=>b.guestId);
    const uniq=new Set(gids).size;
    const rep=gids.length>0?Math.round(((gids.length-uniq)/gids.length)*100):0;
    const loyalty=clamp(rep*2,0,100);
    const total=Math.round(occupancy*.22+revenue*.22+quality*.18+maintenance*.14+pricing*.14+loyalty*.10);
    const td=Math.round(revN-revP);
    const od=occN-occP;
    const trend:'up'|'down'|'stable'=od>5?'up':od<-5?'down':'stable';
    const sd:Record<number,number>={};
    done.forEach(b=>{const n=ddays(b.checkIn,b.checkOut);sd[n]=(sd[n]||0)+1;});
    const optS=Object.keys(sd).length>0?Number(Object.entries(sd).sort((a,b)=>b[1]-a[1])[0][0]):3;
    const lts=conf.reduce<number[]>((acc,b)=>{if(!b.createdAt)return acc;const d=ddays(b.createdAt.split('T')[0],b.checkIn);if(d>=0&&d<365)acc.push(d);return acc;},[]);
    const alt=lts.length>0?Math.round(lts.reduce((s,v)=>s+v,0)/lts.length):14;
    const cans=pb.filter(b=>b.status==='cancelled').length;
    const cr=pb.length>0?cans/pb.length:0;
    return {propertyId:p.id,propertyName:p.name,total,occupancy:Math.round(occupancy),revenue:Math.round(revenue),quality:Math.round(quality),maintenance:Math.round(maintenance),pricing:Math.round(pricing),loyalty:Math.round(loyalty),trend,trendDelta:td,cancellationRisk:Math.round(clamp(cr*150,0,100)),optimalStay:optS,repeatGuestRate:rep,avgLeadTime:alt};
  }),[properties,bookings,maintenanceTasks,reviews,getOccupancyRate,getRevenueByProperty,d30,d60,d90,today,mo,now]);

  /* ── CANCEL RISK ── */
  const risks:CancelRisk[]=useMemo(()=>{
    const res:CancelRisk[]=[];
    bookings.filter(b=>b.status==='confirmed'&&b.checkIn>=today&&b.checkIn<=d30f).forEach(b=>{
      const g=guests.find(x=>x.id===b.guestId);
      const ps=scores.find(s=>s.propertyId===b.propertyId);
      const fac:string[]=[];let risk=0;
      const gc=bookings.filter(x=>x.guestId===b.guestId&&x.id!==b.id&&x.status==='cancelled').length;
      if(gc>=2){risk+=35;fac.push(`${gc} annulations passées`);}else if(gc===1){risk+=15;fac.push('1 annulation passée');}
      const lt=ddays(b.createdAt?.split('T')[0]||today,b.checkIn);
      if(lt<=2){risk+=25;fac.push('Last-minute (<2j)');}else if(lt<=7){risk+=10;fac.push('Délai court (<7j)');}
      const sl=ddays(b.checkIn,b.checkOut);
      if(sl>=14){risk+=20;fac.push(`Séjour long (${sl}n)`);}else if(sl>=7){risk+=8;fac.push(`Séjour moyen (${sl}n)`);}
      if(g&&g.rating>0&&g.rating<3){risk+=20;fac.push(`Note voyageur ${g.rating}/5`);}
      if(ps&&ps.cancellationRisk>50){risk+=15;fac.push('Historique annulations élevé');}
      if(b.paymentStatus==='pending'){risk+=20;fac.push('Paiement en attente');}
      const fr=clamp(risk,0,100);
      if(fr>=25) res.push({propertyId:b.propertyId,bookingId:b.id,guestName:b.guestInfo?.name||g?.name||'Inconnu',checkIn:b.checkIn,riskScore:fr,factors:fac});
    });
    return res.sort((a,b)=>b.riskScore-a.riskScore);
  },[bookings,guests,scores,today,d30f]);

  /* ── ACTIONS ── */
  const actions:ActionItem[]=useMemo(()=>{
    const res:ActionItem[]=[];
    properties.forEach(p=>{
      const s=scores.find(x=>x.propertyId===p.id);if(!s)return;
      const pb=bookings.filter(b=>b.propertyId===p.id);
      const sf=SF[mo];const sd=Math.round(p.price*(sf-1));
      if(s.pricing<65&&sd!==0) res.push({id:`price-${p.id}`,propertyId:p.id,propertyName:p.name,type:'pricing',priority:Math.abs(sd)>20?'high':'medium',title:sd>0?'💰 Augmenter le tarif':'📉 Ajuster le tarif',description:`${SNM[mo]} — tarif recommandé ${p.price+sd}€/nuit`,impact:`+${Math.abs(sd*10)}€/mois estimé`,impactValue:Math.abs(sd*10),icon:'💰',insight:`Tarif actuel ${p.price}€ vs optimal saisonnier ${p.price+sd}€. En ${MFR[mo]}, la demande est ${(sf*100-100).toFixed(0)}% ${sf>1?'supérieure':'inférieure'} à la moyenne annuelle.`});
      maintenanceTasks.filter(t=>t.propertyId===p.id&&t.status!=='completed'&&new Date(t.scheduledDate)<now).slice(0,2).forEach(t=>{
        const dl=ddays(t.scheduledDate,today);
        res.push({id:`maint-${t.id}`,propertyId:p.id,propertyName:p.name,type:'maintenance',priority:t.priority==='urgent'?'critical':t.priority==='high'?'high':'medium',title:`🔧 Maintenance en retard (${dl}j)`,description:`"${t.title}" — prévu ${new Date(t.scheduledDate).toLocaleDateString('fr-FR')}`,impact:`Coût estimé ${t.estimatedCost}€`,impactValue:t.estimatedCost+(t.priority==='urgent'?300:t.priority==='high'?150:50),icon:'🔧',insight:`${dl} jours de retard. Impact potentiel : -0.4★ sur la note si un voyageur est présent.`});
      });
      const ua=reviews.filter(r=>r.propertyId===p.id&&!r.response&&r.rating<=3);
      if(ua.length>0) res.push({id:`rev-${p.id}`,propertyId:p.id,propertyName:p.name,type:'review',priority:ua.length>=2?'high':'medium',title:`⭐ ${ua.length} avis négatif${ua.length>1?'s':''} sans réponse`,description:`Note moy. : ${(ua.reduce((s,r)=>s+r.rating,0)/ua.length).toFixed(1)}★`,impact:'Impact réputation direct',impactValue:ua.length*60,icon:'⭐',insight:'Répondre en 48h augmente la confiance des futurs voyageurs de 30%. Les hôtes réactifs gagnent en moyenne +0.2★.'});
      const up=pb.filter(b=>b.checkIn>=today&&b.checkIn<=d30f&&(b.status==='confirmed'||b.status==='completed'));
      const cov=up.reduce((s,b)=>s+ddays(b.checkIn,b.checkOut),0);
      const vac=Math.max(0,30-cov);
      if(vac>=7){const pr=Math.round(vac*p.price*.75);res.push({id:`gap-${p.id}`,propertyId:p.id,propertyName:p.name,type:'gap',priority:vac>=14?'high':'medium',title:`📅 ${vac}j vacants (30 prochains jours)`,description:`${cov}/30 jours réservés — taux ${Math.round((cov/30)*100)}%`,impact:`Manque à gagner ~${pr}€`,impactValue:pr,icon:'📅',insight:`Taux optimal BNB : 75-85%. Vous êtes à ${Math.round((cov/30)*100)}%. Une promotion -10% pourrait générer ~${Math.round(pr*.9)}€ vs 0€.`});}
      const ls=inventory.filter(i=>i.propertyId===p.id&&i.quantity<=i.minimumQuantity);
      if(ls.length>=2) res.push({id:`stock-${p.id}`,propertyId:p.id,propertyName:p.name,type:'alert',priority:ls.some(i=>i.quantity===0)?'high':'medium',title:`📦 ${ls.length} articles en rupture`,description:ls.slice(0,3).map(i=>`${i.name} (${i.quantity}/${i.minimumQuantity})`).join(' · '),impact:'Expérience voyageur dégradée',impactValue:ls.length*25,icon:'📦',insight:'Articles manquants = 2ème cause d\'avis négatifs après la propreté.'});
      const rb=risks.filter(r=>r.propertyId===p.id&&r.riskScore>=60);
      if(rb.length>0){const loss=rb.reduce((s,r)=>{const b=bookings.find(x=>x.id===r.bookingId);return s+(b?.totalPrice||0);},0);res.push({id:`risk-${p.id}`,propertyId:p.id,propertyName:p.name,type:'risk',priority:'high',title:`⚠️ ${rb.length} réservation${rb.length>1?'s':''} à risque élevé`,description:`${rb[0].guestName}${rb.length>1?` +${rb.length-1} autre(s)`:''}`,impact:`Perte potentielle ~${loss}€`,impactValue:loss,icon:'⚠️',insight:'Contactez ces voyageurs proactivement. Un message de bienvenue réduit le risque d\'annulation de 25%.'});}
    });
    return res.sort((a,b)=>b.impactValue-a.impactValue);
  },[properties,scores,bookings,maintenanceTasks,reviews,inventory,risks,mo,now,today,d30f]);

  /* ── PRICING ── */
  const pricing:PricingOpp[]=useMemo(()=>properties.map(p=>{
    const pb=bookings.filter(b=>b.propertyId===p.id&&(b.status==='confirmed'||b.status==='completed'));
    const sf=SF[mo];
    const rec=bookings.filter(b=>b.propertyId===p.id&&b.createdAt&&b.createdAt>=d30).length;
    const sig:'hot'|'warm'|'cold'=rec>=3?'hot':rec>=1?'warm':'cold';
    const occ=getOccupancyRate(p.id,d30,today);
    let sug=Math.round(p.price*sf);
    if(occ>80)sug=Math.round(sug*1.10);
    if(occ<40)sug=Math.round(sug*.92);
    sug=Math.round(sug/5)*5;
    const delta=sug-p.price;const dp=Math.round((delta/p.price)*100);
    const hr=reviews.filter(r=>r.propertyId===p.id).length>=3;
    const hb=pb.length>=5;
    const conf:'high'|'medium'|'low'=hr&&hb?'high':hb?'medium':'low';
    let reason=`Saisonnalité ${SNM[mo]} (×${sf.toFixed(2)})`;
    if(occ>80)reason=`Occupation forte (${Math.round(occ)}%) — marge tarifaire disponible`;
    else if(occ<40)reason=`Occupation faible (${Math.round(occ)}%) — stimuler la demande`;
    else if(sig==='hot')reason=`Demande en hausse — ${rec} nouvelles réservations récentes`;
    return {propertyId:p.id,propertyName:p.name,currentPrice:p.price,suggestedPrice:sug,delta,deltaPct:dp,reason,confidence:conf,period:`${MFR[mo]} ${now.getFullYear()}`,demandSignal:sig,elasticity:Math.round(occ)};
  }),[properties,bookings,reviews,getOccupancyRate,mo,now,d30,today]);

  /* ── PATTERNS ── */
  const patterns=useMemo(()=>{
    const pid=selId??properties[0]?.id;
    const p=properties.find(x=>x.id===pid);
    if(!p) return {dow:[],lt:[],sl:[],name:'',total:0};
    const pb=bookings.filter(b=>b.propertyId===p.id&&(b.status==='confirmed'||b.status==='completed'));
    const dowC=Array(7).fill(0);pb.forEach(b=>{dowC[new Date(b.checkIn).getDay()]++;});
    const dow=DLBL.map((l,i)=>({label:l,count:dowC[i]}));
    const ltB=[{l:'0-2j',a:0,z:2},{l:'3-7j',a:3,z:7},{l:'8-14j',a:8,z:14},{l:'15-30j',a:15,z:30},{l:'31-60j',a:31,z:60},{l:'>60j',a:61,z:9999}];
    const ltC=ltB.map(()=>0);
    pb.forEach(b=>{if(!b.createdAt)return;const x=ddays(b.createdAt.split('T')[0],b.checkIn);const i=ltB.findIndex(k=>x>=k.a&&x<=k.z);if(i>=0)ltC[i]++;});
    const lt=ltB.map((b,i)=>({label:b.l,count:ltC[i]}));
    const slB=[{l:'1n',a:1,z:1},{l:'2n',a:2,z:2},{l:'3-4n',a:3,z:4},{l:'5-7n',a:5,z:7},{l:'8-13n',a:8,z:13},{l:'14n+',a:14,z:9999}];
    const slC=slB.map(()=>0);
    pb.forEach(b=>{const n=ddays(b.checkIn,b.checkOut);const i=slB.findIndex(k=>n>=k.a&&n<=k.z);if(i>=0)slC[i]++;});
    const sl=slB.map((b,i)=>({label:b.l,count:slC[i]}));
    return {dow,lt,sl,name:p.name,total:pb.length};
  },[properties,bookings,selId]);

  /* ── PORTFOLIO ── */
  const port=useMemo(()=>{
    if(!scores.length)return{avg:0,top:null,atRisk:0,critical:0,total:0};
    const avg=Math.round(scores.reduce((s,p)=>s+p.total,0)/scores.length);
    const top=[...scores].sort((a,b)=>b.total-a.total)[0];
    return{avg,top,atRisk:scores.filter(p=>p.total<50).length,critical:actions.filter(a=>a.priority==='critical'||a.priority==='high').length,total:actions.length};
  },[scores,actions]);

  /* ── TREND ── */
  const trend=useMemo(()=>Array.from({length:12},(_,i)=>{
    const ms=new Date(now.getFullYear(),i,1).toISOString().split('T')[0];
    const me=new Date(now.getFullYear(),i+1,0).toISOString().split('T')[0];
    const rev=properties.reduce((s,p)=>s+getRevenueByProperty(p.id,ms,me),0);
    const occ=properties.length>0?properties.reduce((s,p)=>s+getOccupancyRate(p.id,ms,me),0)/properties.length:0;
    const bk=bookings.filter(b=>b.checkIn>=ms&&b.checkIn<=me).length;
    return{month:['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][i],rev:Math.round(rev),occ:Math.round(occ),bk};
  }),[properties,bookings,getRevenueByProperty,getOccupancyRate,now]);

  /* ── RADAR ── */
  const radar=useMemo(()=>{
    const s=scores.find(x=>x.propertyId===(selId??scores[0]?.propertyId));
    if(!s)return[];
    return [{axis:'Occupation',value:s.occupancy},{axis:'Revenus',value:s.revenue},{axis:'Qualité',value:s.quality},{axis:'Maintenance',value:s.maintenance},{axis:'Tarif',value:s.pricing},{axis:'Fidélité',value:s.loyalty}];
  },[selId,scores]);

  /* ── STYLES ── */
  const C=isDark?'bg-[#1a1a2e] border border-white/[0.08] rounded-2xl':'bg-white border border-gray-100 rounded-2xl shadow-sm';
  const SC=isDark?'bg-white/[0.04] border border-white/[0.06] rounded-xl':'bg-gray-50 border border-gray-100 rounded-xl';
  const T=isDark?'text-white':'text-gray-900';
  const M=isDark?'text-white/50':'text-gray-400';
  const S=isDark?'text-white/70':'text-gray-600';
  const PS:Record<string,string>={critical:'bg-red-500/15 text-red-400 border-red-500/30',high:'bg-orange-500/15 text-orange-400 border-orange-500/30',medium:'bg-amber-500/15 text-amber-400 border-amber-500/30',low:'bg-blue-500/15 text-blue-400 border-blue-500/30'};
  const PL:Record<string,string>={critical:'Critique',high:'Haute',medium:'Moyenne',low:'Faible'};
  const TC={contentStyle:{background:isDark?'#1a1a2e':'#fff',border:isDark?'1px solid rgba(255,255,255,0.1)':'1px solid #e5e7eb',borderRadius:8,color:isDark?'#fff':'#111'}};

  if(!properties.length) return(
    <div className={`${C} p-10 flex flex-col items-center gap-4`}>
      <Brain className="w-16 h-16 text-violet-400 opacity-60"/>
      <p className={`${T} text-xl font-semibold`}>Intelligence Propriétés</p>
      <p className={M}>Ajoutez des propriétés pour activer l&apos;analyse.</p>
    </div>
  );

  return(
    <div className="space-y-5">

      {/* HEADER */}
      <motion.div initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} className={`${C} p-5`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center"><Brain className="w-5 h-5 text-violet-400"/></div>
            <div>
              <h1 className={`${T} text-xl font-bold`}>🧠 Intelligence Propriétés</h1>
              <p className={`${M} text-sm`}>{properties.length} bien{properties.length>1?'s':''} · {port.total} action{port.total>1?'s':''} · {risks.length} risque{risks.length>1?'s':''}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border" style={{borderColor:`${sc(port.avg)}40`,backgroundColor:`${sc(port.avg)}15`}}>
              <Activity className="w-4 h-4" style={{color:sc(port.avg)}}/><span className="font-bold text-sm" style={{color:sc(port.avg)}}>{port.avg}/100</span><span className="text-xs" style={{color:sc(port.avg)}}>{sl(port.avg)}</span>
            </div>
            <button onClick={()=>{setSpin(true);setTimeout(()=>setSpin(false),1200);}} className={`p-2 rounded-xl ${isDark?'bg-white/[0.06] hover:bg-white/10':'bg-gray-100 hover:bg-gray-200'} transition-colors`}>
              <RefreshCw className={`w-4 h-4 ${M} ${spin?'animate-spin':''}`}/>
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            {label:'Score Portfolio',value:`${port.avg}/100`,sub:sl(port.avg),icon:<ShieldCheck className="w-5 h-5"/>,color:sc(port.avg)},
            {label:'Actions Critiques',value:`${port.critical}`,sub:`sur ${port.total} totales`,icon:<Zap className="w-5 h-5"/>,color:'#f59e0b'},
            {label:'Risques Annulation',value:`${risks.length}`,sub:risks.length>0?`${risks.filter(r=>r.riskScore>=70).length} élevés`:'Aucun',icon:<AlertTriangle className="w-5 h-5"/>,color:risks.length>0?'#ef4444':'#22c55e'},
            {label:'Meilleur Bien',value:port.top?.propertyName.split(' ').slice(0,2).join(' ')??'—',sub:port.top?`${port.top.total}/100`:'—',icon:<Award className="w-5 h-5"/>,color:'#a78bfa'},
          ].map((k,i)=>(
            <motion.div key={i} whileHover={{scale:1.03}} className={`${SC} p-4 flex items-center gap-3`}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{backgroundColor:`${k.color}18`,color:k.color}}>{k.icon}</div>
              <div className="min-w-0"><p className={`${M} text-xs`}>{k.label}</p><p className={`${T} font-bold text-sm truncate`}>{k.value}</p><p className="text-xs" style={{color:k.color}}>{k.sub}</p></div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className={`flex flex-wrap gap-1 mt-5 p-1 rounded-xl ${isDark?'bg-white/[0.04]':'bg-gray-100'} w-fit`}>
          {(['scores','actions','pricing','risk','patterns'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab===t?'bg-violet-600 text-white shadow-md':S}`}>
              {t==='scores'?'📊 Scores':t==='actions'?'⚡ Actions':t==='pricing'?'💶 Tarifs':t==='risk'?'⚠️ Risques':'🔍 Patterns'}
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">

        {/* SCORES */}
        {tab==='scores'&&(
          <motion.div key="sc" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {scores.map(s=>(
                <motion.div key={s.propertyId} whileHover={{scale:1.01}} onClick={()=>setSelId(selId===s.propertyId?null:s.propertyId)}
                  className={`${C} p-5 cursor-pointer ${selId===s.propertyId?'ring-2 ring-violet-500/50':''}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center"><Building2 className="w-4 h-4 text-violet-400"/></div>
                      <div>
                        <p className={`${T} font-semibold text-sm`}>{s.propertyName}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {s.trend==='up'&&<><TrendingUp className="w-3 h-3 text-emerald-400"/><span className="text-xs text-emerald-400">+{s.trendDelta}€</span></>}
                          {s.trend==='down'&&<><TrendingDown className="w-3 h-3 text-red-400"/><span className="text-xs text-red-400">{s.trendDelta}€</span></>}
                          {s.trend==='stable'&&<span className={`text-xs ${M}`}>Stable</span>}
                          <span className={`text-xs ${M}`}>· {s.optimalStay}n opt · {s.avgLeadTime}j délai</span>
                        </div>
                      </div>
                    </div>
                    <div className="relative flex items-center justify-center">
                      <svg width="56" height="56" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="22" fill="none" stroke={isDark?'rgba(255,255,255,0.08)':'#e5e7eb'} strokeWidth="5"/>
                        <circle cx="28" cy="28" r="22" fill="none" stroke={sc(s.total)} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(s.total/100)*138.2} 138.2`} transform="rotate(-90 28 28)"/>
                      </svg>
                      <span className="absolute text-xs font-bold" style={{color:sc(s.total)}}>{s.total}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {([{l:'Occupation',v:s.occupancy,e:'📅'},{l:'Revenus',v:s.revenue,e:'💶'},{l:'Qualité',v:s.quality,e:'⭐'},{l:'Maintenance',v:s.maintenance,e:'🔧'},{l:'Tarification',v:s.pricing,e:'🎯'},{l:'Fidélité',v:s.loyalty,e:'🏆'}]).map(d=>(
                      <div key={d.l} className="flex items-center gap-2">
                        <span className="text-xs w-4">{d.e}</span>
                        <span className={`${M} text-xs w-20`}>{d.l}</span>
                        <div className={`flex-1 h-1.5 rounded-full ${isDark?'bg-white/10':'bg-gray-100'}`}>
                          <motion.div initial={{width:0}} animate={{width:`${d.v}%`}} transition={{duration:.8,delay:.1}} className="h-full rounded-full" style={{backgroundColor:sc(d.v)}}/>
                        </div>
                        <span className="text-xs font-medium w-8 text-right" style={{color:sc(d.v)}}>{d.v}%</span>
                      </div>
                    ))}
                  </div>
                  {(()=>{
                    const pa=actions.filter(a=>a.propertyId===s.propertyId).slice(0,2);
                    if(!pa.length)return<div className="mt-3 flex items-center gap-2 text-emerald-400 text-xs"><CheckCircle className="w-3.5 h-3.5"/><span>Aucune action requise</span></div>;
                    return<div className="mt-3 space-y-1.5">{pa.map(a=><div key={a.id} className={`flex items-center gap-2 text-xs px-2 py-1 rounded-lg border ${PS[a.priority]}`}><span>{a.icon}</span><span className="flex-1 truncate">{a.title}</span><ChevronRight className="w-3 h-3 flex-shrink-0"/></div>)}</div>;
                  })()}
                </motion.div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {radar.length>0&&(
                <div className={`${C} p-5`}>
                  <div className="flex items-center gap-2 mb-1"><BarChart2 className="w-4 h-4 text-violet-400"/><h3 className={`${T} font-semibold text-sm`}>Radar 6D — {scores.find(s=>s.propertyId===(selId??scores[0]?.propertyId))?.propertyName}</h3></div>
                  <p className={`${M} text-xs mb-3`}>Cliquez une carte pour changer de bien</p>
                  <div className="h-56"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radar}><PolarGrid stroke={isDark?'rgba(255,255,255,0.1)':'#e5e7eb'}/><PolarAngleAxis dataKey="axis" tick={{fill:isDark?'rgba(255,255,255,0.5)':'#6b7280',fontSize:11}}/><PolarRadiusAxis angle={90} domain={[0,100]} tick={false} axisLine={false}/><Radar name="Score" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={.25} strokeWidth={2}/></RadarChart></ResponsiveContainer></div>
                </div>
              )}
              <div className={`${C} p-5`}>
                <div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 text-violet-400"/><h3 className={`${T} font-semibold text-sm`}>Revenus & Occupation {now.getFullYear()}</h3></div>
                <div className="h-56"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke={isDark?'rgba(255,255,255,0.05)':'#f0f0f0'}/><XAxis dataKey="month" tick={{fill:isDark?'rgba(255,255,255,0.4)':'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:isDark?'rgba(255,255,255,0.4)':'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip {...TC} formatter={(v:unknown,n:unknown)=>[n==='rev'?`${v}€`:`${v}%`,n==='rev'?'Revenus':'Occupation']}/><Area type="monotone" dataKey="rev" stroke="#8b5cf6" fill="url(#rg)" strokeWidth={2}/></AreaChart></ResponsiveContainer></div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ACTIONS */}
        {tab==='actions'&&(
          <motion.div key="ac" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="space-y-3">
            <div className={`${C} p-4 flex items-center gap-3`}><Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0"/><p className={`${S} text-sm`}><strong className={T}>{actions.length} recommandation{actions.length>1?'s':''}</strong> triées par impact. Chaque action inclut une explication détaillée.</p></div>
            {actions.length===0?(
              <div className={`${C} p-10 flex flex-col items-center gap-3`}><CheckCircle className="w-12 h-12 text-emerald-400"/><p className={`${T} font-semibold`}>Tout est en ordre !</p><p className={M}>Aucune action recommandée.</p></div>
            ):actions.map((a,i)=>(
              <motion.div key={a.id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*.04}} whileHover={{scale:1.005}} className={`${C} p-4`}>
                <div className="flex items-start gap-4">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark?'bg-white/[0.06]':'bg-gray-100'}`}><span className={`text-xs font-bold ${M}`}>#{i+1}</span></div>
                  <div className="text-2xl flex-shrink-0 mt-0.5">{a.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`${T} font-semibold text-sm`}>{a.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${PS[a.priority]}`}>{PL[a.priority]}</span>
                    </div>
                    <p className={`${S} text-xs mb-1`}>{a.description}</p>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Building2 className={`w-3 h-3 ${M}`}/><span className={`${M} text-xs`}>{a.propertyName}</span>
                      <span className={`${M} text-xs`}>·</span><Euro className={`w-3 h-3 ${M}`}/><span className="text-xs text-emerald-400 font-medium">{a.impact}</span>
                    </div>
                    {a.insight&&<div className={`${SC} px-3 py-2 flex items-start gap-2 mt-2`}><Brain className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5"/><p className={`text-xs ${S}`}>{a.insight}</p></div>}
                  </div>
                  <div className={`flex-shrink-0 px-3 py-1.5 rounded-xl ${isDark?'bg-emerald-900/30 border border-emerald-500/20':'bg-emerald-50 border border-emerald-200'}`}>
                    <div className="flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5 text-emerald-400"/><span className="text-xs font-bold text-emerald-400">+{a.impactValue}€</span></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* PRICING */}
        {tab==='pricing'&&(
          <motion.div key="pr" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="space-y-4">
            <div className={`${C} p-4 flex items-center gap-3`}><Info className="w-5 h-5 text-blue-400 flex-shrink-0"/><p className={`${S} text-sm`}>Tarifs calculés sur : saisonnalité · occupation réelle · vélocité de réservation · qualité des avis.</p></div>
            <div className={`${C} p-5`}>
              <h3 className={`${T} font-semibold text-sm mb-4`}>Comparaison tarif actuel vs recommandé</h3>
              <div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={pricing.map(p=>({name:p.propertyName.split(' ').slice(0,2).join(' '),actuel:p.currentPrice,recommandé:p.suggestedPrice}))}><CartesianGrid strokeDasharray="3 3" stroke={isDark?'rgba(255,255,255,0.05)':'#f0f0f0'}/><XAxis dataKey="name" tick={{fill:isDark?'rgba(255,255,255,0.4)':'#9ca3af',fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:isDark?'rgba(255,255,255,0.4)':'#9ca3af',fontSize:11}} axisLine={false} tickLine={false} unit="€"/><Tooltip {...TC} formatter={(v:unknown)=>[`${v}€`]}/><Bar dataKey="actuel" fill="#6b7280" radius={[4,4,0,0]}/><Bar dataKey="recommandé" fill="#8b5cf6" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pricing.map((o,i)=>(
                <motion.div key={o.propertyId} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*.06}} whileHover={{scale:1.02}} className={`${C} p-5`}>
                  <div className="flex items-start justify-between mb-3">
                    <div><p className={`${T} font-semibold text-sm`}>{o.propertyName}</p><p className={`${M} text-xs`}>{o.period}</p></div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${o.confidence==='high'?'bg-emerald-500/15 text-emerald-400 border-emerald-500/30':o.confidence==='medium'?'bg-amber-500/15 text-amber-400 border-amber-500/30':'bg-gray-500/15 text-gray-400 border-gray-500/30'}`}>{o.confidence==='high'?'✓ Haute':o.confidence==='medium'?'~ Moyenne':'? Limitée'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${o.demandSignal==='hot'?'bg-red-500/15 text-red-400':o.demandSignal==='warm'?'bg-orange-500/15 text-orange-400':'bg-blue-500/15 text-blue-400'}`}>{o.demandSignal==='hot'?'🔥 Forte':o.demandSignal==='warm'?'📈 Modérée':'❄️ Faible'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mb-3">
                    <div className={`${SC} px-3 py-2 flex-1 text-center`}><p className={`${M} text-xs`}>Actuel</p><p className={`${T} font-bold text-lg`}>{o.currentPrice}€</p></div>
                    <div className="flex-shrink-0">{o.delta>=0?<ArrowUpRight className="w-5 h-5 text-emerald-400"/>:<ArrowDownRight className="w-5 h-5 text-amber-400"/>}</div>
                    <div className={`px-3 py-2 flex-1 text-center rounded-xl border ${o.delta>=0?'bg-emerald-900/20 border-emerald-500/30':'bg-amber-900/20 border-amber-500/30'}`}><p className={`text-xs ${o.delta>=0?'text-emerald-400':'text-amber-400'}`}>Recommandé</p><p className={`font-bold text-lg ${o.delta>=0?'text-emerald-400':'text-amber-400'}`}>{o.suggestedPrice}€</p></div>
                  </div>
                  <div className={`${SC} px-3 py-2 flex items-center gap-2 mb-2`}><Target className="w-3.5 h-3.5 text-violet-400 flex-shrink-0"/><p className={`${S} text-xs flex-1`}>{o.reason}</p><span className={`text-xs font-bold flex-shrink-0 ${o.delta>=0?'text-emerald-400':'text-amber-400'}`}>{o.delta>=0?'+':''}{o.deltaPct}%</span></div>
                  <div className="flex items-center gap-2"><span className={`${M} text-xs w-28`}>Élasticité demande</span><div className={`flex-1 h-1.5 rounded-full ${isDark?'bg-white/10':'bg-gray-100'}`}><div className="h-full rounded-full bg-violet-500" style={{width:`${o.elasticity}%`}}/></div><span className="text-xs text-violet-400 w-8 text-right">{o.elasticity}%</span></div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* RISK */}
        {tab==='risk'&&(
          <motion.div key="rk" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="space-y-3">
            <div className={`${C} p-4 flex items-center gap-3`}><Flame className="w-5 h-5 text-red-400 flex-shrink-0"/><p className={`${S} text-sm`}><strong className={T}>Moteur de risque d&apos;annulation</strong> — 6 facteurs analysés : historique voyageur · délai · durée · note · paiement · historique du bien.</p></div>
            {risks.length===0?(
              <div className={`${C} p-10 flex flex-col items-center gap-3`}><CheckCircle className="w-12 h-12 text-emerald-400"/><p className={`${T} font-semibold`}>Aucun risque détecté</p><p className={M}>Toutes les réservations à venir semblent fiables.</p></div>
            ):risks.map((r,i)=>{
              const bk=bookings.find(b=>b.id===r.bookingId);
              const pp=properties.find(p=>p.id===r.propertyId);
              return(
                <motion.div key={r.bookingId} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*.05}} whileHover={{scale:1.005}} className={`${C} p-4`}>
                  <div className="flex items-start gap-4">
                    <div className="relative flex-shrink-0">
                      <svg width="52" height="52" viewBox="0 0 52 52"><circle cx="26" cy="26" r="20" fill="none" stroke={isDark?'rgba(255,255,255,0.08)':'#e5e7eb'} strokeWidth="5"/><circle cx="26" cy="26" r="20" fill="none" stroke={rc(r.riskScore)} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(r.riskScore/100)*125.6} 125.6`} transform="rotate(-90 26 26)"/></svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{color:rc(r.riskScore)}}>{r.riskScore}%</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className={`${T} font-semibold text-sm`}>{r.guestName}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${r.riskScore>=70?PS.critical:r.riskScore>=40?PS.high:PS.medium}`}>{r.riskScore>=70?'Risque élevé':r.riskScore>=40?'Risque modéré':'Risque faible'}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Building2 className={`w-3 h-3 ${M}`}/><span className={`${M} text-xs`}>{pp?.name}</span>
                        <span className={`${M} text-xs`}>·</span><span className={`${M} text-xs`}>Check-in {new Date(r.checkIn).toLocaleDateString('fr-FR')}</span>
                        {bk&&<><span className={`${M} text-xs`}>·</span><span className="text-xs text-emerald-400">{bk.totalPrice}€</span></>}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {r.factors.map((f,fi)=><span key={fi} className={`text-xs px-2 py-0.5 rounded-lg ${isDark?'bg-white/[0.06] text-white/60':'bg-gray-100 text-gray-500'}`}>{f}</span>)}
                      </div>
                      <div className={`${SC} px-3 py-2 flex items-center gap-2`}><Brain className="w-3.5 h-3.5 text-violet-400 flex-shrink-0"/><p className={`text-xs ${S}`}>{r.riskScore>=70?'Contactez ce voyageur immédiatement — vérifiez le paiement et confirmez l\'intention.':'Envoyez un message de bienvenue proactif pour renforcer l\'engagement.'}</p></div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* PATTERNS */}
        {tab==='patterns'&&(
          <motion.div key="pt" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="space-y-4">
            <div className={`${C} p-4 flex items-center gap-3`}><Users className="w-5 h-5 text-violet-400 flex-shrink-0"/><p className={`${S} text-sm`}><strong className={T}>{patterns.total} réservations</strong> analysées pour {patterns.name||'—'}. Cliquez une carte Scores pour changer de bien.</p></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className={`${C} p-5`}>
                <div className="flex items-center gap-2 mb-4"><Star className="w-4 h-4 text-violet-400"/><h3 className={`${T} font-semibold text-sm`}>Jour d&apos;arrivée</h3></div>
                <div className="h-44"><ResponsiveContainer width="100%" height="100%"><BarChart data={patterns.dow} layout="vertical"><XAxis type="number" tick={{fill:isDark?'rgba(255,255,255,0.4)':'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="label" tick={{fill:isDark?'rgba(255,255,255,0.5)':'#6b7280',fontSize:11}} axisLine={false} tickLine={false} width={28}/><Tooltip {...TC} formatter={(v:unknown)=>[`${v} rés.`]}/><Bar dataKey="count" radius={[0,4,4,0]}>{patterns.dow.map((_,i)=><Cell key={i} fill={i===5||i===6?'#8b5cf6':'#6b7280'}/>)}</Bar></BarChart></ResponsiveContainer></div>
                <p className={`${M} text-xs mt-2`}>💡 Ven/Sam = arrivées WE → prix premium possible</p>
              </div>
              <div className={`${C} p-5`}>
                <div className="flex items-center gap-2 mb-4"><Target className="w-4 h-4 text-violet-400"/><h3 className={`${T} font-semibold text-sm`}>Délai de réservation</h3></div>
                <div className="h-44"><ResponsiveContainer width="100%" height="100%"><BarChart data={patterns.lt}><CartesianGrid strokeDasharray="3 3" stroke={isDark?'rgba(255,255,255,0.05)':'#f0f0f0'}/><XAxis dataKey="label" tick={{fill:isDark?'rgba(255,255,255,0.4)':'#9ca3af',fontSize:9}} axisLine={false} tickLine={false}/><YAxis tick={{fill:isDark?'rgba(255,255,255,0.4)':'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip {...TC} formatter={(v:unknown)=>[`${v} rés.`]}/><Bar dataKey="count" fill="#a78bfa" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
                <p className={`${M} text-xs mt-2`}>💡 Majorité &lt;7j → adaptez vos conditions annulation</p>
              </div>
              <div className={`${C} p-5`}>
                <div className="flex items-center gap-2 mb-4"><Award className="w-4 h-4 text-violet-400"/><h3 className={`${T} font-semibold text-sm`}>Durée de séjour</h3></div>
                <div className="h-44"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={patterns.sl} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={55} paddingAngle={3}>{patterns.sl.map((_,i)=><Cell key={i} fill={['#8b5cf6','#a78bfa','#6366f1','#7c3aed','#c4b5fd','#ddd6fe'][i%6]}/>)}</Pie><Tooltip {...TC} formatter={(v:unknown)=>[`${v} rés.`]}/></PieChart></ResponsiveContainer></div>
                <p className={`${M} text-xs mt-2`}>💡 Durée optimale : {scores.find(s=>s.propertyId===(selId??properties[0]?.id))?.optimalStay||3} nuits</p>
              </div>
            </div>
            <div className={`${C} p-5`}>
              <div className="flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-violet-400"/><h3 className={`${T} font-semibold text-sm`}>Activité mensuelle — Réservations & Revenus</h3></div>
              <div className="h-48"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" stroke={isDark?'rgba(255,255,255,0.05)':'#f0f0f0'}/><XAxis dataKey="month" tick={{fill:isDark?'rgba(255,255,255,0.4)':'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/><YAxis yAxisId="l" tick={{fill:isDark?'rgba(255,255,255,0.4)':'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/><YAxis yAxisId="r" orientation="right" tick={{fill:isDark?'rgba(255,255,255,0.4)':'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/><Tooltip {...TC} formatter={(v:unknown,n:unknown)=>[n==='bk'?`${v} rés.`:`${v}€`,n==='bk'?'Réservations':'Revenus']}/><Line yAxisId="l" type="monotone" dataKey="rev" stroke="#8b5cf6" strokeWidth={2} dot={false}/><Line yAxisId="r" type="monotone" dataKey="bk" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 3"/></LineChart></ResponsiveContainer></div>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-violet-500 rounded"/><span className={`${M} text-xs`}>Revenus (€)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-amber-500 rounded"/><span className={`${M} text-xs`}>Réservations</span></div>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
