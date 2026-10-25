const DATA_URL = "data/jobs.json";
const $ = (id) => document.getElementById(id);
let allJobs = [];
let saved = new Set(JSON.parse(localStorage.getItem("job-radar-saved") || "[]"));

function norm(s=""){ return String(s).toLowerCase(); }
function jobText(j){ return norm([j.title,j.company,j.location,j.category,(j.skills||[]).join(" "),j.description].join(" ")); }
function isSaved(j){ return saved.has(j.id || j.url); }
function saveJobs(){ localStorage.setItem("job-radar-saved", JSON.stringify([...saved])); }

function categoryMatch(j, filter){
  const c = norm(j.category);
  if(filter==="all") return true;
  if(filter==="backend") return c.includes("backend") || c.includes("java");
  if(filter==="security") return c.includes("security") || c.includes("cyber");
  if(filter==="ai-security") return c.includes("ai-security") || c.includes("application security");
  return true;
}
function locationMatch(j, filter){
  const l=norm(j.location);
  if(filter==="all") return true;
  if(filter==="india") return l.includes("india") || /chennai|bengaluru|bangalore|coimbatore|hyderabad|pune|mumbai|gurugram|noida|delhi/.test(l);
  if(filter==="remote") return l.includes("remote") || l.includes("work from home");
  return l.includes(filter==="bengaluru"?"bengaluru|bangalore":filter);
}
function filteredJobs(){
  const q=norm($("searchInput").value.trim());
  const loc=$("locationFilter").value, typ=$("typeFilter").value;
  let jobs=allJobs.filter(j=>(!q||jobText(j).includes(q))&&locationMatch(j,loc)&&categoryMatch(j,typ));
  if($("sortFilter").value==="date") jobs.sort((a,b)=>new Date(b.posted_at||0)-new Date(a.posted_at||0));
  else jobs.sort((a,b)=>(b.match_score||0)-(a.match_score||0));
  return jobs;
}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function timeLabel(date){
  if(!date) return "Date not listed";
  const d=new Date(date); if(Number.isNaN(d.getTime())) return esc(date);
  const days=Math.floor((Date.now()-d.getTime())/86400000);
  if(days<=0) return "Today"; if(days===1) return "1 day ago"; if(days<7) return `${days} days ago`;
  return d.toLocaleDateString(undefined,{day:"numeric",month:"short"});
}
function render(){
  const jobs=filteredJobs();
  $("jobCount").textContent=allJobs.length;
  $("newCount").textContent=allJobs.filter(j=>j.is_new).length;
  $("resultLabel").textContent=`${jobs.length} result${jobs.length===1?"":"s"}`;
  $("jobList").innerHTML=jobs.map(j=>{
    const score=Math.max(0,Math.min(100,Number(j.match_score)||0));
    const tags=(j.skills||[]).slice(0,5).map(s=>`<span class="tag">${esc(s)}</span>`).join("");
    const extras=(j.skills||[]).length>5?`<span class="tag more">+${j.skills.length-5}</span>`:"";
    const initial=esc((j.company||"?").trim().slice(0,1).toUpperCase());
    const id=esc(j.id||j.url||"");
    const savedNow=isSaved(j);
    return `<article class="job-card">
      <div class="card-top"><div class="job-title-wrap"><div class="company-mark">${initial}</div><div><div class="job-title">${esc(j.title||"Untitled role")}</div><div class="company">${esc(j.company||"Company not listed")}</div></div></div><div class="match ${score<70?"medium":""}">${score}% match</div></div>
      <div class="meta"><span>⌖ ${esc(j.location||"Location not listed")}</span><span>◷ ${timeLabel(j.posted_at)}</span>${j.work_mode?`<span>◫ ${esc(j.work_mode)}</span>`:""}</div>
      <div class="tag-row">${tags}${extras}</div>
      <p class="job-summary">${esc(j.description||"Open the listing to review the full responsibilities and requirements.")}</p>
      <div class="card-bottom"><span class="posted">${j.source?`Source: ${esc(j.source)}`:"Job listing"}${j.is_new?" · <b>New</b>":""}</span><div class="actions"><button class="save-btn ${savedNow?"saved":""}" data-save="${id}">${savedNow?"✓ Saved":"☆ Save"}</button><a class="apply-btn" href="${esc(j.url||"#")}" target="_blank" rel="noopener noreferrer">View job ↗</a></div></div>
    </article>`;
  }).join("");
  $("emptyState").classList.toggle("hidden",jobs.length>0);
  $("jobList").classList.toggle("hidden",jobs.length===0);
}
async function loadJobs(){
  $("status").classList.remove("error");
  $("status").textContent="Checking the latest published feed…";
  try{
    const res=await fetch(`${DATA_URL}?t=${Date.now()}`,{cache:"no-store"});
    if(!res.ok) throw new Error(`Feed returned ${res.status}`);
    const data=await res.json();
    allJobs=Array.isArray(data.jobs)?data.jobs:[];
    const updated=data.updated_at?new Date(data.updated_at):null;
    $("updatedAt").textContent=updated&&!Number.isNaN(updated.getTime())?updated.toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"Not available";
    $("status").textContent=data.note||"Feed loaded. Verify role details and eligibility on the employer’s website.";
    if(!allJobs.length) $("status").textContent="The feed is empty for now. Once GitHub Actions runs with a configured job-search provider, matched jobs will appear here.";
    render();
  }catch(e){
    allJobs=[];
    $("updatedAt").textContent="Unavailable";
    $("status").classList.add("error");
    $("status").textContent="Could not load data/jobs.json. Make sure GitHub Pages is enabled and the first scheduled/manual workflow has run.";
    render();
  }
}
$("jobList").addEventListener("click",e=>{
  const b=e.target.closest("[data-save]"); if(!b)return;
  const id=b.getAttribute("data-save"); if(saved.has(id))saved.delete(id);else saved.add(id);
  saveJobs();render();
});
["searchInput","locationFilter","typeFilter","sortFilter"].forEach(id=>$(id).addEventListener(id==="searchInput"?"input":"change",render));
$("refreshBtn").addEventListener("click",loadJobs);
$("clearFilters").addEventListener("click",()=>{$("searchInput").value="";$("locationFilter").value="all";$("typeFilter").value="all";$("sortFilter").value="match";render();});
loadJobs();
