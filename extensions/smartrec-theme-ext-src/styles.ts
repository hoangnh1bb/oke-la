/** CSS injected as a <style> tag into the document by the SmartRecConcierge web component */
export const STYLES: string = `
.sr-chat-bubble {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 999999;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  transition: transform 0.2s;
}
.sr-chat-bubble:hover {
  transform: scale(1.08);
}
.sr-chat-panel {
  position: fixed;
  bottom: 88px;
  right: 20px;
  z-index: 999998;
  width: 350px;
  height: 500px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  display: none;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.sr-chat-panel.open {
  display: flex;
}
.sr-chat-header {
  padding: 14px 16px;
  color: #fff;
  font-weight: 600;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.sr-chat-header-close {
  margin-left: auto;
  background: none;
  border: none;
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  opacity: 0.8;
  line-height: 1;
}
.sr-chat-header-close:hover { opacity: 1; }
.sr-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sr-chat-msg-user {
  align-self: flex-end;
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 14px 14px 4px 14px;
  font-size: 14px;
  line-height: 1.4;
  color: #fff;
  word-break: break-word;
}
.sr-chat-msg-assistant {
  align-self: flex-start;
  max-width: 85%;
  padding: 8px 12px;
  border-radius: 4px 14px 14px 14px;
  background: #f0f0f0;
  font-size: 14px;
  line-height: 1.4;
  color: #222;
  word-break: break-word;
}
.sr-chat-msg-assistant p { margin: 0 0 6px; }
.sr-chat-msg-assistant p:last-child { margin-bottom: 0; }
.sr-chat-msg-assistant ul, .sr-chat-msg-assistant ol { margin: 4px 0; padding-left: 18px; }
.sr-chat-msg-assistant code { background: #e8e8e8; padding: 1px 4px; border-radius: 3px; font-size: 13px; }
.sr-chat-typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: #f0f0f0;
  border-radius: 4px 14px 14px 14px;
  align-self: flex-start;
}
.sr-chat-typing span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #aaa;
  animation: sr-bounce 1.2s infinite;
}
.sr-chat-typing span:nth-child(2) { animation-delay: 0.2s; }
.sr-chat-typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes sr-bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-5px); }
}
.sr-chat-product {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  background: #fafafa;
  margin: 4px 0;
  transition: background 0.15s;
}
.sr-chat-product:hover { background: #f0f0f0; }
.sr-chat-product img {
  width: 52px;
  height: 52px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}
.sr-chat-product-info { flex: 1; min-width: 0; }
.sr-chat-product-title {
  font-size: 13px;
  font-weight: 600;
  color: #222;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sr-chat-product-price { font-size: 12px; color: #555; margin-top: 2px; }
.sr-chat-product-reason { font-size: 11px; color: #888; margin-top: 2px; font-style: italic; }
.sr-chat-input-area {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #eee;
  flex-shrink: 0;
}
.sr-chat-input {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 20px;
  padding: 8px 14px;
  font-size: 14px;
  outline: none;
  font-family: inherit;
  resize: none;
}
.sr-chat-input:focus { border-color: #aaa; }
.sr-chat-send {
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  color: #fff;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: opacity 0.15s;
}
.sr-chat-send:hover { opacity: 0.85; }
.sr-proactive-popover {
  position: fixed;
  bottom: 84px;
  right: 20px;
  z-index: 999997;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  padding: 14px 16px;
  max-width: 260px;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.2s, transform 0.2s;
  pointer-events: none;
}
.sr-proactive-popover.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
.sr-proactive-close {
  position: absolute;
  top: 6px;
  right: 8px;
  background: none;
  border: none;
  font-size: 16px;
  color: #999;
  cursor: pointer;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
.sr-proactive-close:hover { background: #f0f0f0; color: #333; }
.sr-proactive-text {
  font-size: 14px;
  color: #333;
  margin: 0 0 10px;
  line-height: 1.4;
  padding-right: 16px;
}
.sr-proactive-action {
  display: inline-block;
  padding: 6px 16px;
  border: none;
  border-radius: 20px;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}
.sr-proactive-action:hover { opacity: 0.9; }
@media(max-width:480px) {
  .sr-chat-panel {
    width: calc(100vw - 16px);
    right: 8px;
    bottom: 80px;
    height: 70vh;
  }
  .sr-proactive-popover {
    right: 12px;
    bottom: 80px;
    max-width: calc(100vw - 24px);
  }
}
`;
