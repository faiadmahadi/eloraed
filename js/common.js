/* Shared by every page: React helpers, icons, nav, reveal and magnetic buttons.
   Classic script: its top-level consts are visible to the page script that follows. */
const { useState, useEffect, useRef, useCallback, useMemo } = React;
const html = htm.bind(React.createElement);

const FB = "https://www.facebook.com/profile.php?id=61596032286335";
const MESSENGER = "https://m.me/1408069942390202";
const bn = (n) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
const taka = (n) => "৳" + bn(Number(n || 0).toLocaleString("en-IN"));

const FbIcon = () => html`<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8.5V6.8c0-.8.5-1 .9-1H17V2.2L14 2.2c-3.3 0-4 2.4-4 4v2.3H8v3.7h2V22h4v-9.8h2.7l.4-3.7z"/></svg>`;
const BagIcon = () => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>`;
const Arrow = ({ left }) => html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d=${left ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}/></svg>`;

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Reveal: elements below the fold start offset and slide in once */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    el.classList.add("rv");
    if (el.getBoundingClientRect().top < innerHeight) return;
    el.classList.add("pre");
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.remove("pre"); io.disconnect(); } }, { rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}
const Reveal = ({ as = "div", className = "", style, children }) => {
  const ref = useReveal();
  return React.createElement(as, { ref, className, style }, children);
};

/* Magnetic button */
function Magnet({ href, className, children, onClick, newTab = true, type, disabled }) {
  const ref = useRef(null);
  const move = (e) => {
    if (reduced) return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px, ${(e.clientY - r.top - r.height / 2) * .35}px)`;
  };
  const leave = () => { ref.current.style.transform = ""; };
  const props = { ref, className: `magnet ${className}`, onMouseMove: move, onMouseLeave: leave };
  return href
    ? html`<a ...${props} href=${href} target=${newTab ? "_blank" : undefined} rel="noopener">${children}</a>`
    : html`<button ...${props} type=${type || "button"} disabled=${disabled} onClick=${onClick}>${children}</button>`;
}

/* page: "home" | "shop" */
function Nav({ page = "home" }) {
  const home = page === "home" ? "" : "./";
  return html`<nav className="nav"><div className="wrap"><div className="nav-in">
    <a className="logo" href=${page === "home" ? "#top" : "./"}><img src="img/logo.png" alt="" />EloraEd</a>
    <div className="links">
      <a href=${home + "#videos"}>ভিডিও</a><a href=${home + "#how"}>যেভাবে শেখো</a><a href=${home + "#quiz"}>কুইজ</a>
      <a href="shop" className=${page === "shop" ? "here" : ""}>শপ</a>
    </div>
    <a className=${`shop-btn ${page === "shop" ? "here" : ""}`} href="shop" aria-label="শপ"><${BagIcon} /><span>শপ</span></a>
    <${Magnet} href=${FB} className="pill pill-orange"><${FbIcon} /><span className="fb-t">ফলো করো</span><//>
  </div></div></nav>`;
}

function Foot() {
  return html`<div className="foot"><span>© ২০২৬ EloraEd · এলোরা বিজ্ঞান</span><span><a href="./">হোম</a> · <a href="shop">শপ</a> · <a href=${FB} target="_blank" rel="noopener">Facebook</a></span></div>`;
}
