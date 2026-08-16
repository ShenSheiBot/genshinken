/**
 * 首绘前按查询串隐藏不匹配的文库行，消除“先看到全量列表、水合后
 * 才收窄”的闪烁。只处理站内链接必然使用的规范值；别名/大小写变体
 * 直接放弃预过滤，交给水合后的客户端筛选纠正——宁可短暂显示全量，
 * 也不误藏内容。与 themeScript 相同的内联引导模式（CSP 已允许）。
 */
export const libraryPrefilterBootstrap = String.raw`(function(){try{
var q=new URLSearchParams(location.search);
function pick(k){var v=q.get(k);if(v==null)return null;v=v.trim();return v?v:null;}
var s=pick("section"),c=pick("category"),t=pick("tag"),p=pick("contributor"),r=pick("role");
if(s&&["essay","review","translation","interview","community"].indexOf(s)<0)s=null;
if(r&&["author","translator","proofreader"].indexOf(r)<0)r=null;
var sel=[];
function esc(v){return v.replace(/\\/g,"\\\\").replace(/"/g,'\\"');}
function need(a,v){sel.push('li[data-lib-row]:not(['+a+'*="|'+esc(v)+'|"])');}
if(s)need("data-lib-section",s);
if(c)need("data-lib-category",c);
if(t)need("data-lib-tags",t);
if(p&&r)need("data-lib-credits",r+":"+p);
else if(p)need("data-lib-contributors",p);
else if(r)need("data-lib-roles",r);
if(!sel.length)return;
var st=document.createElement("style");st.id="library-prefilter";
st.textContent=sel.join(",")+"{display:none}";
document.head.appendChild(st);
}catch(e){}})();`;
