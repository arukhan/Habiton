"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Pencil, Check, X, LogOut, Palette, ChevronDown, Moon, Sun } from "lucide-react";
import { Shell } from "@/components/Shell";
import { useThemeSettings, type ThemeName } from "@/components/ThemeProvider";
import { useHabiton } from "@/context/AppContext";
import { API } from "@/lib/api";
import type { Habit } from "@/types";

type HeroClass = "Warrior" | "Mage" | "Priest";
type Limit = {habit_id:string;used:number;remaining:number;limit:number};
const penguinImages: Record<HeroClass,string> = {
  Warrior: "/images/penguin-warrior.png",
  Mage: "/images/penguin-mage.png",
  Priest: "/images/penguin-priest.png",
};
const descriptions: Record<HeroClass,string> = {
  Warrior:"A brave penguin who never gives up.",
  Mage:"A curious penguin who grows through learning.",
  Priest:"A caring penguin who values balance and healing.",
};
const minuteOptions=[5,10,15,20,30,45,60,90,120];
const categories=["Study","Reading","Fitness","Health","Mindfulness","Other"];
const palettes: { key: ThemeName; label: string; color: string }[] = [
  {key:"lavender",label:"Lavender",color:"#7535b5"},
  {key:"sage",label:"Sage",color:"#357b62"},
  {key:"blue",label:"Blue",color:"#426da8"},
  {key:"rose",label:"Rose",color:"#a45077"},
  {key:"peach",label:"Peach",color:"#a85b39"},
];
const message=(e:unknown)=>e instanceof Error?e.message:"Something went wrong";

export default function Profile() {
  const {user,habits,insights,updateProfile,refresh,logout}=useHabiton();
  const {theme,mode,setTheme,setMode}=useThemeSettings();
  const [themeOpen,setThemeOpen]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [limits,setLimits]=useState<Limit[]>([]);
  const [editingName,setEditingName]=useState(false);
  const [name,setName]=useState("");
  const [editingHabit,setEditingHabit]=useState<Habit|null>(null);
  const [title,setTitle]=useState("");
  const [category,setCategory]=useState("Study");
  const [minutes,setMinutes]=useState(30);
  const [customMinutes,setCustomMinutes]=useState(false);
  const [busy,setBusy]=useState(false);

  const loadLimits=useCallback(async()=>{
    try { const r=await API.recoveryLimits();setLimits(r.limits); }
    catch(e){setError(message(e));}
  },[]);
  useEffect(()=>{void loadLimits()},[loadLimits]);
  useEffect(()=>{setName(user?.name||"")},[user?.name]);
  const selectedClass:HeroClass = user?.hero_class || "Mage";

  async function selectClass(cls:HeroClass){
    setError("");setNotice("");
    try {await updateProfile({hero_class:cls});} catch(e){setError(message(e));}
  }
  async function saveName(e:FormEvent){
    e.preventDefault();setError("");setNotice("");setBusy(true);
    try {await updateProfile({name:name.trim()});setEditingName(false);setNotice("Name updated");}
    catch(e){setError(message(e));} finally{setBusy(false)}
  }
  function openHabit(h:Habit){
    setEditingHabit(h);setTitle(h.title);setCategory(h.category);setMinutes(h.target_minutes);
    setCustomMinutes(!minuteOptions.includes(h.target_minutes));setError("");setNotice("");
  }
  async function saveHabit(e:FormEvent){
    e.preventDefault();if(!editingHabit)return;
    setError("");setNotice("");setBusy(true);
    try {
      await API.updateHabit(editingHabit.id,{title:title.trim(),category,target_minutes:minutes});
      await refresh();setEditingHabit(null);setNotice("Habit updated. Previous sessions are unchanged.");
      await loadLimits();
    }catch(e){setError(message(e));}finally{setBusy(false)}
  }
  const limitMap=new Map(limits.map(x=>[x.habit_id,x]));

  return <Shell>
    <p className="eyebrow">YOUR PENGUIN COMPANION</p>
    <h1>A little more you.</h1>
    <div className="card profile-hero">
      <div className="profile-top">
        <div className="profile-penguin">
          <Image src={penguinImages[selectedClass]} alt={`${selectedClass} Penguin`} width={160} height={160} className="profile-penguin-image" priority/>
        </div>
        <div className="profile-identity">
          <span className="level-bubble">Level {user?.level||1}</span>
          <strong>{user?.name||"Adventurer"}</strong>
          <small>{selectedClass} · Penguin</small>
          <small>{user?.email}</small>
          <button type="button" className="profile-edit-button" onClick={()=>{setEditingName(v=>!v);setError("");setNotice("");}}>
            <Pencil size={15}/> Edit profile
          </button>
        </div>
      </div>
      {editingName&&<form className="form-stack profile-inline-form" onSubmit={saveName}>
        <label>Display name<input value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={70} required/></label>
        <div className="profile-actions"><button type="submit" disabled={busy} className="btn-primary"><Check size={15}/> Save name</button><button type="button" className="btn-outline" onClick={()=>setEditingName(false)}><X size={15}/> Cancel</button></div>
        <p className="helper-text">Email and password settings will be added in a separate secure update.</p>
      </form>}
      <p className="eyebrow">CHOOSE YOUR PATH</p>
      <div className="class-choices">{(["Warrior","Mage","Priest"] as const).map(cls=><button key={cls} type="button" className={selectedClass===cls?"selected":""} onClick={()=>void selectClass(cls)}>{cls==="Warrior"?"⚔️":cls==="Mage"?"🪄":"🌿"} {cls}</button>)}</div>
      <p className="class-description">{descriptions[selectedClass]}</p>
      <div className="flex-between small-note"><span>XP {user?.xp_in_level||0} / {user?.xp_next||100}</span><span>Level {user?.level||1}</span></div>
      <div className="progress"><div style={{width:`${Math.min(100,((user?.xp_in_level||0)/(user?.xp_next||100))*100)}%`}}/></div>
    </div>

    <div className="stat-row boxed profile-stats">
      <div><Image src="/images/stat-habits.png" alt="Habits icon" width={52} height={52}/><small>Habits</small><b>{habits.length}</b></div>
      <div><Image src="/images/stat-streak.png" alt="Best streak icon" width={52} height={52}/><small>Best streak</small><b>{insights?.best_streak||0} days</b></div>
      <div><Image src="/images/stat-recovery.png" alt="Recovery icon" width={52} height={52}/><small>Recoveries</small><b>{insights?.recoveries||0}</b></div>
    </div>

    <section className="card">
      <p className="eyebrow">RECOVERY AVAILABILITY</p>
      <h2>Recoveries left by habit</h2>
      <p className="muted">Each habit allows up to 3 recovery attempts in a rolling 30-day window. Other eligibility rules still apply.</p>
      {habits.length===0?<p className="muted">Create your first habit to see its recovery limits.</p>:
        habits.map(h=>{
          const l=limitMap.get(h.id);const remaining=l?.remaining;
          return <div className="profile-limit-row" key={h.id}>
            <div className="flex-between"><strong>{h.title}</strong><span>{remaining===undefined?"—":`${remaining}/3 left`}</span></div>
            <div className="profile-limit-track"><div style={{width:`${(remaining??0)/3*100}%`}}/></div>
          </div>;
        })}
    </section>

    <section className="card">
      <p className="eyebrow">MY HABITS</p>
      <h2>Manage your habits</h2>
      {habits.length===0?<p className="muted">No habits yet.</p>:habits.map(h=><div className="profile-habit-row" key={h.id}>
        <div><strong>{h.title}</strong><small>{h.category} · {h.target_minutes} min daily</small></div>
        <button type="button" className="profile-edit-button" onClick={()=>openHabit(h)}><Pencil size={15}/> Edit</button>
      </div>)}
    </section>

    {editingHabit&&<section className="card profile-edit-card" aria-label="Edit habit">
      <div className="flex-between"><h2>Edit habit</h2><button type="button" className="text-button" onClick={()=>setEditingHabit(null)}><X size={16}/> Close</button></div>
      <form onSubmit={saveHabit} className="form-stack">
        <label>Habit name<input value={title} onChange={e=>setTitle(e.target.value)} minLength={2} maxLength={100} required/></label>
        <label>Category<select value={category} onChange={e=>setCategory(e.target.value)}>{Array.from(new Set([...categories,category])).map(v=><option key={v} value={v}>{v}</option>)}</select></label>
        <label>Daily goal<select value={customMinutes?"custom":String(minutes)} onChange={e=>{if(e.target.value==="custom")setCustomMinutes(true);else {setCustomMinutes(false);setMinutes(Number(e.target.value));}}}>
          {minuteOptions.map(m=><option key={m} value={String(m)}>{m} minutes</option>)}<option value="custom">Custom minutes</option>
        </select></label>
        {customMinutes&&<label>Custom goal in minutes<input type="number" min={1} max={1440} value={minutes} onChange={e=>setMinutes(Number(e.target.value))} required/></label>}
        <p className="helper-text">New goal applies to future check-ins. You cannot edit a habit while an active recovery plan is running.</p>
        <div className="profile-actions"><button className="btn-primary" type="submit" disabled={busy}>{busy?"Saving...":"Save changes"}</button><button type="button" className="btn-outline" onClick={()=>setEditingHabit(null)}>Cancel</button></div>
      </form>
    </section>}

    <section className="card"><p className="eyebrow">YOUR GROWTH</p><h2>How you earn XP</h2>
      <div className="profile-xp-row"><span>✅ Complete a habit</span><b>+20 XP</b></div>
      <div className="profile-xp-row"><span>✨ Complete a micro-quest</span><b>+10 XP</b></div>
      <div className="profile-xp-row"><span>🌱 Complete a step-up</span><b>+10 XP</b></div>
      <p className="muted">No leaderboards. Your only competition is yesterday.</p>
    </section>

    <section className="card theme-settings-card" aria-label="Appearance settings">
      <p className="eyebrow">YOUR SPACE</p>
      <h2>Appearance</h2>
      <button type="button" className="theme-settings-trigger" aria-expanded={themeOpen} onClick={()=>setThemeOpen(v=>!v)}>
        <Palette size={19} aria-hidden="true"/>
        <span>Customize theme</span>
        <ChevronDown size={17} aria-hidden="true" style={{transform:themeOpen?"rotate(180deg)":undefined}}/>
      </button>
      {themeOpen&&<div className="theme-settings-panel">
        <h3>Choose your color</h3>
        <div className="theme-swatch-grid" role="group" aria-label="Color palettes">
          {palettes.map(p=><button key={p.key} type="button" className="theme-swatch" aria-pressed={theme===p.key} onClick={()=>setTheme(p.key)}>
            <span className="theme-swatch-dot" style={{background:p.color}}>{theme===p.key?<Check size={17}/>:null}</span>
            <span>{p.label}</span>
          </button>)}
        </div>
        <div className="theme-mode-row">
          <span className="theme-mode-label">{mode==="dark"?<Moon size={17}/>:<Sun size={17}/>} Dark mode</span>
          <button type="button" className="theme-mode-toggle" role="switch" aria-checked={mode==="dark"} onClick={()=>setMode(mode==="dark"?"light":"dark")}>
            {mode==="dark"?"On":"Off"}
          </button>
        </div>
        <p className="theme-settings-note">Saved automatically on this device. The same colors apply to Today, Recovery, Insights and Profile.</p>
      </div>}
    </section>

    {notice&&<p className="profile-notice" role="status">{notice}</p>}
    {error&&<p className="error" role="alert">{error}</p>}
    <button className="logout" onClick={()=>void logout()}><LogOut size={18}/> Log out</button>
    <p className="footer-note">Your pace. Your space. Every day.</p>
  </Shell>;
}
