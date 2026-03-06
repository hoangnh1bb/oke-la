/** CSS injected as a <style> tag into the document by the SmartRecConcierge web component */
export const STYLES: string = `
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
`;
