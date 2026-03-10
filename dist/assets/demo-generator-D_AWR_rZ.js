import{A as c}from"./main-D56FifXV.js";const f={fields:[{id:"post_title",type:"sentence",mapping:"title",locked:!1},{id:"post_content",type:"paragraphs",mapping:"content",locked:!1},{id:"featured_image",type:"image",mapping:"featured_image",locked:!1},{id:"category",type:"category",mapping:"category",locked:!1},{id:"tag",type:"tag",mapping:"tag",locked:!1}],generatedContent:"",genLang:"en",outputFormat:"xml",isProcessing:!1,init(){this.renderFields(),this.setupEventListeners(),this.updateGenLang("en"),this.updateFormat("xml")},setupEventListeners(){const e=document.getElementById("field-modal");e&&(e.onclick=t=>{t.target===e&&this.closeModal()})},updateGenLang(e){this.genLang=e,this.updateToggleButtonGroup("lang",e)},updateFormat(e){this.outputFormat=e,this.updateToggleButtonGroup("format",e)},updateToggleButtonGroup(e,t){document.querySelectorAll(`[id^="${e}-"]`).forEach(s=>{s.id===`${e}-${t}-btn`?(s.classList.add("bg-zinc-900","text-white","border-zinc-700","shadow-sm"),s.classList.remove("text-zinc-500","border-transparent")):(s.classList.remove("bg-zinc-900","text-white","border-zinc-700","shadow-sm"),s.classList.add("text-zinc-500","border-transparent"))})},renderFields(){const e=document.getElementById("fields-body");e&&(e.innerHTML=this.fields.map((t,n)=>`
            <tr class="group hover:bg-zinc-900/30 transition-all border-b border-zinc-900/50">
                <td class="px-6 py-4 text-xs font-medium text-white">${t.id}</td>
                <td class="px-6 py-4 text-xs text-zinc-500">${this.getTypeLabel(t.type)}</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono uppercase">${t.mapping}</span>
                </td>
                <td class="px-6 py-4 text-right">
                    ${t.locked?'<i data-lucide="lock" class="w-3.5 h-3.5 text-zinc-800 ml-auto"></i>':`<button onclick="DemoGenerator.removeField(${n})" class="text-zinc-700 hover:text-red-400 transition-colors">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>`}
                </td>
            </tr>
        `).join(""),typeof lucide<"u"&&lucide.createIcons({icons:lucide.icons}))},getTypeLabel(e){return{name:"Full Name",email:"Email Address",sentence:"Sentence",paragraphs:"Paragraphs",number:"Random Number",date:"Random Date",image:"Image URL",boolean:"Boolean (True/False)",color:"Hex Color",category:"Category",tag:"Tag"}[e]||e},addField(){document.getElementById("field-modal").classList.remove("hidden")},closeModal(){document.getElementById("field-modal").classList.add("hidden")},confirmAddField(){const e=document.getElementById("modal-field-id"),t=document.getElementById("modal-field-type"),n=document.getElementById("modal-wp-mapping"),s=e.value.trim().toLowerCase().replace(/\s+/g,"_");if(!s){c.showToast("Field ID is required",2e3);return}if(this.fields.find(a=>a.id===s)){c.showToast("Field ID already exists",2e3);return}this.fields.push({id:s,type:t.value,mapping:n.value,locked:!1}),this.renderFields(),this.closeModal(),e.value="",c.showToast(c.t("msg_field_added")||"Field added successfully")},removeField(e){this.fields.splice(e,1),this.renderFields(),c.showToast(c.t("msg_field_removed")||"Field removed")},resetFields(){this.fields=[{id:"post_title",type:"sentence",mapping:"title",locked:!1},{id:"post_content",type:"paragraphs",mapping:"content",locked:!1},{id:"featured_image",type:"image",mapping:"featured_image",locked:!1},{id:"category",type:"category",mapping:"category",locked:!1},{id:"tag",type:"tag",mapping:"tag",locked:!1}],this.renderFields(),c.showToast(c.t("msg_fields_reset")||"Fields reset to defaults")},cancelProcessing(){this.isProcessing=!1,document.getElementById("processing-overlay").classList.add("hidden")},async generate(){const e=parseInt(document.getElementById("record-count").value)||10,t=this.outputFormat,n=document.getElementById("post-type").value||"post";this.isProcessing=!0;const s=document.getElementById("processing-overlay"),a=document.getElementById("progress-bar"),r=document.getElementById("progress-status"),i=document.getElementById("processed-count");s.classList.remove("hidden"),a.style.width="0%",r.textContent="0%",i.textContent=`0 / ${e}`;const l=[];for(let d=0;d<e;d++){if(!this.isProcessing)return;const p={};this.fields.forEach(g=>{p[g.id]=this.generateValue(g.type),p[`__mapping_${g.id}`]=g.mapping}),l.push(p);const m=Math.round((d+1)/e*100);a.style.width=`${m}%`,r.textContent=`${m}%`,i.textContent=`${d+1} / ${e}`,await new Promise(g=>setTimeout(g,50))}t==="xml"?this.generatedContent=this.exportToXML(l,n):t==="csv"?this.generatedContent=this.exportToCSV(l):this.generatedContent=JSON.stringify(l,null,4),document.getElementById("content-preview").textContent=this.generatedContent,document.getElementById("preview-section").classList.remove("hidden"),s.classList.add("hidden"),this.isProcessing=!1,c.fireConfetti(),c.showToast(c.t("msg_gen_success")||"Content generated successfully")},generateValue(e){const t=this.genLang==="ar",n=["James Smith","Mary Johnson","John Williams","Patricia Brown","Robert Jones","Jennifer Garcia","Michael Miller","Linda Davis","William Rodriguez","Elizabeth Martinez"],s=["هادي الأحمد","عمر الطباع","أميرة نصر","ليلى الحداد","سامي بيطار","سارة طحان","نور صالح","زيد منصور","مايا بياعة","كريم جابر"],a=["builds","creates","optimizes","launches","scales","secures","designs","refactors","deploys"],r=["يبني","يطور","يحسن","يطلق","يوسع","يؤمن","يصمم","يعيد بناء","ينشر"],i=["WordPress site","dynamic app","clean code","pixel-perfect design","secure server","fast API","e-commerce store","user interface"],l=["موقع ووردبريس","تطبيق ذكي","كود نظيف","تصميم مثالي","سيرفر آمن","واجهة برمجية","متجر إلكتروني","واجهة مستخدم"],d=["Technology","Lifestyle","Development","Design","Business","Travel","Food","Health"],p=["تكنولوجيا","نمط حياة","تطوير","تصميم","أعمال","سفر","طعام","صحة"],m=["wp","js","css","coding","webdev","minimalism","performance","security"],g=["ووردبريس","برمجة","تصميم","أداء","أمان","بساطة","تطوير","ويب"],w=["photo-1501785888041-af3ef285b470","photo-1472214103451-9374bd1c798e","photo-1441974231531-c6227db76b6e","photo-1470071459604-3b5ec3a7fe05","photo-1469474968028-56623f02e42e","photo-1505765050516-f72998ffe3f3","photo-1518173946687-a4c8a9b719f5","photo-1447752875215-b2761acb3c5d","photo-1433086566608-574fd9e5d22f","photo-1501854140801-50d01674aa3e"],o=u=>u[Math.floor(Math.random()*u.length)];switch(e){case"name":return o(t?s:n);case"email":return`${o(t?s:n).toLowerCase().replace(/\s+/g,".")}${Math.floor(Math.random()*99)}@example.com`;case"sentence":return t?`${o(s)} ${o(r)} ${o(l)}.`:`${o(n)} ${o(a)} the ${o(i)}.`;case"paragraphs":return Array(3).fill(0).map(()=>t?`${o(s)} ${o(r)} ${o(l)}. تم تصميم هذا الـ ${o(l)} ليكون متطوراً وعصرياً. يفضل المطورون ${o(r)} أدواتهم باستمرار.`:`${o(n)} ${o(a)} the ${o(i)}. This ${o(i)} is designed to be ${o(["fast","secure","reliable","modern"])}. Many developers prefer to ${o(a)} their workflow.`).join(`

`);case"number":return Math.floor(Math.random()*1e4);case"date":const h=new Date;return h.setDate(h.getDate()-Math.floor(Math.random()*365)),h.toISOString().split("T")[0];case"image":return`https://images.unsplash.com/${o(w)}?auto=format&fit=crop&w=1200&q=80`;case"boolean":return Math.random()>.5?"true":"false";case"color":return"#"+Math.floor(Math.random()*16777215).toString(16).padStart(6,"0");case"category":return o(t?p:d);case"tag":return o(t?g:m);default:return"Mock Content"}},exportToXML(e,t){let n=`<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0"
	xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
	xmlns:content="http://purl.org/rss/1.0/modules/content/"
	xmlns:wfw="http://wellformedweb.org/CommentAPI/"
	xmlns:dc="http://purl.org/dc/elements/1.1/"
	xmlns:wp="http://wordpress.org/export/1.2/"
>
<channel>
	<title>WPToolbox Demo Content</title>
	<link>https://wptoolbox.local</link>
	<description>Generated Mock Content</description>
	<wp:wxr_version>1.2</wp:wxr_version>
	<wp:base_site_url>https://wptoolbox.local</wp:base_site_url>
	<wp:base_blog_url>https://wptoolbox.local</wp:base_blog_url>
`;return e.forEach((s,a)=>{const r=new Date().toISOString().replace(/T/," ").replace(/\..+/,""),i=s.post_title||`Demo Post ${a+1}`,l=s.post_content||"Demo Content";n+=`
	<item>
		<title><![CDATA[${i}]]></title>
		<link>http://wptoolbox.local/?p=${1e3+a}</link>
		<pubDate>${new Date().toUTCString()}</pubDate>
		<dc:creator><![CDATA[admin]]></dc:creator>
		<description></description>
		<content:encoded><![CDATA[${l}]]></content:encoded>
		<excerpt:encoded><![CDATA[${s.excerpt||""}]]></excerpt:encoded>
		<wp:post_id>${1e3+a}</wp:post_id>
		<wp:post_date><![CDATA[${r}]]></wp:post_date>
		<wp:post_date_gmt><![CDATA[${r}]]></wp:post_date_gmt>
		<wp:comment_status><![CDATA[closed]]></wp:comment_status>
		<wp:ping_status><![CDATA[closed]]></wp:ping_status>
		<wp:post_name><![CDATA[post-${1e3+a}]]></wp:post_name>
		<wp:status><![CDATA[publish]]></wp:status>
		<wp:post_parent>0</wp:post_parent>
		<wp:menu_order>0</wp:menu_order>
		<wp:post_type><![CDATA[${t}]]></wp:post_type>
		<wp:post_password><![CDATA[]]></wp:post_password>
		<wp:is_sticky>0</wp:is_sticky>`,Object.keys(s).forEach(d=>{if(!d.startsWith("__mapping_")){const p=s[`__mapping_${d}`],m=s[d];p==="meta"?n+=`
		<wp:postmeta>
			<wp:meta_key><![CDATA[${d}]]></wp:meta_key>
			<wp:meta_value><![CDATA[${m}]]></wp:meta_value>
		</wp:postmeta>`:p==="category"?n+=`
        <category domain="category" nicename="${m.toLowerCase().replace(/\s+/g,"-")}"><![CDATA[${m}]]></category>`:p==="tag"?n+=`
        <category domain="post_tag" nicename="${m.toLowerCase().replace(/\s+/g,"-")}"><![CDATA[${m}]]></category>`:p==="featured_image"&&(n+=`
		<wp:postmeta>
			<wp:meta_key><![CDATA[_thumbnail_id]]></wp:meta_key>
			<wp:meta_value><![CDATA[1000${a}]]></wp:meta_value>
		</wp:postmeta>`)}}),n+=`
	</item>`}),n+=`
</channel>
</rss>`,n},exportToCSV(e){if(e.length===0)return"";const t=e.map(a=>{const r={};return Object.keys(a).forEach(i=>{i.startsWith("__mapping_")||(r[i]=a[i])}),r}),n=Object.keys(t[0]),s=[n.join(",")];return t.forEach(a=>{const r=n.map(i=>c.escapeCSV(a[i]));s.push(r.join(","))}),s.join(`
`)},copyPreview(){const e=document.getElementById("content-preview");c.copyToClipboard(e.textContent,event.currentTarget,"Copied!")},download(){const e=this.outputFormat,t=`demo_content.${e==="xml"?"xml":e==="csv"?"csv":"json"}`,n=e==="xml"?"text/xml":e==="csv"?"text/csv":"application/json";c.downloadFile(this.generatedContent,t,n)}};window.DemoGenerator=f;document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>f.init()):f.init();
