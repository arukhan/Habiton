import type {Habit,Recovery,User,Insights,Metrics,WeekDay,PersonalReward} from "@/types";
export class ApiError extends Error {constructor(public status:number,message:string){super(message);this.name="ApiError"}}
export async function request<T>(path:string,options:RequestInit={}):Promise<T>{
 const result=await fetch(`/api${path}`,{credentials:"include",cache:"no-store",...options,headers:{...(options.body?{"Content-Type":"application/json"}:{}),...options.headers}});
 const data=await result.json().catch(()=>({}));
 if(!result.ok)throw new ApiError(result.status,typeof data.error==="string"?data.error:`Request failed (${result.status})`);
 return data as T;
}
const post=<T,>(path:string,body:object={})=>request<T>(path,{method:"POST",body:JSON.stringify(body)});
export const API={
 me:()=>request<{user:User}>("/me"),
 login:(email:string,password:string)=>post<{user:User}>("/auth/login",{email,password}),
 register:(name:string,email:string,password:string)=>post<{user:User}>("/auth/register",{name,email,password}),
 logout:()=>post<{ok:boolean}>("/auth/logout"),
 updateProfile:(body:{name?:string;hero_class?:string})=>request<{user:User}>("/me",{method:"PATCH",body:JSON.stringify(body),headers:{"Content-Type":"application/json"}}),
 habits:()=>request<{habits:Habit[]}>("/habits"),
 recoveryLimits:()=>request<{limits:{habit_id:string;used:number;remaining:number;limit:number}[]}>("/habits/recovery-limits"),
 updateHabit:(id:string,body:{title:string;category:string;target_minutes:number})=>request<{ok:boolean}>(`/habits/${id}`,{method:"PATCH",body:JSON.stringify(body),headers:{"Content-Type":"application/json"}}),
 week:()=>request<{days:WeekDay[];today:string}>("/habits/week"),
 missedDates:(id:string)=>request<{dates:string[]}>(`/habits/${id}/missed-dates`),
 createHabit:(body:{title:string;category:string;target_minutes:number})=>post<{id:string}>("/habits",body),
 completeHabit:(id:string)=>post<{ok:boolean}>(`/habits/${id}/complete`),
 undoCompleteHabit: (id: string) =>
  request<{ ok: boolean }>(
    `/habits/${id}/complete`,
    { method: "DELETE" }
  ),
 archiveHabit:(id:string)=>request<{ok:boolean}>(`/habits/${id}`,{method:"DELETE"}),
 reportMiss:(id:string,body:{missed_date:string;reason:string;workload:string;energy:number})=>post<{id:string}>(`/habits/${id}/report-miss`,body),
 recoveries:()=>request<{recoveries:Recovery[]}>("/recoveries"),
 recoveryAction:(id:string,action:"accept"|"micro"|"step"|"original",body:object={})=>post<{ok:boolean;status:string}>(`/recoveries/${id}/${action}`,body),
 insights:()=>request<Insights>("/insights"),
 personalReward:()=>request<PersonalReward>("/me/reward"),
 startPersonalReward:(title:string)=>post<PersonalReward>("/me/reward",{title}),
 metrics:()=>request<Metrics>("/admin/metrics"),
 seed:()=>post<{ok:boolean}>("/demo/seed"),
};
