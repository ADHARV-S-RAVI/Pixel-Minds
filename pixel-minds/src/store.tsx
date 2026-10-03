import {createContext,useContext,useState,ReactNode} from 'react';
import {Copy,Check,X,MessageCircle,Send,Linkedin,MoreHorizontal} from 'lucide-react';import {PixelMark} from './mark';
const ld=<T,>(k:string,d:T):T=>{try{return JSON.parse(localStorage.getItem(k)||'')??d}catch{return d}};
const sv=(k:string,v:unknown)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const mkCode=()=>'AARAV-'+Array.from({length:5},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');
const Ctx=createContext<any>(null);export const useApp=()=>useContext(Ctx);
export function AppProvider({children}:{children:ReactNode}){
const [code]=useState(()=>{let c=ld('pm_code','');if(!c){c=mkCode();sv('pm_code',c)}return c});
const [saved,setSaved]=useState<string[]>(()=>ld('pm_saved',[]));
const [applied,setApplied]=useState<number[]>(()=>ld('pm_applied',[]));
const [extra,setExtra]=useState<any[]>(()=>ld('pm_posts',[]));
const [toast,setToast]=useState('');const [sh,setSh]=useState<{title:string;path:string}|null>(null);const [ok,setOk]=useState(false);
const say=(m:string)=>{setToast(m);setTimeout(()=>setToast(''),2200)};
const toggle=(k:string)=>setSaved(s=>{const n=s.includes(k)?s.filter(x=>x!==k):[...s,k];sv('pm_saved',n);say(s.includes(k)?'Removed from saved':'Saved');return n});
const apply=(id:number)=>setApplied(a=>{if(a.includes(id))return a;const n=[...a,id];sv('pm_applied',n);say('Marked as registered');return n});
const addPost=(p:any)=>setExtra(e=>{const n=[p,...e];sv('pm_posts',n);return n});
const link=(path:string)=>{const u=new URL(path,location.origin);u.searchParams.set('ref',code);return u.toString()};
const copy=async(t:string)=>{try{await navigator.clipboard.writeText(t)}catch{const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove()}say('Link copied · +25 Pixels when a friend joins');setOk(true);setTimeout(()=>setOk(false),1500)};
const url=sh?link(sh.path):'';const txt=sh?`Check this out on Pixel Minds: ${sh.title}`:'';
const other=()=>(navigator as any).share?(navigator as any).share({title:sh!.title,text:txt,url}).catch(()=>{}):copy(url);
const ch:[string,any,string,string][]=sh?[['WhatsApp',MessageCircle,'#22c55e',`https://wa.me/?text=${encodeURIComponent(txt+' '+url)}`],['LinkedIn',Linkedin,'#0a66c2',`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`],['Telegram',Send,'#0ea5e9',`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(txt)}`]]:[];
return <Ctx.Provider value={{code,saved,applied,extra,toggle,apply,addPost,link,copy,say,share:(title:string,path:string)=>setSh({title,path})}}>{children}
{sh&&<div className="fixed inset-0 z-50 flex items-end bg-ink/50 sm:items-center sm:justify-center" onClick={()=>setSh(null)}><div onClick={e=>e.stopPropagation()} className="pm-in w-full overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl">
<div className="relative bg-gradient-to-br from-sky to-sky-d p-5 text-white"><button aria-label="Close" onClick={()=>setSh(null)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full hover:bg-white/15"><X size={18}/></button>
<span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/80"><PixelMark s={7}/>Refer &amp; Earn</span><h3 className="mt-1 pr-8 text-lg font-extrabold leading-snug">{sh.title}</h3><p className="mt-0.5 text-sm text-white/85">Refer this opportunity and earn Pixels</p>
<div className="relative mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sky-d shadow-md"><PixelMark s={10}/><span className="text-xl font-extrabold">+25 Pixels</span><span className="text-xs font-semibold text-mute">per friend who joins</span>{ok&&<span className="pm-rise absolute -top-1 right-3 text-sm font-extrabold text-white">+25</span>}</div></div>
<div className="p-5"><p className="text-xs font-semibold text-mute">Your unique referral link</p><div className="mt-1.5 flex gap-2"><input readOnly value={url} onFocus={e=>e.target.select()} className="min-w-0 flex-1 rounded-lg border border-line bg-mist/60 px-3 py-2.5 text-sm"/><button onClick={()=>copy(url)} className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white transition ${ok?'bg-green-600':'bg-sky hover:bg-sky-d'}`}>{ok?<Check size={16} className="pm-pop"/>:<Copy size={16}/>}{ok?'Copied':'Copy Link'}</button></div>
<p className="mt-2 text-xs text-mute">Code <b className="text-ink">{code}</b> is built into the link. Pixels are credited when your friend joins.</p>
<div className="mt-4 grid grid-cols-4 gap-2">{[...ch.map(([n,I,c,h])=><a key={n} href={h} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5 text-xs font-semibold text-mute"><span style={{background:c}} className="grid h-11 w-11 place-items-center rounded-full text-white transition hover:scale-105"><I size={20}/></span>{n}</a>),<button key="o" onClick={other} className="flex flex-col items-center gap-1.5 text-xs font-semibold text-mute"><span className="grid h-11 w-11 place-items-center rounded-full bg-mist text-ink transition hover:scale-105"><MoreHorizontal size={20}/></span>Other</button>]}</div></div></div></div>}
{toast&&<div className="pm-pop fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg md:bottom-6">{toast}</div>}</Ctx.Provider>}
