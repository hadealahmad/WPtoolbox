import{A as a}from"./main-D56FifXV.js";const e={data:[],init:async()=>{const t=document.getElementById("tips-container");if(t){try{const n=await fetch("/js/data/tips.json");if(!n.ok)throw new Error("Failed to load tips");e.data=await n.json(),e.render()}catch(n){console.error("Error loading tips:",n),t.innerHTML='<div class="p-8 text-center text-red-400">Error loading tips. Make sure you are running a local server.</div>'}window.addEventListener("languageChanged",()=>{e.render()})}},t:t=>typeof t=="object"&&t!==null?t[a.currentLang]||t.en||"":t,render:()=>{const t=document.getElementById("tips-container");t&&(t.innerHTML="",e.data.forEach(n=>{const r=document.createElement("div");r.className="shadcn-card p-8 flex flex-col gap-6 hover:border-primary/50 transition-none",r.innerHTML=`
                <div class="flex justify-between items-start">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">${e.t(n.category)}</span>
                    <i data-lucide="lightbulb" class="text-amber-400 w-5 h-5"></i>
                </div>
                <div>
                    <h3 class="text-xl font-bold text-white mb-3 tracking-tight">${e.t(n.title)}</h3>
                    <p class="text-zinc-400 text-sm leading-relaxed">${e.t(n.fact)}</p>
                </div>
                <div class="mt-auto pt-6 border-t border-zinc-800">
                    <p class="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-2 flex items-center gap-2">
                        <i data-lucide="check-check" class="w-3 h-3 text-emerald-500"></i>
                        ${a.t("the_solution")||"The Solution"}
                    </p>
                    <p class="text-sm text-zinc-300 font-medium">${e.t(n.solution)}</p>
                </div>
            `,t.appendChild(r)}),typeof lucide<"u"&&lucide.createIcons({icons:lucide.icons}))}};window.Tips=e;document.readyState==="loading"?document.addEventListener("DOMContentLoaded",e.init):e.init();
