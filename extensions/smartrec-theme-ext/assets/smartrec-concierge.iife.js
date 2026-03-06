var pt=Object.defineProperty;var ht=(C,y,R)=>y in C?pt(C,y,{enumerable:!0,configurable:!0,writable:!0,value:R}):C[y]=R;var m=(C,y,R)=>ht(C,typeof y!="symbol"?y+"":y,R);(function(){"use strict";var X;const C=`
/* ── Fonts ── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

/* ── FAB Bubble ── */
.sr-chat-bubble {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 999999;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.16);
  transition: transform 0.22s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s;
  overflow: hidden;
}
.sr-chat-bubble::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(255,255,255,0.18);
  opacity: 0;
  transition: opacity 0.2s;
}
.sr-chat-bubble:hover {
  transform: scale(1.1) translateY(-2px);
  box-shadow: 0 16px 40px rgba(0,0,0,0.32), 0 4px 12px rgba(0,0,0,0.18);
}
.sr-chat-bubble:hover::before { opacity: 1; }
.sr-chat-bubble:active { transform: scale(0.96); }

/* Pulse ring animation on product pages */
.sr-chat-bubble.sr-pulse::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 3px solid currentColor;
  opacity: 0;
  animation: sr-pulse-ring 2s cubic-bezier(0.215,0.61,0.355,1) infinite;
}
@keyframes sr-pulse-ring {
  0%   { transform: scale(0.85); opacity: 0.7; }
  70%  { transform: scale(1.35); opacity: 0; }
  100% { transform: scale(1.35); opacity: 0; }
}

/* ── Chat Panel ── */
.sr-chat-panel {
  position: fixed;
  bottom: 96px;
  right: 24px;
  z-index: 999998;
  width: 370px;
  height: 560px;
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.12);
  display: none;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  transform-origin: bottom right;
  animation: none;
  border: 1px solid rgba(255,255,255,0.6);
}
.sr-chat-panel.open {
  display: flex;
  animation: sr-panel-in 0.28s cubic-bezier(.34,1.56,.64,1);
}
@keyframes sr-panel-in {
  from { opacity: 0; transform: scale(0.88) translateY(16px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

/* ── Header ── */
.sr-chat-header {
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}
.sr-chat-header::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.12);
  pointer-events: none;
}
.sr-chat-header-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255,255,255,0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  border: 1.5px solid rgba(255,255,255,0.4);
}
.sr-chat-header-info { flex: 1; min-width: 0; }
.sr-chat-header-name {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  letter-spacing: -0.01em;
  line-height: 1.2;
}
.sr-chat-header-status {
  font-size: 11px;
  color: rgba(255,255,255,0.75);
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 1px;
}
.sr-chat-header-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 6px #4ade80;
  animation: sr-status-pulse 2s ease infinite;
}
@keyframes sr-status-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.sr-chat-header-close {
  background: rgba(255,255,255,0.18);
  border: none;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  flex-shrink: 0;
}
.sr-chat-header-close:hover { background: rgba(255,255,255,0.32); }

/* ── Messages ── */
.sr-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 14px 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scroll-behavior: smooth;
  background: #f8f9fb;
}
.sr-chat-messages::-webkit-scrollbar { width: 4px; }
.sr-chat-messages::-webkit-scrollbar-track { background: transparent; }
.sr-chat-messages::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }

/* Message row wrapper for animation */
.sr-msg-row {
  display: flex;
  flex-direction: column;
  animation: sr-msg-in 0.2s ease;
}
@keyframes sr-msg-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.sr-msg-row.user { align-items: flex-end; }
.sr-msg-row.assistant { align-items: flex-start; }

.sr-chat-msg-user {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 18px 18px 4px 18px;
  font-size: 14px;
  line-height: 1.45;
  color: #fff;
  word-break: break-word;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}
.sr-chat-msg-assistant {
  max-width: 88%;
  padding: 10px 14px;
  border-radius: 4px 18px 18px 18px;
  background: #fff;
  font-size: 14px;
  line-height: 1.5;
  color: #1a1a2e;
  word-break: break-word;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  border: 1px solid rgba(0,0,0,0.05);
}
.sr-chat-msg-assistant p { margin: 0 0 6px; }
.sr-chat-msg-assistant p:last-child { margin-bottom: 0; }
.sr-chat-msg-assistant ul, .sr-chat-msg-assistant ol { margin: 4px 0; padding-left: 18px; }
.sr-chat-msg-assistant li { margin-bottom: 3px; }
.sr-chat-msg-assistant strong { color: #111; }
.sr-chat-msg-assistant code {
  background: #f0f4ff;
  color: #4f46e5;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12.5px;
}
.sr-msg-time {
  font-size: 10px;
  color: #bbb;
  margin-top: 3px;
  padding: 0 4px;
}

/* ── Typing Indicator ── */
.sr-chat-typing {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 4px 18px 18px 18px;
  align-self: flex-start;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  border: 1px solid rgba(0,0,0,0.05);
}
.sr-chat-typing span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  animation: sr-bounce 1.4s infinite;
}
.sr-chat-typing span:nth-child(2) { animation-delay: 0.18s; }
.sr-chat-typing span:nth-child(3) { animation-delay: 0.36s; }
@keyframes sr-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-6px); opacity: 1; }
}

/* ── Product Cards ── */
.sr-products-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-self: flex-start;
  max-width: 92%;
  animation: sr-msg-in 0.2s ease;
}
.sr-chat-product {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #ececec;
  border-radius: 14px;
  text-decoration: none;
  color: inherit;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.sr-chat-product:hover {
  border-color: rgba(79,70,229,0.3);
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  transform: translateY(-1px);
}
.sr-chat-product img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 10px;
  flex-shrink: 0;
  background: #f3f4f6;
}
.sr-chat-product-info { flex: 1; min-width: 0; }
.sr-chat-product-title {
  font-size: 13px;
  font-weight: 600;
  color: #111;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sr-chat-product-price {
  font-size: 13px;
  font-weight: 600;
  color: #059669;
  margin-top: 2px;
}
.sr-chat-product-reason {
  font-size: 11.5px;
  color: #6b7280;
  margin-top: 3px;
  line-height: 1.35;
}
.sr-chat-product-arrow {
  font-size: 16px;
  color: #9ca3af;
  flex-shrink: 0;
}

/* ── Quick Reply Chips ── */
.sr-quick-replies {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  align-self: flex-start;
  max-width: 92%;
  animation: sr-msg-in 0.25s ease;
}
.sr-quick-reply {
  padding: 7px 14px;
  border-radius: 20px;
  border: 1.5px solid transparent;
  background: #fff;
  font-size: 12.5px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  line-height: 1.2;
}
.sr-quick-reply:hover {
  background: #f5f3ff;
  border-color: currentColor;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0,0,0,0.12);
}
.sr-quick-reply:active { transform: translateY(0); }

/* ── Input Area ── */
.sr-chat-input-area {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
  background: #fff;
}
.sr-chat-input {
  flex: 1;
  border: 1.5px solid #e5e7eb;
  border-radius: 22px;
  padding: 9px 16px;
  font-size: 14px;
  outline: none;
  font-family: inherit;
  color: #111;
  background: #f9fafb;
  transition: border-color 0.15s, background 0.15s;
}
.sr-chat-input::placeholder { color: #9ca3af; }
.sr-chat-input:focus {
  border-color: #a5b4fc;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(165,180,252,0.2);
}
.sr-chat-send {
  border: none;
  border-radius: 50%;
  width: 38px;
  height: 38px;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.15s, opacity 0.15s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
}
.sr-chat-send:hover { transform: scale(1.08); opacity: 0.9; }
.sr-chat-send:active { transform: scale(0.94); }
.sr-chat-send:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

/* ── Proactive Popover ── */
.sr-proactive-popover {
  position: fixed;
  bottom: 96px;
  right: 24px;
  z-index: 999997;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.1);
  padding: 18px 20px 16px;
  max-width: 290px;
  min-width: 240px;
  opacity: 0;
  transform: translateY(12px) scale(0.95);
  transition: opacity 0.25s cubic-bezier(.34,1.56,.64,1), transform 0.25s cubic-bezier(.34,1.56,.64,1);
  pointer-events: none;
  border: 1px solid rgba(0,0,0,0.06);
}
.sr-proactive-popover.visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}
.sr-proactive-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.sr-proactive-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}
.sr-proactive-agent-name {
  font-size: 13px;
  font-weight: 600;
  color: #111;
  flex: 1;
}
.sr-proactive-close {
  background: #f3f4f6;
  border: none;
  color: #6b7280;
  cursor: pointer;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 13px;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}
.sr-proactive-close:hover { background: #e5e7eb; color: #374151; }
.sr-proactive-text {
  font-size: 13.5px;
  color: #374151;
  margin: 0 0 14px;
  line-height: 1.5;
}
.sr-proactive-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px 16px;
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: opacity 0.15s, transform 0.15s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
}
.sr-proactive-action:hover { opacity: 0.9; transform: translateY(-1px); }
.sr-proactive-action:active { transform: translateY(0); opacity: 1; }

/* ── Divider / Day separator ── */
.sr-chat-divider {
  text-align: center;
  font-size: 11px;
  color: #bbb;
  position: relative;
  margin: 4px 0;
}
.sr-chat-divider::before, .sr-chat-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 28%;
  height: 1px;
  background: #ececec;
}
.sr-chat-divider::before { left: 0; }
.sr-chat-divider::after { right: 0; }

/* ── Image suggestion grid ── */
.sr-image-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-top: 8px;
  align-self: flex-start;
  max-width: 92%;
  animation: sr-msg-in 0.2s ease;
}
.sr-image-card {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #ececec;
  background: #f3f4f6;
  position: relative;
}
.sr-image-card img {
  width: 100%;
  height: 100px;
  object-fit: cover;
  display: block;
}
.sr-image-card-caption {
  font-size: 11px;
  color: #555;
  padding: 5px 7px;
  background: #fff;
  line-height: 1.3;
}

/* ── Responsive ── */
@media(max-width:480px) {
  .sr-chat-panel {
    width: calc(100vw - 16px);
    right: 8px;
    bottom: 84px;
    height: 75vh;
    border-radius: 16px;
  }
  .sr-proactive-popover {
    right: 8px;
    bottom: 84px;
    max-width: calc(100vw - 24px);
  }
  .sr-chat-bubble {
    bottom: 16px;
    right: 16px;
  }
}
`;class y{constructor(e,t,n){this.root=e,this.meta=t,this.onToggle=n,this.isOpen=!1,this.bubble=this.createBubble();const{panel:s,input:i,messagesContainer:c,sendButton:a}=this.createPanel();this.panel=s,this.input=i,this.messagesContainer=c,this.sendButton=a,this.bubble.addEventListener("click",()=>this.toggle()),this.root.appendChild(this.bubble),this.root.appendChild(this.panel)}toggle(){this.isOpen?this.hide():this.show()}show(){var e;this.isOpen=!0,this.panel.classList.add("open"),setTimeout(()=>this.input.focus(),100),(e=this.onToggle)==null||e.call(this,!0)}hide(){var e;this.isOpen=!1,this.panel.classList.remove("open"),(e=this.onToggle)==null||e.call(this,!1)}setLoading(e){this.sendButton.disabled=e,this.input.disabled=e,this.input.style.opacity=e?"0.6":"1"}setPulse(e){e?(this.bubble.classList.add("sr-pulse"),this.bubble.style.color=this.meta.primaryColor):this.bubble.classList.remove("sr-pulse")}createBubble(){const e=document.createElement("button");return e.className="sr-chat-bubble",e.style.background=`linear-gradient(135deg, ${this.meta.primaryColor}, ${this.darken(this.meta.primaryColor,20)})`,e.setAttribute("aria-label",`Chat with ${this.meta.agentName}`),e.innerHTML=`
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>`,e}createPanel(){const e=document.createElement("div");e.className="sr-chat-panel";const t=document.createElement("div");t.className="sr-chat-header",t.style.background=`linear-gradient(135deg, ${this.meta.primaryColor} 0%, ${this.darken(this.meta.primaryColor,25)} 100%)`;const n=document.createElement("div");n.className="sr-chat-header-avatar",n.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>',t.appendChild(n);const s=document.createElement("div");s.className="sr-chat-header-info";const i=document.createElement("div");i.className="sr-chat-header-name",i.textContent=this.meta.agentName,s.appendChild(i);const c=document.createElement("div");c.className="sr-chat-header-status";const a=document.createElement("span");a.className="sr-chat-header-dot",c.appendChild(a),c.appendChild(document.createTextNode("Online · AI powered")),s.appendChild(c),t.appendChild(s);const p=document.createElement("button");p.className="sr-chat-header-close",p.innerHTML="&#x2715;",p.setAttribute("aria-label","Close chat"),p.addEventListener("click",()=>this.hide()),t.appendChild(p),e.appendChild(t);const o=document.createElement("div");o.className="sr-chat-messages",e.appendChild(o);const l=document.createElement("div");l.className="sr-chat-input-area";const d=document.createElement("input");d.className="sr-chat-input",d.type="text",d.placeholder="Ask me anything...",d.setAttribute("autocomplete","off"),l.appendChild(d);const h=document.createElement("button");return h.className="sr-chat-send",h.style.background=`linear-gradient(135deg, ${this.meta.primaryColor}, ${this.darken(this.meta.primaryColor,20)})`,h.setAttribute("aria-label","Send message"),h.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',h.addEventListener("click",()=>{d.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:!0}))}),l.appendChild(h),e.appendChild(l),{panel:e,input:d,messagesContainer:o,sendButton:h}}darken(e,t){const n=a=>Math.max(0,Math.min(255,a)),s=n(parseInt(e.slice(1,3),16)-t),i=n(parseInt(e.slice(3,5),16)-t),c=n(parseInt(e.slice(5,7),16)-t);return`#${s.toString(16).padStart(2,"0")}${i.toString(16).padStart(2,"0")}${c.toString(16).padStart(2,"0")}`}}class R{constructor(e){this.appProxy=e}async sendMessage(e,t,n,s){const i={message:e,history:t,productId:n.productId,productTitle:n.productTitle,productType:n.productType,customerId:n.customerId,features:n.features};let c;try{c=await fetch(`${this.appProxy}/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i)})}catch{s({type:"error",error:"Network error. Please check your connection."});return}if(!c.ok||!c.body){s({type:"error",error:"Server error. Please try again."});return}const a=c.body.getReader(),p=new TextDecoder;let o="";for(;;){const{done:l,value:d}=await a.read();if(l)break;o+=p.decode(d,{stream:!0});const h=o.split(`
`);o=h.pop()??"";for(const x of h){if(!x.startsWith("data: "))continue;const u=x.slice(6).trim();if(!(!u||u==="[DONE]"))try{const b=JSON.parse(u);s(b)}catch{}}}}}class ye{constructor(){this.history=[]}add(e,t){this.history.push({role:e,content:t})}getHistory(){return[...this.history]}getLastN(e){return this.history.slice(-e)}clear(){this.history=[]}}function O(){return{async:!1,breaks:!1,extensions:null,gfm:!0,hooks:null,pedantic:!1,renderer:null,silent:!1,tokenizer:null,walkTokens:null}}var $=O();function te(r){$=r}var z={exec:()=>null};function g(r,e=""){let t=typeof r=="string"?r:r.source;const n={replace:(s,i)=>{let c=typeof i=="string"?i:i.source;return c=c.replace(k.caret,"$1"),t=t.replace(s,c),n},getRegex:()=>new RegExp(t,e)};return n}var k={codeRemoveIndent:/^(?: {1,4}| {0,3}\t)/gm,outputLinkReplace:/\\([\[\]])/g,indentCodeCompensation:/^(\s+)(?:```)/,beginningSpace:/^\s+/,endingHash:/#$/,startingSpaceChar:/^ /,endingSpaceChar:/ $/,nonSpaceChar:/[^ ]/,newLineCharGlobal:/\n/g,tabCharGlobal:/\t/g,multipleSpaceGlobal:/\s+/g,blankLine:/^[ \t]*$/,doubleBlankLine:/\n[ \t]*\n[ \t]*$/,blockquoteStart:/^ {0,3}>/,blockquoteSetextReplace:/\n {0,3}((?:=+|-+) *)(?=\n|$)/g,blockquoteSetextReplace2:/^ {0,3}>[ \t]?/gm,listReplaceTabs:/^\t+/,listReplaceNesting:/^ {1,4}(?=( {4})*[^ ])/g,listIsTask:/^\[[ xX]\] /,listReplaceTask:/^\[[ xX]\] +/,anyLine:/\n.*\n/,hrefBrackets:/^<(.*)>$/,tableDelimiter:/[:|]/,tableAlignChars:/^\||\| *$/g,tableRowBlankLine:/\n[ \t]*$/,tableAlignRight:/^ *-+: *$/,tableAlignCenter:/^ *:-+: *$/,tableAlignLeft:/^ *:-+ *$/,startATag:/^<a /i,endATag:/^<\/a>/i,startPreScriptTag:/^<(pre|code|kbd|script)(\s|>)/i,endPreScriptTag:/^<\/(pre|code|kbd|script)(\s|>)/i,startAngleBracket:/^</,endAngleBracket:/>$/,pedanticHrefTitle:/^([^'"]*[^\s])\s+(['"])(.*)\2/,unicodeAlphaNumeric:/[\p{L}\p{N}]/u,escapeTest:/[&<>"']/,escapeReplace:/[&<>"']/g,escapeTestNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,escapeReplaceNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,unescapeTest:/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig,caret:/(^|[^\[])\^/g,percentDecode:/%25/g,findPipe:/\|/g,splitPipe:/ \|/,slashPipe:/\\\|/g,carriageReturn:/\r\n|\r/g,spaceLine:/^ +$/gm,notSpaceStart:/^\S*/,endingNewline:/\n$/,listItemRegex:r=>new RegExp(`^( {0,3}${r})((?:[	 ][^\\n]*)?(?:\\n|$))`),nextBulletRegex:r=>new RegExp(`^ {0,${Math.min(3,r-1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),hrRegex:r=>new RegExp(`^ {0,${Math.min(3,r-1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),fencesBeginRegex:r=>new RegExp(`^ {0,${Math.min(3,r-1)}}(?:\`\`\`|~~~)`),headingBeginRegex:r=>new RegExp(`^ {0,${Math.min(3,r-1)}}#`),htmlBeginRegex:r=>new RegExp(`^ {0,${Math.min(3,r-1)}}<(?:[a-z].*>|!--)`,"i")},ve=/^(?:[ \t]*(?:\n|$))+/,Se=/^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,Ce=/^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,E=/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,$e=/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,D=/(?:[*+-]|\d{1,9}[.)])/,ne=/^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,re=g(ne).replace(/bull/g,D).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/\|table/g,"").getRegex(),Te=g(ne).replace(/bull/g,D).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/table/g,/ {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(),j=/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,Re=/^[^\n]+/,Z=/(?!\s*\])(?:\\.|[^\[\]\\])+/,ze=g(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label",Z).replace("title",/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(),Ee=g(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g,D).getRegex(),P="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",G=/<!--(?:-?>|[\s\S]*?(?:-->|$))/,Ie=g("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))","i").replace("comment",G).replace("tag",P).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),se=g(j).replace("hr",E).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("|table","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",P).getRegex(),Le=g(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph",se).getRegex(),Q={blockquote:Le,code:Se,def:ze,fences:Ce,heading:$e,hr:E,html:Ie,lheading:re,list:Ee,newline:ve,paragraph:se,table:z,text:Re},ie=g("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr",E).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("blockquote"," {0,3}>").replace("code","(?: {4}| {0,3}	)[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",P).getRegex(),Ae={...Q,lheading:Te,table:ie,paragraph:g(j).replace("hr",E).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("table",ie).replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",P).getRegex()},Pe={...Q,html:g(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment",G).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:z,lheading:/^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,paragraph:g(j).replace("hr",E).replace("heading",` *#{1,6} *[^
]`).replace("lheading",re).replace("|table","").replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").replace("|tag","").getRegex()},_e=/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,Be=/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,ae=/^( {2,}|\\)\n(?!\s*$)/,Ne=/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,_=/[\p{P}\p{S}]/u,Y=/[\s\p{P}\p{S}]/u,oe=/[^\s\p{P}\p{S}]/u,Me=g(/^((?![*_])punctSpace)/,"u").replace(/punctSpace/g,Y).getRegex(),le=/(?!~)[\p{P}\p{S}]/u,qe=/(?!~)[\s\p{P}\p{S}]/u,He=/(?:[^\s\p{P}\p{S}]|~)/u,Oe=/\[[^[\]]*?\]\((?:\\.|[^\\\(\)]|\((?:\\.|[^\\\(\)])*\))*\)|`[^`]*?`|<[^<>]*?>/g,ce=/^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/,De=g(ce,"u").replace(/punct/g,_).getRegex(),je=g(ce,"u").replace(/punct/g,le).getRegex(),pe="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)",Ze=g(pe,"gu").replace(/notPunctSpace/g,oe).replace(/punctSpace/g,Y).replace(/punct/g,_).getRegex(),Ge=g(pe,"gu").replace(/notPunctSpace/g,He).replace(/punctSpace/g,qe).replace(/punct/g,le).getRegex(),Qe=g("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)","gu").replace(/notPunctSpace/g,oe).replace(/punctSpace/g,Y).replace(/punct/g,_).getRegex(),Ye=g(/\\(punct)/,"gu").replace(/punct/g,_).getRegex(),We=g(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme",/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email",/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(),Ue=g(G).replace("(?:-->|$)","-->").getRegex(),Fe=g("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment",Ue).replace("attribute",/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(),B=/(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/,Xe=g(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label",B).replace("href",/<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title",/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(),he=g(/^!?\[(label)\]\[(ref)\]/).replace("label",B).replace("ref",Z).getRegex(),de=g(/^!?\[(ref)\](?:\[\])?/).replace("ref",Z).getRegex(),Je=g("reflink|nolink(?!\\()","g").replace("reflink",he).replace("nolink",de).getRegex(),W={_backpedal:z,anyPunctuation:Ye,autolink:We,blockSkip:Oe,br:ae,code:Be,del:z,emStrongLDelim:De,emStrongRDelimAst:Ze,emStrongRDelimUnd:Qe,escape:_e,link:Xe,nolink:de,punctuation:Me,reflink:he,reflinkSearch:Je,tag:Fe,text:Ne,url:z},Ke={...W,link:g(/^!?\[(label)\]\((.*?)\)/).replace("label",B).getRegex(),reflink:g(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",B).getRegex()},U={...W,emStrongRDelimAst:Ge,emStrongLDelim:je,url:g(/^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/,"i").replace("email",/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),_backpedal:/(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])((?:\\.|[^\\])*?(?:\\.|[^\s~\\]))\1(?=[^~]|$)/,text:/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/},Ve={...U,br:g(ae).replace("{2,}","*").getRegex(),text:g(U.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()},N={normal:Q,gfm:Ae,pedantic:Pe},I={normal:W,gfm:U,breaks:Ve,pedantic:Ke},et={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},ue=r=>et[r];function w(r,e){if(e){if(k.escapeTest.test(r))return r.replace(k.escapeReplace,ue)}else if(k.escapeTestNoEncode.test(r))return r.replace(k.escapeReplaceNoEncode,ue);return r}function ge(r){try{r=encodeURI(r).replace(k.percentDecode,"%")}catch{return null}return r}function fe(r,e){var i;const t=r.replace(k.findPipe,(c,a,p)=>{let o=!1,l=a;for(;--l>=0&&p[l]==="\\";)o=!o;return o?"|":" |"}),n=t.split(k.splitPipe);let s=0;if(n[0].trim()||n.shift(),n.length>0&&!((i=n.at(-1))!=null&&i.trim())&&n.pop(),e)if(n.length>e)n.splice(e);else for(;n.length<e;)n.push("");for(;s<n.length;s++)n[s]=n[s].trim().replace(k.slashPipe,"|");return n}function L(r,e,t){const n=r.length;if(n===0)return"";let s=0;for(;s<n&&r.charAt(n-s-1)===e;)s++;return r.slice(0,n-s)}function tt(r,e){if(r.indexOf(e[1])===-1)return-1;let t=0;for(let n=0;n<r.length;n++)if(r[n]==="\\")n++;else if(r[n]===e[0])t++;else if(r[n]===e[1]&&(t--,t<0))return n;return t>0?-2:-1}function me(r,e,t,n,s){const i=e.href,c=e.title||null,a=r[1].replace(s.other.outputLinkReplace,"$1");n.state.inLink=!0;const p={type:r[0].charAt(0)==="!"?"image":"link",raw:t,href:i,title:c,text:a,tokens:n.inlineTokens(a)};return n.state.inLink=!1,p}function nt(r,e,t){const n=r.match(t.other.indentCodeCompensation);if(n===null)return e;const s=n[1];return e.split(`
`).map(i=>{const c=i.match(t.other.beginningSpace);if(c===null)return i;const[a]=c;return a.length>=s.length?i.slice(s.length):i}).join(`
`)}var M=class{constructor(r){m(this,"options");m(this,"rules");m(this,"lexer");this.options=r||$}space(r){const e=this.rules.block.newline.exec(r);if(e&&e[0].length>0)return{type:"space",raw:e[0]}}code(r){const e=this.rules.block.code.exec(r);if(e){const t=e[0].replace(this.rules.other.codeRemoveIndent,"");return{type:"code",raw:e[0],codeBlockStyle:"indented",text:this.options.pedantic?t:L(t,`
`)}}}fences(r){const e=this.rules.block.fences.exec(r);if(e){const t=e[0],n=nt(t,e[3]||"",this.rules);return{type:"code",raw:t,lang:e[2]?e[2].trim().replace(this.rules.inline.anyPunctuation,"$1"):e[2],text:n}}}heading(r){const e=this.rules.block.heading.exec(r);if(e){let t=e[2].trim();if(this.rules.other.endingHash.test(t)){const n=L(t,"#");(this.options.pedantic||!n||this.rules.other.endingSpaceChar.test(n))&&(t=n.trim())}return{type:"heading",raw:e[0],depth:e[1].length,text:t,tokens:this.lexer.inline(t)}}}hr(r){const e=this.rules.block.hr.exec(r);if(e)return{type:"hr",raw:L(e[0],`
`)}}blockquote(r){const e=this.rules.block.blockquote.exec(r);if(e){let t=L(e[0],`
`).split(`
`),n="",s="";const i=[];for(;t.length>0;){let c=!1;const a=[];let p;for(p=0;p<t.length;p++)if(this.rules.other.blockquoteStart.test(t[p]))a.push(t[p]),c=!0;else if(!c)a.push(t[p]);else break;t=t.slice(p);const o=a.join(`
`),l=o.replace(this.rules.other.blockquoteSetextReplace,`
    $1`).replace(this.rules.other.blockquoteSetextReplace2,"");n=n?`${n}
${o}`:o,s=s?`${s}
${l}`:l;const d=this.lexer.state.top;if(this.lexer.state.top=!0,this.lexer.blockTokens(l,i,!0),this.lexer.state.top=d,t.length===0)break;const h=i.at(-1);if((h==null?void 0:h.type)==="code")break;if((h==null?void 0:h.type)==="blockquote"){const x=h,u=x.raw+`
`+t.join(`
`),b=this.blockquote(u);i[i.length-1]=b,n=n.substring(0,n.length-x.raw.length)+b.raw,s=s.substring(0,s.length-x.text.length)+b.text;break}else if((h==null?void 0:h.type)==="list"){const x=h,u=x.raw+`
`+t.join(`
`),b=this.list(u);i[i.length-1]=b,n=n.substring(0,n.length-h.raw.length)+b.raw,s=s.substring(0,s.length-x.raw.length)+b.raw,t=u.substring(i.at(-1).raw.length).split(`
`);continue}}return{type:"blockquote",raw:n,tokens:i,text:s}}}list(r){let e=this.rules.block.list.exec(r);if(e){let t=e[1].trim();const n=t.length>1,s={type:"list",raw:"",ordered:n,start:n?+t.slice(0,-1):"",loose:!1,items:[]};t=n?`\\d{1,9}\\${t.slice(-1)}`:`\\${t}`,this.options.pedantic&&(t=n?t:"[*+-]");const i=this.rules.other.listItemRegex(t);let c=!1;for(;r;){let p=!1,o="",l="";if(!(e=i.exec(r))||this.rules.block.hr.test(r))break;o=e[0],r=r.substring(o.length);let d=e[2].split(`
`,1)[0].replace(this.rules.other.listReplaceTabs,J=>" ".repeat(3*J.length)),h=r.split(`
`,1)[0],x=!d.trim(),u=0;if(this.options.pedantic?(u=2,l=d.trimStart()):x?u=e[1].length+1:(u=e[2].search(this.rules.other.nonSpaceChar),u=u>4?1:u,l=d.slice(u),u+=e[1].length),x&&this.rules.other.blankLine.test(h)&&(o+=h+`
`,r=r.substring(h.length+1),p=!0),!p){const J=this.rules.other.nextBulletRegex(u),be=this.rules.other.hrRegex(u),ke=this.rules.other.fencesBeginRegex(u),we=this.rules.other.headingBeginRegex(u),ct=this.rules.other.htmlBeginRegex(u);for(;r;){const K=r.split(`
`,1)[0];let A;if(h=K,this.options.pedantic?(h=h.replace(this.rules.other.listReplaceNesting,"  "),A=h):A=h.replace(this.rules.other.tabCharGlobal,"    "),ke.test(h)||we.test(h)||ct.test(h)||J.test(h)||be.test(h))break;if(A.search(this.rules.other.nonSpaceChar)>=u||!h.trim())l+=`
`+A.slice(u);else{if(x||d.replace(this.rules.other.tabCharGlobal,"    ").search(this.rules.other.nonSpaceChar)>=4||ke.test(d)||we.test(d)||be.test(d))break;l+=`
`+h}!x&&!h.trim()&&(x=!0),o+=K+`
`,r=r.substring(K.length+1),d=A.slice(u)}}s.loose||(c?s.loose=!0:this.rules.other.doubleBlankLine.test(o)&&(c=!0));let b=null,xe;this.options.gfm&&(b=this.rules.other.listIsTask.exec(l),b&&(xe=b[0]!=="[ ] ",l=l.replace(this.rules.other.listReplaceTask,""))),s.items.push({type:"list_item",raw:o,task:!!b,checked:xe,loose:!1,text:l,tokens:[]}),s.raw+=o}const a=s.items.at(-1);if(a)a.raw=a.raw.trimEnd(),a.text=a.text.trimEnd();else return;s.raw=s.raw.trimEnd();for(let p=0;p<s.items.length;p++)if(this.lexer.state.top=!1,s.items[p].tokens=this.lexer.blockTokens(s.items[p].text,[]),!s.loose){const o=s.items[p].tokens.filter(d=>d.type==="space"),l=o.length>0&&o.some(d=>this.rules.other.anyLine.test(d.raw));s.loose=l}if(s.loose)for(let p=0;p<s.items.length;p++)s.items[p].loose=!0;return s}}html(r){const e=this.rules.block.html.exec(r);if(e)return{type:"html",block:!0,raw:e[0],pre:e[1]==="pre"||e[1]==="script"||e[1]==="style",text:e[0]}}def(r){const e=this.rules.block.def.exec(r);if(e){const t=e[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal," "),n=e[2]?e[2].replace(this.rules.other.hrefBrackets,"$1").replace(this.rules.inline.anyPunctuation,"$1"):"",s=e[3]?e[3].substring(1,e[3].length-1).replace(this.rules.inline.anyPunctuation,"$1"):e[3];return{type:"def",tag:t,raw:e[0],href:n,title:s}}}table(r){var c;const e=this.rules.block.table.exec(r);if(!e||!this.rules.other.tableDelimiter.test(e[2]))return;const t=fe(e[1]),n=e[2].replace(this.rules.other.tableAlignChars,"").split("|"),s=(c=e[3])!=null&&c.trim()?e[3].replace(this.rules.other.tableRowBlankLine,"").split(`
`):[],i={type:"table",raw:e[0],header:[],align:[],rows:[]};if(t.length===n.length){for(const a of n)this.rules.other.tableAlignRight.test(a)?i.align.push("right"):this.rules.other.tableAlignCenter.test(a)?i.align.push("center"):this.rules.other.tableAlignLeft.test(a)?i.align.push("left"):i.align.push(null);for(let a=0;a<t.length;a++)i.header.push({text:t[a],tokens:this.lexer.inline(t[a]),header:!0,align:i.align[a]});for(const a of s)i.rows.push(fe(a,i.header.length).map((p,o)=>({text:p,tokens:this.lexer.inline(p),header:!1,align:i.align[o]})));return i}}lheading(r){const e=this.rules.block.lheading.exec(r);if(e)return{type:"heading",raw:e[0],depth:e[2].charAt(0)==="="?1:2,text:e[1],tokens:this.lexer.inline(e[1])}}paragraph(r){const e=this.rules.block.paragraph.exec(r);if(e){const t=e[1].charAt(e[1].length-1)===`
`?e[1].slice(0,-1):e[1];return{type:"paragraph",raw:e[0],text:t,tokens:this.lexer.inline(t)}}}text(r){const e=this.rules.block.text.exec(r);if(e)return{type:"text",raw:e[0],text:e[0],tokens:this.lexer.inline(e[0])}}escape(r){const e=this.rules.inline.escape.exec(r);if(e)return{type:"escape",raw:e[0],text:e[1]}}tag(r){const e=this.rules.inline.tag.exec(r);if(e)return!this.lexer.state.inLink&&this.rules.other.startATag.test(e[0])?this.lexer.state.inLink=!0:this.lexer.state.inLink&&this.rules.other.endATag.test(e[0])&&(this.lexer.state.inLink=!1),!this.lexer.state.inRawBlock&&this.rules.other.startPreScriptTag.test(e[0])?this.lexer.state.inRawBlock=!0:this.lexer.state.inRawBlock&&this.rules.other.endPreScriptTag.test(e[0])&&(this.lexer.state.inRawBlock=!1),{type:"html",raw:e[0],inLink:this.lexer.state.inLink,inRawBlock:this.lexer.state.inRawBlock,block:!1,text:e[0]}}link(r){const e=this.rules.inline.link.exec(r);if(e){const t=e[2].trim();if(!this.options.pedantic&&this.rules.other.startAngleBracket.test(t)){if(!this.rules.other.endAngleBracket.test(t))return;const i=L(t.slice(0,-1),"\\");if((t.length-i.length)%2===0)return}else{const i=tt(e[2],"()");if(i===-2)return;if(i>-1){const a=(e[0].indexOf("!")===0?5:4)+e[1].length+i;e[2]=e[2].substring(0,i),e[0]=e[0].substring(0,a).trim(),e[3]=""}}let n=e[2],s="";if(this.options.pedantic){const i=this.rules.other.pedanticHrefTitle.exec(n);i&&(n=i[1],s=i[3])}else s=e[3]?e[3].slice(1,-1):"";return n=n.trim(),this.rules.other.startAngleBracket.test(n)&&(this.options.pedantic&&!this.rules.other.endAngleBracket.test(t)?n=n.slice(1):n=n.slice(1,-1)),me(e,{href:n&&n.replace(this.rules.inline.anyPunctuation,"$1"),title:s&&s.replace(this.rules.inline.anyPunctuation,"$1")},e[0],this.lexer,this.rules)}}reflink(r,e){let t;if((t=this.rules.inline.reflink.exec(r))||(t=this.rules.inline.nolink.exec(r))){const n=(t[2]||t[1]).replace(this.rules.other.multipleSpaceGlobal," "),s=e[n.toLowerCase()];if(!s){const i=t[0].charAt(0);return{type:"text",raw:i,text:i}}return me(t,s,t[0],this.lexer,this.rules)}}emStrong(r,e,t=""){let n=this.rules.inline.emStrongLDelim.exec(r);if(!n||n[3]&&t.match(this.rules.other.unicodeAlphaNumeric))return;if(!(n[1]||n[2]||"")||!t||this.rules.inline.punctuation.exec(t)){const i=[...n[0]].length-1;let c,a,p=i,o=0;const l=n[0][0]==="*"?this.rules.inline.emStrongRDelimAst:this.rules.inline.emStrongRDelimUnd;for(l.lastIndex=0,e=e.slice(-1*r.length+i);(n=l.exec(e))!=null;){if(c=n[1]||n[2]||n[3]||n[4]||n[5]||n[6],!c)continue;if(a=[...c].length,n[3]||n[4]){p+=a;continue}else if((n[5]||n[6])&&i%3&&!((i+a)%3)){o+=a;continue}if(p-=a,p>0)continue;a=Math.min(a,a+p+o);const d=[...n[0]][0].length,h=r.slice(0,i+n.index+d+a);if(Math.min(i,a)%2){const u=h.slice(1,-1);return{type:"em",raw:h,text:u,tokens:this.lexer.inlineTokens(u)}}const x=h.slice(2,-2);return{type:"strong",raw:h,text:x,tokens:this.lexer.inlineTokens(x)}}}}codespan(r){const e=this.rules.inline.code.exec(r);if(e){let t=e[2].replace(this.rules.other.newLineCharGlobal," ");const n=this.rules.other.nonSpaceChar.test(t),s=this.rules.other.startingSpaceChar.test(t)&&this.rules.other.endingSpaceChar.test(t);return n&&s&&(t=t.substring(1,t.length-1)),{type:"codespan",raw:e[0],text:t}}}br(r){const e=this.rules.inline.br.exec(r);if(e)return{type:"br",raw:e[0]}}del(r){const e=this.rules.inline.del.exec(r);if(e)return{type:"del",raw:e[0],text:e[2],tokens:this.lexer.inlineTokens(e[2])}}autolink(r){const e=this.rules.inline.autolink.exec(r);if(e){let t,n;return e[2]==="@"?(t=e[1],n="mailto:"+t):(t=e[1],n=t),{type:"link",raw:e[0],text:t,href:n,tokens:[{type:"text",raw:t,text:t}]}}}url(r){var t;let e;if(e=this.rules.inline.url.exec(r)){let n,s;if(e[2]==="@")n=e[0],s="mailto:"+n;else{let i;do i=e[0],e[0]=((t=this.rules.inline._backpedal.exec(e[0]))==null?void 0:t[0])??"";while(i!==e[0]);n=e[0],e[1]==="www."?s="http://"+e[0]:s=e[0]}return{type:"link",raw:e[0],text:n,href:s,tokens:[{type:"text",raw:n,text:n}]}}}inlineText(r){const e=this.rules.inline.text.exec(r);if(e){const t=this.lexer.state.inRawBlock;return{type:"text",raw:e[0],text:e[0],escaped:t}}}},v=class V{constructor(e){m(this,"tokens");m(this,"options");m(this,"state");m(this,"tokenizer");m(this,"inlineQueue");this.tokens=[],this.tokens.links=Object.create(null),this.options=e||$,this.options.tokenizer=this.options.tokenizer||new M,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options,this.tokenizer.lexer=this,this.inlineQueue=[],this.state={inLink:!1,inRawBlock:!1,top:!0};const t={other:k,block:N.normal,inline:I.normal};this.options.pedantic?(t.block=N.pedantic,t.inline=I.pedantic):this.options.gfm&&(t.block=N.gfm,this.options.breaks?t.inline=I.breaks:t.inline=I.gfm),this.tokenizer.rules=t}static get rules(){return{block:N,inline:I}}static lex(e,t){return new V(t).lex(e)}static lexInline(e,t){return new V(t).inlineTokens(e)}lex(e){e=e.replace(k.carriageReturn,`
`),this.blockTokens(e,this.tokens);for(let t=0;t<this.inlineQueue.length;t++){const n=this.inlineQueue[t];this.inlineTokens(n.src,n.tokens)}return this.inlineQueue=[],this.tokens}blockTokens(e,t=[],n=!1){var s,i,c;for(this.options.pedantic&&(e=e.replace(k.tabCharGlobal,"    ").replace(k.spaceLine,""));e;){let a;if((i=(s=this.options.extensions)==null?void 0:s.block)!=null&&i.some(o=>(a=o.call({lexer:this},e,t))?(e=e.substring(a.raw.length),t.push(a),!0):!1))continue;if(a=this.tokenizer.space(e)){e=e.substring(a.raw.length);const o=t.at(-1);a.raw.length===1&&o!==void 0?o.raw+=`
`:t.push(a);continue}if(a=this.tokenizer.code(e)){e=e.substring(a.raw.length);const o=t.at(-1);(o==null?void 0:o.type)==="paragraph"||(o==null?void 0:o.type)==="text"?(o.raw+=`
`+a.raw,o.text+=`
`+a.text,this.inlineQueue.at(-1).src=o.text):t.push(a);continue}if(a=this.tokenizer.fences(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.heading(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.hr(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.blockquote(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.list(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.html(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.def(e)){e=e.substring(a.raw.length);const o=t.at(-1);(o==null?void 0:o.type)==="paragraph"||(o==null?void 0:o.type)==="text"?(o.raw+=`
`+a.raw,o.text+=`
`+a.raw,this.inlineQueue.at(-1).src=o.text):this.tokens.links[a.tag]||(this.tokens.links[a.tag]={href:a.href,title:a.title});continue}if(a=this.tokenizer.table(e)){e=e.substring(a.raw.length),t.push(a);continue}if(a=this.tokenizer.lheading(e)){e=e.substring(a.raw.length),t.push(a);continue}let p=e;if((c=this.options.extensions)!=null&&c.startBlock){let o=1/0;const l=e.slice(1);let d;this.options.extensions.startBlock.forEach(h=>{d=h.call({lexer:this},l),typeof d=="number"&&d>=0&&(o=Math.min(o,d))}),o<1/0&&o>=0&&(p=e.substring(0,o+1))}if(this.state.top&&(a=this.tokenizer.paragraph(p))){const o=t.at(-1);n&&(o==null?void 0:o.type)==="paragraph"?(o.raw+=`
`+a.raw,o.text+=`
`+a.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=o.text):t.push(a),n=p.length!==e.length,e=e.substring(a.raw.length);continue}if(a=this.tokenizer.text(e)){e=e.substring(a.raw.length);const o=t.at(-1);(o==null?void 0:o.type)==="text"?(o.raw+=`
`+a.raw,o.text+=`
`+a.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=o.text):t.push(a);continue}if(e){const o="Infinite loop on byte: "+e.charCodeAt(0);if(this.options.silent){console.error(o);break}else throw new Error(o)}}return this.state.top=!0,t}inline(e,t=[]){return this.inlineQueue.push({src:e,tokens:t}),t}inlineTokens(e,t=[]){var a,p,o;let n=e,s=null;if(this.tokens.links){const l=Object.keys(this.tokens.links);if(l.length>0)for(;(s=this.tokenizer.rules.inline.reflinkSearch.exec(n))!=null;)l.includes(s[0].slice(s[0].lastIndexOf("[")+1,-1))&&(n=n.slice(0,s.index)+"["+"a".repeat(s[0].length-2)+"]"+n.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex))}for(;(s=this.tokenizer.rules.inline.anyPunctuation.exec(n))!=null;)n=n.slice(0,s.index)+"++"+n.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);for(;(s=this.tokenizer.rules.inline.blockSkip.exec(n))!=null;)n=n.slice(0,s.index)+"["+"a".repeat(s[0].length-2)+"]"+n.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);let i=!1,c="";for(;e;){i||(c=""),i=!1;let l;if((p=(a=this.options.extensions)==null?void 0:a.inline)!=null&&p.some(h=>(l=h.call({lexer:this},e,t))?(e=e.substring(l.raw.length),t.push(l),!0):!1))continue;if(l=this.tokenizer.escape(e)){e=e.substring(l.raw.length),t.push(l);continue}if(l=this.tokenizer.tag(e)){e=e.substring(l.raw.length),t.push(l);continue}if(l=this.tokenizer.link(e)){e=e.substring(l.raw.length),t.push(l);continue}if(l=this.tokenizer.reflink(e,this.tokens.links)){e=e.substring(l.raw.length);const h=t.at(-1);l.type==="text"&&(h==null?void 0:h.type)==="text"?(h.raw+=l.raw,h.text+=l.text):t.push(l);continue}if(l=this.tokenizer.emStrong(e,n,c)){e=e.substring(l.raw.length),t.push(l);continue}if(l=this.tokenizer.codespan(e)){e=e.substring(l.raw.length),t.push(l);continue}if(l=this.tokenizer.br(e)){e=e.substring(l.raw.length),t.push(l);continue}if(l=this.tokenizer.del(e)){e=e.substring(l.raw.length),t.push(l);continue}if(l=this.tokenizer.autolink(e)){e=e.substring(l.raw.length),t.push(l);continue}if(!this.state.inLink&&(l=this.tokenizer.url(e))){e=e.substring(l.raw.length),t.push(l);continue}let d=e;if((o=this.options.extensions)!=null&&o.startInline){let h=1/0;const x=e.slice(1);let u;this.options.extensions.startInline.forEach(b=>{u=b.call({lexer:this},x),typeof u=="number"&&u>=0&&(h=Math.min(h,u))}),h<1/0&&h>=0&&(d=e.substring(0,h+1))}if(l=this.tokenizer.inlineText(d)){e=e.substring(l.raw.length),l.raw.slice(-1)!=="_"&&(c=l.raw.slice(-1)),i=!0;const h=t.at(-1);(h==null?void 0:h.type)==="text"?(h.raw+=l.raw,h.text+=l.text):t.push(l);continue}if(e){const h="Infinite loop on byte: "+e.charCodeAt(0);if(this.options.silent){console.error(h);break}else throw new Error(h)}}return t}},q=class{constructor(r){m(this,"options");m(this,"parser");this.options=r||$}space(r){return""}code({text:r,lang:e,escaped:t}){var i;const n=(i=(e||"").match(k.notSpaceStart))==null?void 0:i[0],s=r.replace(k.endingNewline,"")+`
`;return n?'<pre><code class="language-'+w(n)+'">'+(t?s:w(s,!0))+`</code></pre>
`:"<pre><code>"+(t?s:w(s,!0))+`</code></pre>
`}blockquote({tokens:r}){return`<blockquote>
${this.parser.parse(r)}</blockquote>
`}html({text:r}){return r}heading({tokens:r,depth:e}){return`<h${e}>${this.parser.parseInline(r)}</h${e}>
`}hr(r){return`<hr>
`}list(r){const e=r.ordered,t=r.start;let n="";for(let c=0;c<r.items.length;c++){const a=r.items[c];n+=this.listitem(a)}const s=e?"ol":"ul",i=e&&t!==1?' start="'+t+'"':"";return"<"+s+i+`>
`+n+"</"+s+`>
`}listitem(r){var t;let e="";if(r.task){const n=this.checkbox({checked:!!r.checked});r.loose?((t=r.tokens[0])==null?void 0:t.type)==="paragraph"?(r.tokens[0].text=n+" "+r.tokens[0].text,r.tokens[0].tokens&&r.tokens[0].tokens.length>0&&r.tokens[0].tokens[0].type==="text"&&(r.tokens[0].tokens[0].text=n+" "+w(r.tokens[0].tokens[0].text),r.tokens[0].tokens[0].escaped=!0)):r.tokens.unshift({type:"text",raw:n+" ",text:n+" ",escaped:!0}):e+=n+" "}return e+=this.parser.parse(r.tokens,!!r.loose),`<li>${e}</li>
`}checkbox({checked:r}){return"<input "+(r?'checked="" ':"")+'disabled="" type="checkbox">'}paragraph({tokens:r}){return`<p>${this.parser.parseInline(r)}</p>
`}table(r){let e="",t="";for(let s=0;s<r.header.length;s++)t+=this.tablecell(r.header[s]);e+=this.tablerow({text:t});let n="";for(let s=0;s<r.rows.length;s++){const i=r.rows[s];t="";for(let c=0;c<i.length;c++)t+=this.tablecell(i[c]);n+=this.tablerow({text:t})}return n&&(n=`<tbody>${n}</tbody>`),`<table>
<thead>
`+e+`</thead>
`+n+`</table>
`}tablerow({text:r}){return`<tr>
${r}</tr>
`}tablecell(r){const e=this.parser.parseInline(r.tokens),t=r.header?"th":"td";return(r.align?`<${t} align="${r.align}">`:`<${t}>`)+e+`</${t}>
`}strong({tokens:r}){return`<strong>${this.parser.parseInline(r)}</strong>`}em({tokens:r}){return`<em>${this.parser.parseInline(r)}</em>`}codespan({text:r}){return`<code>${w(r,!0)}</code>`}br(r){return"<br>"}del({tokens:r}){return`<del>${this.parser.parseInline(r)}</del>`}link({href:r,title:e,tokens:t}){const n=this.parser.parseInline(t),s=ge(r);if(s===null)return n;r=s;let i='<a href="'+r+'"';return e&&(i+=' title="'+w(e)+'"'),i+=">"+n+"</a>",i}image({href:r,title:e,text:t,tokens:n}){n&&(t=this.parser.parseInline(n,this.parser.textRenderer));const s=ge(r);if(s===null)return w(t);r=s;let i=`<img src="${r}" alt="${t}"`;return e&&(i+=` title="${w(e)}"`),i+=">",i}text(r){return"tokens"in r&&r.tokens?this.parser.parseInline(r.tokens):"escaped"in r&&r.escaped?r.text:w(r.text)}},F=class{strong({text:r}){return r}em({text:r}){return r}codespan({text:r}){return r}del({text:r}){return r}html({text:r}){return r}text({text:r}){return r}link({text:r}){return""+r}image({text:r}){return""+r}br(){return""}},S=class ee{constructor(e){m(this,"options");m(this,"renderer");m(this,"textRenderer");this.options=e||$,this.options.renderer=this.options.renderer||new q,this.renderer=this.options.renderer,this.renderer.options=this.options,this.renderer.parser=this,this.textRenderer=new F}static parse(e,t){return new ee(t).parse(e)}static parseInline(e,t){return new ee(t).parseInline(e)}parse(e,t=!0){var s,i;let n="";for(let c=0;c<e.length;c++){const a=e[c];if((i=(s=this.options.extensions)==null?void 0:s.renderers)!=null&&i[a.type]){const o=a,l=this.options.extensions.renderers[o.type].call({parser:this},o);if(l!==!1||!["space","hr","heading","code","table","blockquote","list","html","paragraph","text"].includes(o.type)){n+=l||"";continue}}const p=a;switch(p.type){case"space":{n+=this.renderer.space(p);continue}case"hr":{n+=this.renderer.hr(p);continue}case"heading":{n+=this.renderer.heading(p);continue}case"code":{n+=this.renderer.code(p);continue}case"table":{n+=this.renderer.table(p);continue}case"blockquote":{n+=this.renderer.blockquote(p);continue}case"list":{n+=this.renderer.list(p);continue}case"html":{n+=this.renderer.html(p);continue}case"paragraph":{n+=this.renderer.paragraph(p);continue}case"text":{let o=p,l=this.renderer.text(o);for(;c+1<e.length&&e[c+1].type==="text";)o=e[++c],l+=`
`+this.renderer.text(o);t?n+=this.renderer.paragraph({type:"paragraph",raw:l,text:l,tokens:[{type:"text",raw:l,text:l,escaped:!0}]}):n+=l;continue}default:{const o='Token with "'+p.type+'" type was not found.';if(this.options.silent)return console.error(o),"";throw new Error(o)}}}return n}parseInline(e,t=this.renderer){var s,i;let n="";for(let c=0;c<e.length;c++){const a=e[c];if((i=(s=this.options.extensions)==null?void 0:s.renderers)!=null&&i[a.type]){const o=this.options.extensions.renderers[a.type].call({parser:this},a);if(o!==!1||!["escape","html","link","image","strong","em","codespan","br","del","text"].includes(a.type)){n+=o||"";continue}}const p=a;switch(p.type){case"escape":{n+=t.text(p);break}case"html":{n+=t.html(p);break}case"link":{n+=t.link(p);break}case"image":{n+=t.image(p);break}case"strong":{n+=t.strong(p);break}case"em":{n+=t.em(p);break}case"codespan":{n+=t.codespan(p);break}case"br":{n+=t.br(p);break}case"del":{n+=t.del(p);break}case"text":{n+=t.text(p);break}default:{const o='Token with "'+p.type+'" type was not found.';if(this.options.silent)return console.error(o),"";throw new Error(o)}}}return n}},H=(X=class{constructor(r){m(this,"options");m(this,"block");this.options=r||$}preprocess(r){return r}postprocess(r){return r}processAllTokens(r){return r}provideLexer(){return this.block?v.lex:v.lexInline}provideParser(){return this.block?S.parse:S.parseInline}},m(X,"passThroughHooks",new Set(["preprocess","postprocess","processAllTokens"])),X),rt=class{constructor(...r){m(this,"defaults",O());m(this,"options",this.setOptions);m(this,"parse",this.parseMarkdown(!0));m(this,"parseInline",this.parseMarkdown(!1));m(this,"Parser",S);m(this,"Renderer",q);m(this,"TextRenderer",F);m(this,"Lexer",v);m(this,"Tokenizer",M);m(this,"Hooks",H);this.use(...r)}walkTokens(r,e){var n,s;let t=[];for(const i of r)switch(t=t.concat(e.call(this,i)),i.type){case"table":{const c=i;for(const a of c.header)t=t.concat(this.walkTokens(a.tokens,e));for(const a of c.rows)for(const p of a)t=t.concat(this.walkTokens(p.tokens,e));break}case"list":{const c=i;t=t.concat(this.walkTokens(c.items,e));break}default:{const c=i;(s=(n=this.defaults.extensions)==null?void 0:n.childTokens)!=null&&s[c.type]?this.defaults.extensions.childTokens[c.type].forEach(a=>{const p=c[a].flat(1/0);t=t.concat(this.walkTokens(p,e))}):c.tokens&&(t=t.concat(this.walkTokens(c.tokens,e)))}}return t}use(...r){const e=this.defaults.extensions||{renderers:{},childTokens:{}};return r.forEach(t=>{const n={...t};if(n.async=this.defaults.async||n.async||!1,t.extensions&&(t.extensions.forEach(s=>{if(!s.name)throw new Error("extension name required");if("renderer"in s){const i=e.renderers[s.name];i?e.renderers[s.name]=function(...c){let a=s.renderer.apply(this,c);return a===!1&&(a=i.apply(this,c)),a}:e.renderers[s.name]=s.renderer}if("tokenizer"in s){if(!s.level||s.level!=="block"&&s.level!=="inline")throw new Error("extension level must be 'block' or 'inline'");const i=e[s.level];i?i.unshift(s.tokenizer):e[s.level]=[s.tokenizer],s.start&&(s.level==="block"?e.startBlock?e.startBlock.push(s.start):e.startBlock=[s.start]:s.level==="inline"&&(e.startInline?e.startInline.push(s.start):e.startInline=[s.start]))}"childTokens"in s&&s.childTokens&&(e.childTokens[s.name]=s.childTokens)}),n.extensions=e),t.renderer){const s=this.defaults.renderer||new q(this.defaults);for(const i in t.renderer){if(!(i in s))throw new Error(`renderer '${i}' does not exist`);if(["options","parser"].includes(i))continue;const c=i,a=t.renderer[c],p=s[c];s[c]=(...o)=>{let l=a.apply(s,o);return l===!1&&(l=p.apply(s,o)),l||""}}n.renderer=s}if(t.tokenizer){const s=this.defaults.tokenizer||new M(this.defaults);for(const i in t.tokenizer){if(!(i in s))throw new Error(`tokenizer '${i}' does not exist`);if(["options","rules","lexer"].includes(i))continue;const c=i,a=t.tokenizer[c],p=s[c];s[c]=(...o)=>{let l=a.apply(s,o);return l===!1&&(l=p.apply(s,o)),l}}n.tokenizer=s}if(t.hooks){const s=this.defaults.hooks||new H;for(const i in t.hooks){if(!(i in s))throw new Error(`hook '${i}' does not exist`);if(["options","block"].includes(i))continue;const c=i,a=t.hooks[c],p=s[c];H.passThroughHooks.has(i)?s[c]=o=>{if(this.defaults.async)return Promise.resolve(a.call(s,o)).then(d=>p.call(s,d));const l=a.call(s,o);return p.call(s,l)}:s[c]=(...o)=>{let l=a.apply(s,o);return l===!1&&(l=p.apply(s,o)),l}}n.hooks=s}if(t.walkTokens){const s=this.defaults.walkTokens,i=t.walkTokens;n.walkTokens=function(c){let a=[];return a.push(i.call(this,c)),s&&(a=a.concat(s.call(this,c))),a}}this.defaults={...this.defaults,...n}}),this}setOptions(r){return this.defaults={...this.defaults,...r},this}lexer(r,e){return v.lex(r,e??this.defaults)}parser(r,e){return S.parse(r,e??this.defaults)}parseMarkdown(r){return(t,n)=>{const s={...n},i={...this.defaults,...s},c=this.onError(!!i.silent,!!i.async);if(this.defaults.async===!0&&s.async===!1)return c(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));if(typeof t>"u"||t===null)return c(new Error("marked(): input parameter is undefined or null"));if(typeof t!="string")return c(new Error("marked(): input parameter is of type "+Object.prototype.toString.call(t)+", string expected"));i.hooks&&(i.hooks.options=i,i.hooks.block=r);const a=i.hooks?i.hooks.provideLexer():r?v.lex:v.lexInline,p=i.hooks?i.hooks.provideParser():r?S.parse:S.parseInline;if(i.async)return Promise.resolve(i.hooks?i.hooks.preprocess(t):t).then(o=>a(o,i)).then(o=>i.hooks?i.hooks.processAllTokens(o):o).then(o=>i.walkTokens?Promise.all(this.walkTokens(o,i.walkTokens)).then(()=>o):o).then(o=>p(o,i)).then(o=>i.hooks?i.hooks.postprocess(o):o).catch(c);try{i.hooks&&(t=i.hooks.preprocess(t));let o=a(t,i);i.hooks&&(o=i.hooks.processAllTokens(o)),i.walkTokens&&this.walkTokens(o,i.walkTokens);let l=p(o,i);return i.hooks&&(l=i.hooks.postprocess(l)),l}catch(o){return c(o)}}}onError(r,e){return t=>{if(t.message+=`
Please report this to https://github.com/markedjs/marked.`,r){const n="<p>An error occurred:</p><pre>"+w(t.message+"",!0)+"</pre>";return e?Promise.resolve(n):n}if(e)return Promise.reject(t);throw t}}},T=new rt;function f(r,e){return T.parse(r,e)}f.options=f.setOptions=function(r){return T.setOptions(r),f.defaults=T.defaults,te(f.defaults),f},f.getDefaults=O,f.defaults=$,f.use=function(...r){return T.use(...r),f.defaults=T.defaults,te(f.defaults),f},f.walkTokens=function(r,e){return T.walkTokens(r,e)},f.parseInline=T.parseInline,f.Parser=S,f.parser=S.parse,f.Renderer=q,f.TextRenderer=F,f.Lexer=v,f.lexer=v.lex,f.Tokenizer=M,f.Hooks=H,f.parse=f,f.options,f.setOptions,f.use,f.walkTokens,f.parseInline,S.parse,v.lex;class st{constructor(e,t){this.container=e,this.primaryColor=t}appendUserMessage(e){const t=document.createElement("div");t.className="sr-msg-row user";const n=document.createElement("div");n.className="sr-chat-msg-user",n.style.background=this.primaryColor,n.textContent=e;const s=document.createElement("div");s.className="sr-msg-time",s.textContent=this.formatTime(),t.appendChild(n),t.appendChild(s),this.container.appendChild(t),this.scrollToBottom()}appendAssistantMessage(e){const t=document.createElement("div");t.className="sr-msg-row assistant";const n=document.createElement("div");return n.className="sr-chat-msg-assistant",n.innerHTML=f.parse(e),t.appendChild(n),this.container.appendChild(t),this.scrollToBottom(),n}updateAssistantMessage(e,t){e.innerHTML=f.parse(t),this.scrollToBottom()}appendProductCard(e){var o;const t=(((o=window.SmartRecConciergeMeta)==null?void 0:o.shop)??"").replace(/\/$/,""),n=e.handle?`https://${t}/products/${e.handle}`:"#";let s=this.container.querySelector(".sr-products-row:last-child");(!s||s.nextSibling!==null)&&(s=document.createElement("div"),s.className="sr-products-row",this.container.appendChild(s));const i=document.createElement("a");if(i.className="sr-chat-product",i.href=n,i.target="_blank",i.rel="noopener noreferrer",e.image){const l=document.createElement("img");l.src=e.image,l.alt=e.title??"",l.loading="lazy",i.appendChild(l)}const c=document.createElement("div");c.className="sr-chat-product-info";const a=document.createElement("div");if(a.className="sr-chat-product-title",a.textContent=e.title??"",c.appendChild(a),e.price){const l=document.createElement("div");l.className="sr-chat-product-price",l.textContent=`$${e.price}`,c.appendChild(l)}if(e.reason){const l=document.createElement("div");l.className="sr-chat-product-reason",l.textContent=e.reason,c.appendChild(l)}const p=document.createElement("span");p.className="sr-chat-product-arrow",p.textContent="›",i.appendChild(c),i.appendChild(p),s.appendChild(i),this.scrollToBottom()}appendQuickReplies(e){if(!e.length)return;const t=document.createElement("div");t.className="sr-quick-replies";for(const n of e){const s=document.createElement("button");s.className="sr-quick-reply",s.style.borderColor=this.hexWithAlpha(this.primaryColor,.35),s.style.color=this.primaryColor,s.textContent=n,s.addEventListener("click",()=>{var i;t.remove(),(i=this.onQuickReply)==null||i.call(this,n)}),t.appendChild(s)}this.container.appendChild(t),this.scrollToBottom()}appendImageGrid(e){if(!e.length)return;const t=document.createElement("div");t.className="sr-image-grid";for(const{src:n,caption:s}of e){const i=document.createElement("div");i.className="sr-image-card";const c=document.createElement("img");c.src=n,c.alt=s,c.loading="lazy",i.appendChild(c);const a=document.createElement("div");a.className="sr-image-card-caption",a.textContent=s,i.appendChild(a),t.appendChild(i)}this.container.appendChild(t),this.scrollToBottom()}showTypingIndicator(){const e=document.createElement("div");e.className="sr-msg-row assistant",e.id="sr-typing-row";const t=document.createElement("div");t.className="sr-chat-typing",t.id="sr-typing-indicator";for(let n=0;n<3;n++){const s=document.createElement("span");s.style.background=this.primaryColor,t.appendChild(s)}e.appendChild(t),this.container.appendChild(e),this.scrollToBottom()}hideTypingIndicator(){var e,t;(e=document.getElementById("sr-typing-row"))==null||e.remove(),(t=document.getElementById("sr-typing-indicator"))==null||t.remove()}showError(e){this.appendAssistantMessage(`⚠️ ${e}`)}scrollToBottom(){this.container.scrollTop=this.container.scrollHeight}formatTime(){return new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}hexWithAlpha(e,t){const n=parseInt(e.slice(1,3),16),s=parseInt(e.slice(3,5),16),i=parseInt(e.slice(5,7),16);return`rgba(${n},${s},${i},${t})`}}class it{constructor(e,t){this.launcher=e,this.meta=t,this.state="idle",this.timerId=null,this.popover=null,this.onChatOpen=null}start(e){if(this.onChatOpen=e??null,!this.meta.productId){this.state="idle";return}this.launcher.setPulse(!0),this.state="waiting",this.timerId=setTimeout(()=>{this.state==="waiting"&&this.showPopover()},2e3)}stop(){this.timerId&&(clearTimeout(this.timerId),this.timerId=null),this.launcher.setPulse(!1),this.removePopover(),this.state="idle"}notifyChatOpened(){this.state==="showing"&&this.dismiss(),this.launcher.setPulse(!1)}showPopover(){this.state="showing";const e=document.createElement("div");e.className="sr-proactive-popover";const t=document.createElement("div");t.className="sr-proactive-header";const n=document.createElement("div");n.className="sr-proactive-avatar",n.style.background=`linear-gradient(135deg, ${this.meta.primaryColor}22, ${this.meta.primaryColor}44)`,n.innerHTML=`<svg width="16" height="16" viewBox="0 0 24 24" fill="${this.meta.primaryColor}"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>`,t.appendChild(n);const s=document.createElement("div");s.className="sr-proactive-agent-name",s.textContent=this.meta.agentName,t.appendChild(s);const i=document.createElement("button");i.className="sr-proactive-close",i.innerHTML="&times;",i.setAttribute("aria-label","Dismiss"),i.addEventListener("click",o=>{o.stopPropagation(),this.dismiss()}),t.appendChild(i),e.appendChild(t);const c=document.createElement("p");c.className="sr-proactive-text";const a=this.meta.productTitle?`"${this.meta.productTitle}"`:"this product";c.textContent=this.meta.proactiveMessage||`Interested in ${a}? Let me explain why it could be perfect for you! ✨`,e.appendChild(c);const p=document.createElement("button");p.className="sr-proactive-action",p.style.background=`linear-gradient(135deg, ${this.meta.primaryColor}, ${this.darken(this.meta.primaryColor,20)})`,p.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Chat now',p.addEventListener("click",o=>{var l;o.stopPropagation(),this.dismiss(),this.launcher.show(),(l=this.onChatOpen)==null||l.call(this)}),e.appendChild(p),document.body.appendChild(e),this.popover=e,requestAnimationFrame(()=>{requestAnimationFrame(()=>e.classList.add("visible"))})}dismiss(){this.state="dismissed",this.launcher.setPulse(!1),this.removePopover()}removePopover(){if(this.popover){this.popover.classList.remove("visible");const e=this.popover;setTimeout(()=>e.remove(),300),this.popover=null}}darken(e,t){const n=a=>Math.max(0,Math.min(255,a)),s=n(parseInt(e.slice(1,3),16)-t),i=n(parseInt(e.slice(3,5),16)-t),c=n(parseInt(e.slice(5,7),16)-t);return`#${s.toString(16).padStart(2,"0")}${i.toString(16).padStart(2,"0")}${c.toString(16).padStart(2,"0")}`}}const at=["What makes this product special?","Show me similar products","What's the return policy?","Help me choose the right one"],ot=["Tell me more about this product","Is it worth the price?","Show me alternatives","How do I use it?"];class lt extends HTMLElement{constructor(){super(...arguments),this.isLoading=!1}connectedCallback(){const e=window.SmartRecConciergeMeta;e&&(this.meta=e,this.injectStyles(),this.launcher=new y(this,this.meta,t=>{var n;t&&((n=this.proactiveHandler)==null||n.notifyChatOpened())}),this.chatService=new R(e.appProxy),this.messageManager=new ye,this.renderer=new st(this.launcher.messagesContainer,e.primaryColor),this.renderer.onQuickReply=t=>{this.launcher.input.value=t,this.dispatchSend()},this.proactiveHandler=new it(this.launcher,this.meta),this.launcher.input.addEventListener("keydown",t=>{t.key==="Enter"&&!t.shiftKey&&(t.preventDefault(),this.dispatchSend())}),this.renderer.appendAssistantMessage(`Hi! I'm **${e.agentName}** — your personal shopping assistant. I can help you find the perfect product, answer questions, and give personalized recommendations. 🛍️`),this.renderer.appendQuickReplies(at),this.proactiveHandler.start(()=>{if(this.meta.productId&&this.meta.productTitle){const t=`Please explain "${this.meta.productTitle}" to me — what makes it special, who it's for, and why I should consider buying it. Be helpful and visual.`;this.launcher.input.value=t,this.dispatchSend()}else this.renderer.appendQuickReplies(ot)}))}disconnectedCallback(){var e;(e=this.proactiveHandler)==null||e.stop()}injectStyles(){if(document.getElementById("sr-concierge-styles"))return;const e=document.createElement("style");e.id="sr-concierge-styles",e.textContent=C,document.head.appendChild(e)}dispatchSend(){const e=this.launcher.input.value.trim();!e||this.isLoading||(this.launcher.input.value="",this.sendMessage(e))}async sendMessage(e){this.isLoading=!0,this.launcher.setLoading(!0),this.renderer.appendUserMessage(e),this.messageManager.add("user",e),this.renderer.showTypingIndicator();let t="",n=null;const s=[];await this.chatService.sendMessage(e,this.messageManager.getLastN(10),this.meta,i=>{if(i.type==="text"&&i.content)this.renderer.hideTypingIndicator(),t+=i.content,n?this.renderer.updateAssistantMessage(n,t):n=this.renderer.appendAssistantMessage(t);else if(i.type==="product")this.renderer.appendProductCard(i),s.push(i);else if(i.type==="error"||i.type==="rate_limit_exceeded")this.renderer.hideTypingIndicator(),this.renderer.showError(i.type==="rate_limit_exceeded"?"You've reached the monthly chat limit. Upgrade for unlimited access.":i.error||"Something went wrong. Please try again.");else if(i.type==="end_turn"){this.renderer.hideTypingIndicator(),t&&this.messageManager.add("assistant",t);const c=this.buildFollowUpSuggestions(e,s.length>0);c.length&&this.renderer.appendQuickReplies(c)}}),this.isLoading=!1,this.launcher.setLoading(!1)}buildFollowUpSuggestions(e,t){const n=e.toLowerCase();return n.includes("explain")||n.includes("special")||n.includes("tell me")?["Is it worth the price?","Show me similar products","What sizes are available?","Add to cart"]:n.includes("similar")||n.includes("alternatives")||n.includes("other")?["Compare these products","Which one is best for me?","Show me reviews"]:n.includes("price")||n.includes("worth")||n.includes("cost")?["Do you offer discounts?","What's included?","Is there a warranty?"]:n.includes("quiz")||n.includes("help me choose")||n.includes("right one")?["Start the quiz","Show me bestsellers","What's most popular?"]:t?["Tell me more about the first one","Compare these","Which is best value?"]:["Tell me more","Show me products","What else can you help with?"]}}customElements.get("smartrec-concierge")||customElements.define("smartrec-concierge",lt)})();
