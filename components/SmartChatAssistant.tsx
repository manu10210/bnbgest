'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Send, AlertTriangle, Euro, Calendar, Users, Star,
  ChevronRight, RefreshCw, Copy, Check,
  MessageCircle, Minimize2, Maximize2, Mic, MicOff,
  ThumbsUp, ThumbsDown, Expand, Shrink,
} from 'lucide-react';
import { useBNB } from '../contexts/BNBContext';
import { useTheme } from '../contexts/ThemeContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: QuickAction[];
  feedback?: 'up' | 'down' | null;
  streaming?: boolean;
}
interface QuickAction { label: string; query: string; icon: string; }

function uid() { return Math.random().toString(36).slice(2); }
function fdate(d: string) { return new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'long'}); }
function fdates(d: string) { return new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}); }
function ddays(a: string, b: string) { return Math.max(0,Math.ceil((new Date(b).getTime()-new Date(a).getTime())/86400000)); }
function euro(n: number) { return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n); }
function pct(n: number, total: number) { return total>0?Math.round((n/total)*100):0; }
function norm(s: string) { return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,''); }

const SEASON: Record<number,number>={0:.75,1:.80,2:.90,3:1.00,4:1.05,5:1.15,6:1.30,7:1.35,8:1.20,9:1.05,10:.85,11:.80};
const MFR=['janvier','fevrier','mars','avril','mai','juin','juillet','aout','septembre','octobre','novembre','decembre'];
const MFRD=['janvier','f\u00e9vrier','mars','avril','mai','juin','juillet','ao\u00fbt','septembre','octobre','novembre','d\u00e9cembre'];

const SUGGESTIONS: QuickAction[] = [
  {label:'R\u00e9sum\u00e9 du mois',query:'Fais-moi un r\u00e9sum\u00e9 de ce mois',icon:'\u{1F4CA}'},
  {label:'Revenus annuels',query:'Quels sont mes revenus cette ann\u00e9e ?',icon:'\u{1F4B6}'},
  {label:'Prochains check-ins',query:'Qui arrive dans les 7 prochains jours ?',icon:'\u{1F511}'},
  {label:'Prochains d\u00e9parts',query:'Qui part dans les 7 prochains jours ?',icon:'\u{1F9F3}'},
  {label:'Probl\u00e8mes urgents',query:'Quels sont mes probl\u00e8mes urgents ?',icon:'\u{1F6A8}'},
  {label:'Meilleur bien',query:'Quelle est ma meilleure propri\u00e9t\u00e9 ?',icon:'\u{1F3C6}'},
  {label:'Avis sans r\u00e9ponse',query:"Quels avis n\u00e9gatifs n'ont pas encore de r\u00e9ponse ?",icon:'\u2B50'},
  {label:'Conseils tarifs',query:'Dois-je ajuster mes tarifs ce mois-ci ?',icon:'\u{1F4A1}'},
  {label:'M\u00e9nage \u00e0 planifier',query:'Quels m\u00e9nages sont \u00e0 planifier cette semaine ?',icon:'\u{1F9F9}'},
  {label:'Stock critique',query:'Quels articles sont en rupture de stock ?',icon:'\u{1F4E6}'},
  {label:'Cr\u00e9neaux vides',query:'Quels cr\u00e9neaux sont vides dans les 30 prochains jours ?',icon:'\u{1F4C5}'},
  {label:'Projections 4 mois',query:'Quelles sont mes projections pour les 4 prochains mois ?',icon:'\u{1F4C8}'},
];

type BNBCtx = ReturnType<typeof useBNB>;

function buildCtx(bnb: BNBCtx) {
  const {properties,bookings,guests,maintenanceTasks,reviews,inventory,getOccupancyRate,getRevenueByProperty}=bnb;
  const now=new Date(),today=now.toISOString().split('T')[0],mo=now.getMonth(),yr=now.getFullYear();
  const mStart=`${yr}-${String(mo+1).padStart(2,'0')}-01`;
  const mEnd=`${yr}-${String(mo+1).padStart(2,'0')}-${new Date(yr,mo+1,0).getDate()}`;
  const yStart=`${yr}-01-01`,yEnd=`${yr}-12-31`;
  const d30=new Date(now.getTime()-30*86400000).toISOString().split('T')[0];
  const d7f=new Date(now.getTime()+7*86400000).toISOString().split('T')[0];
  const d30f=new Date(now.getTime()+30*86400000).toISOString().split('T')[0];
  const revMonth=properties.reduce((s,p)=>s+getRevenueByProperty(p.id,mStart,mEnd),0);
  const revYear=properties.reduce((s,p)=>s+getRevenueByProperty(p.id,yStart,yEnd),0);
  const pm=mo===0?11:mo-1,py=mo===0?yr-1:yr;
  const pmS=`${py}-${String(pm+1).padStart(2,'0')}-01`,pmE=`${py}-${String(pm+1).padStart(2,'0')}-${new Date(py,pm+1,0).getDate()}`;
  const revPrevMonth=properties.reduce((s,p)=>s+getRevenueByProperty(p.id,pmS,pmE),0);
  const avgOcc=properties.length>0?Math.round(properties.reduce((s,p)=>s+getOccupancyRate(p.id,d30,today),0)/properties.length):0;
  const upcoming7=bookings.filter(b=>b.checkIn>=today&&b.checkIn<=d7f&&(b.status==='confirmed'||b.status==='completed'));
  const upcoming30=bookings.filter(b=>b.checkIn>=today&&b.checkIn<=d30f&&(b.status==='confirmed'||b.status==='completed'));
  const checkouts7=bookings.filter(b=>b.checkOut>=today&&b.checkOut<=d7f&&(b.status==='confirmed'||b.status==='completed'));
  const activeBookings=bookings.filter(b=>b.checkIn<=today&&b.checkOut>=today&&b.status==='confirmed');
  const pendingBookings=bookings.filter(b=>b.status==='pending');
  const totalBookings=bookings.filter(b=>b.status==='confirmed'||b.status==='completed').length;
  const urgentTasks=maintenanceTasks.filter(t=>t.status!=='completed'&&t.priority==='urgent');
  const overdueTasks=maintenanceTasks.filter(t=>t.status!=='completed'&&new Date(t.scheduledDate)<now);
  const avgRating=reviews.length>0?(reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1):'0';
  const unanswered=reviews.filter(r=>!r.response&&r.rating<=3);
  const recentRevs=reviews.filter(r=>r.createdAt>=d30).slice(0,5);
  const lowStock=inventory.filter(i=>i.quantity<=i.minimumQuantity);
  const propPerf=properties.map(p=>({...p,revMonth:getRevenueByProperty(p.id,mStart,mEnd),revYear:getRevenueByProperty(p.id,yStart,yEnd),occ:Math.round(getOccupancyRate(p.id,d30,today))})).sort((a,b)=>b.revMonth-a.revMonth);
  const sf=SEASON[mo];
  const seasonAdvice=sf>=1.15?'haute saison':sf<=0.85?'basse saison':'saison intermediaire';
  return {now,today,mo,yr,mStart,mEnd,yStart,yEnd,d30,d7f,d30f,revMonth,revYear,revPrevMonth,avgOcc,upcoming7,upcoming30,checkouts7,activeBookings,pendingBookings,totalBookings,urgentTasks,overdueTasks,avgRating,unanswered,recentRevs,lowStock,propPerf,sf,seasonAdvice,properties,bookings,guests,maintenanceTasks,reviews,inventory,getRevenueByProperty,getOccupancyRate};
}
type Ctx=ReturnType<typeof buildCtx>;

function respond(query: string, ctx: Ctx): {content:string;actions?:QuickAction[]} {
  const q=norm(query);
  const {revMonth,revYear,revPrevMonth,avgOcc,upcoming7,upcoming30,checkouts7,activeBookings,pendingBookings,urgentTasks,overdueTasks,avgRating,unanswered,recentRevs,lowStock,propPerf,sf,seasonAdvice,mo,yr,today,properties,bookings,reviews,maintenanceTasks,getRevenueByProperty}=ctx;

  if(/resum|bilan|situation|tableau/.test(q)){
    const delta=revPrevMonth>0?Math.round(((revMonth-revPrevMonth)/revPrevMonth)*100):0;
    const alerts=[urgentTasks.length>0&&`* ${urgentTasks.length} maintenance urgente`,unanswered.length>0&&`* ${unanswered.length} avis negatif sans reponse`,lowStock.length>0&&`* ${lowStock.length} article en rupture`,pendingBookings.length>0&&`* ${pendingBookings.length} reservation en attente`].filter(Boolean);
    return {content:`**Bilan ${MFRD[mo]} ${yr}**\n\n**Revenus du mois :** ${euro(revMonth)} (${delta>=0?'+':''}${delta}% vs mois precedent)\n**Revenus annuels :** ${euro(revYear)}\n**Taux d occupation :** ${avgOcc}%\n**Note moyenne :** ${avgRating}*\n**Biens actifs :** ${properties.filter(p=>p.status==='active').length}/${properties.length}\n**Sejours en cours :** ${activeBookings.length}\n**Arrivees dans 30j :** ${upcoming30.length}\n**Departs dans 7j :** ${checkouts7.length}\n\n${alerts.length>0?`**Points d attention :**\n${alerts.join('\n')}`:'**Aucun point critique detecte.**'}`,actions:[{label:'Revenus',query:'Quels sont mes revenus cette annee ?',icon:'EUR'},{label:'Urgences',query:'Quels sont mes problemes urgents ?',icon:'!'},{label:'Check-ins',query:'Qui arrive dans les 7 prochains jours ?',icon:'KEY'},{label:'Tarifs',query:'Dois-je ajuster mes tarifs ce mois-ci ?',icon:'TIP'}]};
  }
  if(/revenu|chiffre|argent|gagn|recette|financ/.test(q)){
    const monthly=Array.from({length:12},(_,i)=>{const s=`${yr}-${String(i+1).padStart(2,'0')}-01`,e=`${yr}-${String(i+1).padStart(2,'0')}-${new Date(yr,i+1,0).getDate()}`;return {m:MFRD[i],v:Math.round(properties.reduce((sum,p)=>sum+getRevenueByProperty(p.id,s,e),0))};});
    const bestMonth=monthly.reduce((a,b)=>b.v>a.v?b:a,{m:'',v:0});
    const details=propPerf.map(p=>`* **${p.name}** : ${euro(p.revMonth)}/mois | ${euro(p.revYear)} annuel | ${p.occ}% occ`).join('\n');
    return {content:`**Revenus ${yr}**\n\n**Total annuel :** ${euro(revYear)}\n**Ce mois (${MFRD[mo]}) :** ${euro(revMonth)}\n**Mois precedent :** ${euro(revPrevMonth)}\n**Meilleur mois :** ${bestMonth.m} -- ${euro(bestMonth.v)}\n\n**Detail par bien :**\n${details||'Aucun bien configure'}\n\n${propPerf[0]?`**MVP :** ${propPerf[0].name} -- ${euro(propPerf[0].revMonth)}/mois`:''}`,actions:[{label:'Tarifs',query:'Dois-je ajuster mes tarifs ce mois-ci ?',icon:'TIP'},{label:'Projections',query:'Quelles sont mes projections pour les 4 prochains mois ?',icon:'CHART'}]};
  }
  if(/occupation|taux|remplissage/.test(q)&&!/creneau|vide/.test(q)){
    const details=propPerf.map(p=>{const n=Math.round(p.occ/10),bar='\u2588'.repeat(n)+'\u2591'.repeat(10-n),badge=p.occ>=80?'HOT':p.occ>=60?'OK':'LOW';return `* ${badge} **${p.name}** : ${bar} ${p.occ}%`;}).join('\n');
    const advice=avgOcc>=80?'Excellent ! Pensez a augmenter vos tarifs.':avgOcc>=60?'Bonne occupation, objectif 75-85%.':'Faible -- envisagez une promotion.';
    return {content:`**Occupation -- 30 derniers jours**\n\n**Moyenne :** ${avgOcc}%\n${advice}\n\n${details||'Aucun bien'}\n\n**En cours :** ${activeBookings.length} sejour\n**Prochaines 30j :** ${upcoming30.length} arrivee`,actions:[{label:'Creneaux vides',query:'Quels creneaux sont vides dans les 30 prochains jours ?',icon:'CAL'}]};
  }
  if(/arriv|check.?in|checkin/.test(q)&&!/part|depart|check.?out/.test(q)){
    if(!upcoming7.length) return {content:`**Arrivees -- 7 prochains jours**\n\nAucune arrivee prevue.\n\n${upcoming30.length>0?`Prochaines dans les 30j : **${upcoming30.length}**.`:'Activez une promotion !'}`,actions:[{label:'Creneaux vides',query:'Quels creneaux sont vides dans les 30 prochains jours ?',icon:'CAL'}]};
    const list=upcoming7.map(b=>{const prop=properties.find(p=>p.id===b.propertyId),nights=ddays(b.checkIn,b.checkOut);return `* **${b.guestInfo?.name||'Voyageur'}** -> ${prop?.name||'?'} | ${fdate(b.checkIn)} | ${nights}n | ${euro(b.totalPrice)}`;}).join('\n');
    return {content:`**Arrivees -- 7 prochains jours**\n\n${upcoming7.length} arrivee :\n\n${list}`,actions:[{label:'Departs',query:'Qui part dans les 7 prochains jours ?',icon:'BAG'},{label:'Menage',query:'Quels menages sont a planifier cette semaine ?',icon:'CLEAN'}]};
  }
  if(/part|depart|check.?out|quitte|libere/.test(q)){
    if(!checkouts7.length) return {content:`**Departs -- 7 prochains jours**\n\nAucun depart prevu.`,actions:[{label:'Check-ins',query:'Qui arrive dans les 7 prochains jours ?',icon:'KEY'}]};
    const list=checkouts7.map(b=>{const prop=properties.find(p=>p.id===b.propertyId),nights=ddays(b.checkIn,b.checkOut),nextIn=upcoming30.find(nb=>nb.propertyId===b.propertyId&&nb.checkIn>=b.checkOut),gap=nextIn?ddays(b.checkOut,nextIn.checkIn):null;return `* **${b.guestInfo?.name||'Voyageur'}** <- ${prop?.name||'?'} | ${fdate(b.checkOut)} | ${nights}n${gap!==null?` | ${gap}j avant prochain`:''}`;}).join('\n');
    return {content:`**Departs -- 7 prochains jours**\n\n${checkouts7.length} depart :\n\n${list}\n\nPensez a planifier le menage.`,actions:[{label:'Menage',query:'Quels menages sont a planifier cette semaine ?',icon:'CLEAN'},{label:'Check-ins',query:'Qui arrive dans les 7 prochains jours ?',icon:'KEY'}]};
  }
  if(/menage|nettoyage|nettoy|cleaning|linge|propre/.test(q)){
    const nc=checkouts7.map(b=>{const prop=properties.find(p=>p.id===b.propertyId),nextIn=upcoming30.find(nb=>nb.propertyId===b.propertyId&&nb.checkIn>b.checkOut),gap=nextIn?ddays(b.checkOut,nextIn.checkIn):99;return {name:prop?.name||'?',checkOut:b.checkOut,nextIn:nextIn?.checkIn,gap,urgent:gap<=1};}).sort((a,b)=>a.gap-b.gap);
    if(!nc.length) return {content:`**Menages -- 7 prochains jours**\n\nAucun depart cette semaine.`,actions:[{label:'Departs',query:'Qui part dans les 7 prochains jours ?',icon:'BAG'}]};
    const uc=nc.filter(c=>c.urgent).length;
    const list=nc.map(c=>`* ${c.urgent?'URGENT':'OK'} **${c.name}** -- depart ${fdates(c.checkOut)}${c.nextIn?` | prochain ${fdates(c.nextIn)} (${c.gap}j)`:' | pas de prochain immediat'}`).join('\n');
    return {content:`**Menages -- 7 prochains jours**\n\n${nc.length} menage :\n\n${list}\n\n${uc>0?`${uc} urgent(s) -- moins de 24h entre depart et arrivee !`:'Vous avez le temps.'}`,actions:[{label:'Inventaire',query:'Quels articles sont en rupture de stock ?',icon:'BOX'}]};
  }
  if(/creneau|vide|vacance|inoccup|dispo/.test(q)){
    const gaps=properties.map(p=>{const pb=bookings.filter(b=>b.propertyId===p.id&&b.checkIn>=today&&b.checkIn<=ctx.d30f&&(b.status==='confirmed'||b.status==='completed')),cov=pb.reduce((s,b)=>s+ddays(b.checkIn,b.checkOut),0);return {name:p.name,vac:Math.max(0,30-cov),price:p.price};}).filter(g=>g.vac>=3);
    if(!gaps.length) return {content:'**Creneaux disponibles**\n\nToutes vos proprietes sont bien remplies !'};
    const total=gaps.reduce((s,g)=>s+g.vac*g.price*0.75,0);
    const list=gaps.map(g=>`* **${g.name}** : ${g.vac}j vides -> manque ~${euro(g.vac*g.price*0.75)}`).join('\n');
    return {content:`**Creneaux vides -- 30 prochains jours**\n\n${list}\n\n**Manque a gagner : ${euro(total)}**\n\nUne promo -10% pourrait generer ~${euro(total*0.9)}.`,actions:[{label:'Tarifs',query:'Dois-je ajuster mes tarifs ce mois-ci ?',icon:'TIP'}]};
  }
  if(/urgent|probleme|alerte|critique|attention/.test(q)){
    const issues:string[]=[];
    if(urgentTasks.length) issues.push(`** ${urgentTasks.length} maintenance urgente** : ${urgentTasks.map(t=>t.title).join(', ')}`);
    if(overdueTasks.length) issues.push(`** ${overdueTasks.length} tache en retard**`);
    if(unanswered.length) issues.push(`** ${unanswered.length} avis negatif sans reponse**`);
    if(lowStock.filter(i=>i.quantity===0).length) issues.push(`** ${lowStock.filter(i=>i.quantity===0).length} article en rupture totale**`);
    if(pendingBookings.length) issues.push(`** ${pendingBookings.length} reservation en attente**`);
    if(!issues.length) return {content:'**Aucun probleme urgent !**\n\nTout est sous controle.',actions:[{label:'Resume',query:'Fais-moi un resume de ce mois',icon:'CHART'}]};
    return {content:`**Points d attention -- ${issues.length} element**\n\n${issues.join('\n\n')}`,actions:[{label:'Resume',query:'Fais-moi un resume de ce mois',icon:'CHART'},{label:'Avis',query:"Quels avis negatifs n'ont pas encore de reponse ?",icon:'STAR'}]};
  }
  if(/meilleur|top|performan|classement/.test(q)){
    if(!propPerf.length) return {content:'Aucune propriete trouvee.'};
    const list=propPerf.map((p,i)=>`${i===0?'1er':i===1?'2eme':'3eme+'} **${p.name}** : ${euro(p.revMonth)}/mois | ${p.occ}% occ | ${euro(p.revYear)} annuel`).join('\n');
    return {content:`**Classement -- ${MFRD[mo]} ${yr}**\n\n${list}\n\n**MVP :** ${propPerf[0].name}${propPerf.length>1&&propPerf[propPerf.length-1].revMonth<propPerf[0].revMonth/3?`\n\n${propPerf[propPerf.length-1].name} sous-performe. Revoyez la strategie tarifaire.`:''}`,actions:[{label:'Tarifs',query:'Dois-je ajuster mes tarifs ce mois-ci ?',icon:'TIP'}]};
  }
  if(/avis|note|review|reputation|commentaire/.test(q)&&!/sans.reponse|repondr/.test(q)){
    const five=reviews.filter(r=>r.rating===5).length,four=reviews.filter(r=>r.rating>=4).length,bad=reviews.filter(r=>r.rating<=3);
    const recent=recentRevs.map(r=>{const p=properties.find(pp=>pp.id===r.propertyId);return `* **${r.rating}*** -- ${p?.name||'?'} | "${r.comment?.slice(0,60)}"${r.response?' OK':' EN ATTENTE'}`;}).join('\n');
    return {content:`**Reputation**\n\n**Note moyenne :** ${avgRating}* sur ${reviews.length} avis\n**5* :** ${five} (${pct(five,reviews.length)}%)\n**4+* :** ${four} (${pct(four,reviews.length)}%)\n**<=3* :** ${bad.length} dont ${unanswered.length} sans reponse\n\n${recent||'Aucun avis recent.'}${unanswered.length?`\n\n${unanswered.length} avis sans reponse -- repondre en 48h booste la note.`:''}`,actions:unanswered.length?[{label:'Avis sans reponse',query:"Quels avis negatifs n'ont pas encore de reponse ?",icon:'STAR'}]:[]};
  }
  if(/sans.reponse|repondr/.test(q)){
    if(!unanswered.length) return {content:'Tous les avis negatifs ont une reponse !'};
    const list=unanswered.map(r=>{const p=properties.find(pp=>pp.id===r.propertyId);return `* **${r.rating}*** -- ${p?.name} | ${fdates(r.createdAt)}\n  "${r.comment?.slice(0,80)}"`;}).join('\n\n');
    return {content:`**${unanswered.length} avis sans reponse**\n\n${list}\n\nRepondez avec empathie en moins de 48h.`};
  }
  if(/tarif|prix|ajust|augment|saisonn/.test(q)){
    const advice=propPerf.map(p=>{const s=Math.round((p.price*sf)/5)*5,d=s-p.price;let rec='';if(p.occ>80&&d>0)rec=`Forte demande -- montez a ${s}EUR (+${d}EUR)`;else if(p.occ<40)rec=`Faible demande -- envisagez ${Math.round(s*0.92/5)*5}EUR`;else if(d>0)rec=`${seasonAdvice} -- ${s}EUR recommande (+${d}EUR)`;else rec=`Basse saison -- ${s}EUR recommande (${d}EUR)`;return `* **${p.name}** (${p.price}EUR/nuit) -> ${rec}`;}).join('\n');
    return {content:`**Tarifs -- ${MFRD[mo]} (x${sf.toFixed(2)})**\n\nNous sommes en **${seasonAdvice}**.\n\n${advice||'Aucun bien configure'}\n\nRegle : Juil-Aout +15-30% | Basse saison : occupation > marge.`,actions:[{label:'Occupation',query:"Quel est mon taux d'occupation actuel ?",icon:'CAL'}]};
  }
  if(/mainten|reparat|tache|travaux/.test(q)){
    const all=maintenanceTasks.filter(t=>t.status!=='completed');
    if(!all.length) return {content:'**Maintenance**\n\nAucune tache en cours !'};
    const list=all.slice(0,8).map(t=>{const p=properties.find(pp=>pp.id===t.propertyId),late=new Date(t.scheduledDate)<new Date()?` RETARD (${ddays(t.scheduledDate,today)}j)`:'';return `* ${t.priority==='urgent'?'URGENT':t.priority==='high'?'HIGH':'OK'} **${t.title}** -- ${p?.name||'?'}${late}`;}).join('\n');
    return {content:`**Maintenance -- ${all.length} tache en cours**\n\n${list}${urgentTasks.length?`\n\n${urgentTasks.length} urgente(s) -- traiter immediatement.`:''}`};
  }
  if(/inventor|stock|rupture|fournitur|article|materiel/.test(q)){
    if(!lowStock.length) return {content:'**Inventaire**\n\nTous les articles sont bien approvisionnes !'};
    const list=lowStock.map(i=>{const p=properties.find(pp=>pp.id===i.propertyId);return `* ${i.quantity===0?'RUPTURE':'FAIBLE'} **${i.name}** -- ${p?.name||'?'} : ${i.quantity}/${i.minimumQuantity}`;}).join('\n');
    return {content:`**Stock critique -- ${lowStock.length} article**\n\n${list}\n\nArticles manquants = avis negatifs.`};
  }
  if(/voyageur|client|guest|locataire/.test(q)){
    const gs=ctx.guests,top=[...gs].sort((a,b)=>b.totalBookings-a.totalBookings).slice(0,5),vips=gs.filter(g=>g.totalBookings>=3);
    return {content:`**Voyageurs**\n\n**Total :** ${gs.length}\n**VIP (3+ sejours) :** ${vips.length}\n\n**Top :**\n${top.map(g=>`* **${g.name}** -- ${g.totalBookings} sejour${g.rating?` | ${g.rating}*`:''}`).join('\n')||'Aucun voyageur'}`};
  }
  if(/prevision|projection|prochain.mois|futur|forecast/.test(q)){
    const confirmedRev=upcoming30.reduce((s,b)=>s+b.totalPrice,0);
    const projected=Array.from({length:4},(_,i)=>{const pm=(mo+i+1)%12,py=mo+i+1>11?yr+1:yr,cf=SEASON[pm],base=revMonth>0?revMonth:1000,badge=cf>=1.15?'HOT':cf>=1.0?'UP':'COLD';return `* ${badge} **${MFRD[pm]} ${py}** : ~${euro(Math.round(base*cf))} (x${cf.toFixed(2)})`;});
    return {content:`**Projections -- 4 prochains mois**\n\n${projected.join('\n')}\n\n**Deja confirme 30j :** ${euro(confirmedRev)} (${upcoming30.length} reservation)\n\nProjections indicatives basees sur la saisonnalite.`};
  }
  if(/aide|help|peux.tu|que peux|capacite/.test(q)){
    return {content:`**Ce que je sais analyser :**\n\nResume | Revenus | Occupation\nArrivees | Departs | Menages\nUrgences | Classement | Avis\nTarifs | Maintenance | Inventaire\nPrevisions | Voyageurs`,actions:SUGGESTIONS.slice(0,4)};
  }
  return {content:`Je n ai pas bien compris. Essayez :\n\n* "Resume du mois"\n* "Qui arrive cette semaine ?"\n* "Quels sont mes problemes urgents ?"`,actions:SUGGESTIONS.slice(0,4)};
}

function Markdown({text,isDark}:{text:string;isDark:boolean}){
  const T=isDark?'text-white/90':'text-gray-800',DIM=isDark?'text-white/50':'text-gray-500';
  const renderInline=(raw:string)=>raw.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part,j)=>{
    if(part.startsWith('**')&&part.endsWith('**'))return <strong key={j} className={isDark?'text-white font-semibold':'text-gray-900 font-semibold'}>{part.slice(2,-2)}</strong>;
    if(part.startsWith('*')&&part.endsWith('*'))return <em key={j} className={DIM}>{part.slice(1,-1)}</em>;
    return <span key={j}>{part}</span>;
  });
  return <div className="space-y-1">{text.split('\n').map((line,i)=>{
    if(!line.trim())return <div key={i} className="h-1.5"/>;
    if(line.startsWith('**')&&line.endsWith('**')&&!line.slice(2,-2).includes('**'))return <p key={i} className={`font-bold text-sm mt-1 ${isDark?'text-white':'text-gray-900'}`}>{line.slice(2,-2)}</p>;
    return <p key={i} className={`text-sm leading-relaxed ${T} ${line.startsWith('*')?'pl-1':''}`}>{renderInline(line)}</p>;
  })}</div>;
}

function useStreamText(target:string,active:boolean,speed=14){
  const [displayed,setDisplayed]=useState('');
  useEffect(()=>{if(!active){setDisplayed(target);return;}setDisplayed('');let i=0;const iv=setInterval(()=>{i+=speed;if(i>=target.length){setDisplayed(target);clearInterval(iv);return;}setDisplayed(target.slice(0,i));},16);return ()=>clearInterval(iv);},[target,active]);
  return displayed;
}

function MessageBubble({msg,isStreaming,isDark,copied,onCopy,onSend,onFeedback}:{msg:Message;isStreaming:boolean;isDark:boolean;copied:string|null;onCopy:(id:string,text:string)=>void;onSend:(text:string)=>void;onFeedback:(id:string,v:'up'|'down')=>void;}){
  const displayed=useStreamText(msg.content,isStreaming,14);
  const M=isDark?'text-white/40':'text-gray-400';
  return <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className={`flex gap-3 ${msg.role==='user'?'flex-row-reverse':''}`}>
    <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${msg.role==='assistant'?'bg-gradient-to-br from-violet-500 to-indigo-700':isDark?'bg-white/10':'bg-gray-200'}`}>
      {msg.role==='assistant'?<Brain className="w-4 h-4 text-white"/>:<Users className="w-4 h-4" style={{color:isDark?'rgba(255,255,255,0.5)':'#6b7280'}}/>}
    </div>
    <div className={`max-w-[82%] space-y-2 ${msg.role==='user'?'items-end flex flex-col':''}`}>
      <div className={`px-4 py-3 rounded-2xl ${msg.role==='user'?'bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-tr-sm':isDark?'bg-white/[0.05] border border-white/[0.07] rounded-tl-sm':'bg-gray-50 border border-gray-100 rounded-tl-sm'}`}>
        {msg.role==='assistant'?<><Markdown text={displayed} isDark={isDark}/>{isStreaming&&displayed.length<msg.content.length&&<span className="inline-block w-1.5 h-4 ml-0.5 bg-violet-400 animate-pulse rounded-sm align-middle"/>}</>:<p className="text-sm text-white leading-relaxed">{msg.content}</p>}
      </div>
      {!isStreaming&&msg.actions&&msg.actions.length>0&&<div className="flex flex-wrap gap-1.5 pt-1">{msg.actions.map((a,i)=><button key={i} onClick={()=>onSend(a.query)} className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all hover:scale-105 ${isDark?'bg-white/[0.04] border-white/[0.09] text-white/60 hover:bg-violet-500/20 hover:border-violet-500/40 hover:text-violet-300':'bg-white border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600'}`}><span>{a.label}</span><ChevronRight className="w-3 h-3 opacity-40"/></button>)}</div>}
      <div className={`flex items-center gap-2 ${msg.role==='user'?'justify-end':''}`}>
        <span className={`text-[10px] ${M}`}>{msg.timestamp.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>
        {msg.role==='assistant'&&!isStreaming&&<>
          <button onClick={()=>onCopy(msg.id,msg.content)} className={`${M} hover:text-violet-400 transition-colors`}>{copied===msg.id?<Check className="w-3 h-3 text-emerald-400"/>:<Copy className="w-3 h-3"/>}</button>
          <button onClick={()=>onFeedback(msg.id,'up')} className={`transition-colors ${msg.feedback==='up'?'text-emerald-400':`${M} hover:text-emerald-400`}`}><ThumbsUp className="w-3 h-3"/></button>
          <button onClick={()=>onFeedback(msg.id,'down')} className={`transition-colors ${msg.feedback==='down'?'text-red-400':`${M} hover:text-red-400`}`}><ThumbsDown className="w-3 h-3"/></button>
        </>}
      </div>
    </div>
  </motion.div>;
}

export default function SmartChatAssistant(){
  const bnb=useBNB();
  const {properties,bookings,guests,maintenanceTasks,reviews,inventory}=bnb;
  const {isDark}=useTheme();
  const [messages,setMessages]=useState<Message[]>([]);
  const [input,setInput]=useState('');
  const [loading,setLoading]=useState(false);
  const [copied,setCopied]=useState<string|null>(null);
  const [minimized,setMinimized]=useState(false);
  const [fullscreen,setFullscreen]=useState(false);
  const [listening,setListening]=useState(false);
  const [lastBotId,setLastBotId]=useState<string|null>(null);
  const bottomRef=useRef<HTMLDivElement>(null);
  const inputRef=useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognRef=useRef<any>(null);
  const ctx=useMemo(()=>buildCtx(bnb),[properties,bookings,guests,maintenanceTasks,reviews,inventory]);

  useEffect(()=>{
    const h=new Date().getHours(),greeting=h<18?'Bonjour':'Bonsoir';
    const uc=ctx.urgentTasks.length+ctx.unanswered.length+ctx.lowStock.filter(i=>i.quantity===0).length;
    const id=uid();setLastBotId(id);
    setMessages([{id,role:'assistant',timestamp:new Date(),streaming:true,feedback:null,content:`${greeting} ! Je suis votre **Assistant IA BNB**\n\nDonnees analysees :\n\n* **${properties.length} bien** | **${ctx.totalBookings} reservation** | **${ctx.avgRating}***\n* Revenus ce mois : **${euro(ctx.revMonth)}** | Occupation **${ctx.avgOcc}%**\n* ${uc>0?`${uc} point(s) critique(s) a traiter`:'Aucun probleme critique'}`,actions:SUGGESTIONS.slice(0,4)}]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'});},[messages,loading]);

  const hasVoice=typeof window!=='undefined'&&('webkitSpeechRecognition' in window||'SpeechRecognition' in window);

  const toggleVoice=useCallback(()=>{
    if(!hasVoice)return;
    if(listening){recognRef.current?.stop();setListening(false);return;}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SRClass=(window as any).webkitSpeechRecognition||(window as any).SpeechRecognition;
    const r=new SRClass();r.lang='fr-FR';r.interimResults=false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult=(e:any)=>{setInput(e.results[0][0].transcript);setListening(false);};
    r.onerror=()=>setListening(false);r.onend=()=>setListening(false);
    recognRef.current=r;r.start();setListening(true);
  },[listening,hasVoice]);

  const sendMessage=async(text:string)=>{
    if(!text.trim()||loading)return;
    setInput('');
    setMessages(prev=>[...prev,{id:uid(),role:'user',content:text.trim(),timestamp:new Date()}]);
    setLoading(true);
    await new Promise(r=>setTimeout(r,350+Math.random()*250));
    const res=respond(text.trim(),ctx);
    const botId=uid();setLastBotId(botId);
    setMessages(prev=>[...prev,{id:botId,role:'assistant',content:res.content,timestamp:new Date(),actions:res.actions,streaming:true,feedback:null}]);
    setLoading(false);setTimeout(()=>inputRef.current?.focus(),100);
  };

  const setFeedback=(id:string,v:'up'|'down')=>setMessages(prev=>prev.map(m=>m.id===id?{...m,feedback:m.feedback===v?null:v}:m));
  const copyMsg=(id:string,text:string)=>{navigator.clipboard.writeText(text.replace(/\*\*/g,'').replace(/\*/g,''));setCopied(id);setTimeout(()=>setCopied(null),2000);};
  const resetConv=()=>{setMessages([]);setTimeout(()=>{const id=uid();setLastBotId(id);setMessages([{id,role:'assistant',timestamp:new Date(),streaming:true,feedback:null,content:'Nouvelle conversation. Comment puis-je vous aider ?',actions:SUGGESTIONS.slice(0,4)}]);},80);};

  const C=isDark?'bg-[#141428] border border-white/[0.07] rounded-2xl':'bg-white border border-gray-200 rounded-2xl shadow-sm';
  const SC=isDark?'bg-white/[0.04] border border-white/[0.06] rounded-xl':'bg-gray-50 border border-gray-200 rounded-xl';
  const T=isDark?'text-white':'text-gray-900';
  const M=isDark?'text-white/40':'text-gray-400';
  const S=isDark?'text-white/60':'text-gray-600';
  const chatH=fullscreen?'calc(100vh - 300px)':'60vh';

  return <div className={`space-y-4 ${fullscreen?'fixed inset-0 z-50 p-4 overflow-y-auto bg-black/60 backdrop-blur-sm':''}`}>
    <div className={fullscreen?'max-w-4xl mx-auto':''}>

      {/* HEADER */}
      <motion.div initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} className={`${C} p-5`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Brain className="w-5 h-5 text-white"/>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#141428] animate-pulse block"/>
            </div>
            <div>
              <h1 className={`${T} text-xl font-bold tracking-tight`}>Assistant IA BNB</h1>
              <p className={`${M} text-xs`}>Analyse temps reel | {properties.length} bien{properties.length>1?'s':''} | {ctx.totalBookings} reservations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium ${isDark?'bg-emerald-900/30 border border-emerald-500/20 text-emerald-400':'bg-emerald-50 border border-emerald-200 text-emerald-600'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"/>En ligne
            </span>
            {hasVoice&&<button onClick={toggleVoice} className={`p-2 rounded-xl transition-colors ${listening?'bg-red-500/20 text-red-400 border border-red-500/30':isDark?`bg-white/[0.06] hover:bg-white/10 ${M}`:`bg-gray-100 hover:bg-gray-200 ${M}`}`}>{listening?<MicOff className="w-4 h-4"/>:<Mic className="w-4 h-4"/>}</button>}
            <button onClick={resetConv} className={`p-2 rounded-xl transition-colors ${isDark?`bg-white/[0.06] hover:bg-white/10 ${M}`:`bg-gray-100 hover:bg-gray-200 ${M}`}`}><RefreshCw className="w-4 h-4"/></button>
            <button onClick={()=>setFullscreen(v=>!v)} className={`p-2 rounded-xl transition-colors ${isDark?`bg-white/[0.06] hover:bg-white/10 ${M}`:`bg-gray-100 hover:bg-gray-200 ${M}`}`}>{fullscreen?<Shrink className="w-4 h-4"/>:<Expand className="w-4 h-4"/>}</button>
            <button onClick={()=>setMinimized(v=>!v)} className={`p-2 rounded-xl transition-colors ${isDark?`bg-white/[0.06] hover:bg-white/10 ${M}`:`bg-gray-100 hover:bg-gray-200 ${M}`}`}>{minimized?<Maximize2 className="w-4 h-4"/>:<Minimize2 className="w-4 h-4"/>}</button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[{label:'Revenus du mois',value:euro(ctx.revMonth),icon:<Euro className="w-4 h-4"/>,color:'#22c55e'},{label:'Occupation 30j',value:`${ctx.avgOcc}%`,icon:<Calendar className="w-4 h-4"/>,color:'#8b5cf6'},{label:'Note moyenne',value:`${ctx.avgRating}*`,icon:<Star className="w-4 h-4"/>,color:'#f59e0b'},{label:'Points critiques',value:String(ctx.urgentTasks.length+ctx.unanswered.length),icon:<AlertTriangle className="w-4 h-4"/>,color:ctx.urgentTasks.length+ctx.unanswered.length>0?'#ef4444':'#22c55e'}].map((k,i)=>(
            <div key={i} className={`${SC} p-3 flex items-center gap-2.5`}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{backgroundColor:`${k.color}18`,color:k.color}}>{k.icon}</div>
              <div className="min-w-0"><p className={`${M} text-xs leading-none truncate`}>{k.label}</p><p className="font-bold text-sm mt-0.5 tabular-nums" style={{color:k.color}}>{k.value}</p></div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* CHAT */}
      <AnimatePresence>
        {!minimized&&<motion.div key="chat" initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className={`${C} flex flex-col overflow-hidden`} style={{height:chatH,minHeight:420}}>
          <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide">
            {messages.map(msg=><MessageBubble key={msg.id} msg={msg} isStreaming={msg.id===lastBotId&&(msg.streaming??false)} isDark={isDark} copied={copied} onCopy={copyMsg} onSend={sendMessage} onFeedback={setFeedback}/>)}
            {loading&&<motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center flex-shrink-0"><Brain className="w-4 h-4 text-white"/></div>
              <div className={`px-4 py-3 rounded-2xl rounded-tl-sm ${isDark?'bg-white/[0.05] border border-white/[0.07]':'bg-gray-50 border border-gray-100'}`}>
                <div className="flex items-center gap-1.5 h-5">{[0,1,2].map(i=><motion.div key={i} animate={{y:[0,-5,0]}} transition={{duration:.55,delay:i*.12,repeat:Infinity}} className="w-2 h-2 rounded-full bg-violet-400"/>)}</div>
              </div>
            </motion.div>}
            <div ref={bottomRef}/>
          </div>
          {messages.length<=1&&<div className={`px-5 pb-3 border-t ${isDark?'border-white/[0.05]':'border-gray-100'}`}>
            <p className={`text-xs ${M} mt-3 mb-2`}>Suggestions rapides</p>
            <div className="flex flex-wrap gap-1.5">{SUGGESTIONS.slice(0,8).map((s,i)=><button key={i} onClick={()=>sendMessage(s.query)} className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all hover:scale-105 ${isDark?'bg-white/[0.04] border-white/[0.08] text-white/60 hover:bg-violet-500/20 hover:border-violet-500/30 hover:text-violet-300':'bg-white border-gray-200 text-gray-500 hover:border-violet-200 hover:text-violet-600'}`}><span>{s.icon}</span><span>{s.label}</span></button>)}</div>
          </div>}
          <div className={`p-4 border-t ${isDark?'border-white/[0.05]':'border-gray-100'}`}>
            <form onSubmit={e=>{e.preventDefault();sendMessage(input);}} className="flex gap-2">
              <div className="relative flex-1">
                <MessageCircle className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${M}`}/>
                <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} placeholder={listening?'Parlez maintenant...':'Posez une question sur vos donnees...'} disabled={loading}
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-violet-500/25 ${isDark?'bg-white/[0.04] border-white/[0.08] text-white placeholder-white/25 focus:border-violet-500/40':'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-violet-300 focus:bg-white'} ${listening?'border-red-500/50':''}`}/>
              </div>
              {hasVoice&&<button type="button" onClick={toggleVoice} className={`p-2.5 rounded-xl border transition-colors ${listening?'bg-red-500 border-red-600 text-white':isDark?`bg-white/[0.05] border-white/[0.08] ${M} hover:text-white/70`:`bg-gray-50 border-gray-200 ${M} hover:text-gray-700`}`}>{listening?<MicOff className="w-4 h-4"/>:<Mic className="w-4 h-4"/>}</button>}
              <button type="submit" disabled={loading||!input.trim()} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-sm shadow-violet-500/20">
                <Send className="w-4 h-4"/><span className="text-sm font-medium hidden sm:inline">Envoyer</span>
              </button>
            </form>
            <p className={`text-[10px] ${M} mt-2 text-center`}>Analyse basee sur vos donnees reelles | Mise a jour en temps reel</p>
          </div>
        </motion.div>}
      </AnimatePresence>

      {minimized&&<motion.div initial={{opacity:0}} animate={{opacity:1}} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SUGGESTIONS.slice(0,8).map((s,i)=><motion.button key={i} whileHover={{scale:1.03}} onClick={()=>{setMinimized(false);setTimeout(()=>sendMessage(s.query),100);}} className={`${C} p-4 flex flex-col items-center gap-2 text-center hover:border-violet-500/30 transition-colors`}>
          <span className="text-2xl">{s.icon}</span><span className={`text-xs font-medium ${S}`}>{s.label}</span>
        </motion.button>)}
      </motion.div>}
    </div>
  </div>;
}
