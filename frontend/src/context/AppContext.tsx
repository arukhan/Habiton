"use client";
import {createContext,useCallback,useContext,useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {API,ApiError} from "@/lib/api";
import type {User,Habit,Recovery,Insights} from "@/types";
type Store={user:User|null;habits:Habit[];recoveries:Recovery[];insights:Insights|null;loading:boolean;error:string;refresh:()=>Promise<void>;setError:(s:string)=>void;login:(email:string,password:string)=>Promise<void>;register:(name:string,email:string,password:string)=>Promise<void>;logout:()=>Promise<void>;updateProfile:(body:{name?:string;hero_class?:string})=>Promise<void>};
const Context=createContext<Store|null>(null);
export function AppProvider({children}:{children:React.ReactNode}){
 const router=useRouter();const [user,setUser]=useState<User|null>(null),[habits,setHabits]=useState<Habit[]>([]),[recoveries,setRecoveries]=useState<Recovery[]>([]),[insights,setInsights]=useState<Insights|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const refresh=useCallback(async()=>{
  const u=await API.me();setUser(u.user);
  const [h,r,i]=await Promise.all([API.habits(),API.recoveries(),API.insights()]);setHabits(h.habits);setRecoveries(r.recoveries);setInsights(i);
 },[]);
 useEffect(()=>{let cancelled=false;API.me().then(()=>refresh()).catch(e=>{if(!(e instanceof ApiError&&e.status===401))setError(String(e))}).finally(()=>{if(!cancelled)setLoading(false)});return()=>{cancelled=true}},[refresh]);
 async function login(email:string,password:string){setError("");const r=await API.login(email,password);setUser(r.user);await refresh();router.push("/today")}
 async function register(name:string,email:string,password:string){setError("");const r=await API.register(name,email,password);setUser(r.user);await refresh();router.push("/today")}
 async function logout(){await API.logout();setUser(null);setHabits([]);setRecoveries([]);setInsights(null);router.replace("/login")}
 async function updateProfile(body:{name?:string;hero_class?:string}){const r=await API.updateProfile(body);setUser(r.user)}
 return <Context.Provider value={{user,habits,recoveries,insights,loading,error,refresh,setError,login,register,logout,updateProfile}}>{children}</Context.Provider>
}
export function useHabiton(){const v=useContext(Context);if(!v)throw new Error("AppProvider missing");return v}
