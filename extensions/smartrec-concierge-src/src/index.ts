import { SmartRecConcierge } from "./smartrec-concierge";

if (!customElements.get("smartrec-concierge")) {
  customElements.define("smartrec-concierge", SmartRecConcierge);
}
