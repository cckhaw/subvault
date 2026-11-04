/**
 * Plasmo content-script entry. Plasmo discovers content scripts in `src/contents/`;
 * the sheet itself lives in `src/content/checkout-modal.tsx`.
 */
import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo";
import cssText from "data-text:~styles/globals.css";

import { CheckoutModal } from "~content/checkout-modal";

export const config: PlasmoCSConfig = {
  matches: ["https://*/*", "http://*/*"],
  all_frames: false,
  run_at: "document_idle"
};

/** Style the shadow root: map :root → :host and rem → px so the host page's font-size can't distort the sheet. */
export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style");
  style.textContent = cssText
    .replaceAll(":root", ":host(plasmo-csui)")
    .replace(/(\d*\.?\d+)rem/g, (_, n: string) => `${parseFloat(n) * 16}px`);
  return style;
};

export default CheckoutModal;
