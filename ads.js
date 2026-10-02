import { ADSENSE_CLIENT, ADSENSE_SLOT, adsConfigured } from "./ads-config.js";

function initAdRail() {
  const rail = document.getElementById("ad-rail");
  const ins = document.getElementById("adsense-unit");
  if (!rail || !ins) return;

  if (!adsConfigured()) {
    rail.hidden = true;
    return;
  }

  rail.hidden = false;
  document.body.classList.add("ads-active");

  ins.setAttribute("data-ad-client", ADSENSE_CLIENT);
  ins.setAttribute("data-ad-slot", ADSENSE_SLOT);

  const script = document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT)}`;
  script.addEventListener("load", () => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* Ad blockers or policy holds */
    }
  });
  script.addEventListener("error", () => {
    rail.hidden = true;
    document.body.classList.remove("ads-active");
  });
  document.head.appendChild(script);
}

initAdRail();
