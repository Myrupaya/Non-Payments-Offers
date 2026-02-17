import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Papa from "papaparse";
import "./App.css";

/** -------------------- CONFIG -------------------- */
const CATEGORY_CONFIG = [
  {
    key: "movie",
    label: "Movie Offers",
    folder: "Movie-Offers",
    files: ["Bookmyshow.csv", "district_paytm.csv", "PVR.csv"],
  },
  {
    key: "hotel",
    label: "Hotel Offers",
    folder: "Hotel-Offers",
    files: ["EaseMyTrip.csv", "Goibibo.csv", "MakeMyTrip.csv", "ixigo.csv", "Yatra.csv"],
  },
  {
    key: "airline",
    label: "Airline Offers",
    folder: "Airline-Offers",
    files: [
      "ixigo.csv",
      "yatraDomestic.csv",
      "easeMyTrip.csv",
      "makemytrip.csv",
      "cleartrip.csv",
      "airindia.csv",
      "goibibo.csv",
      "indigo.csv",
      "yatraInternational.csv",
    ],
  },
  {
    key: "bus",
    label: "Bus Offers",
    folder: "Bus-Offers",
    files: ["Abhibus.csv", "goibibo.csv", "makemytrip.csv", "redbus.csv"],
  },
  {
    key: "electronics",
    label: "Electronics Offers",
    folder: "Electronics-Offers",
    files: ["croma.csv"],
  },
  {
    key: "dineout",
    label: "Dineout Offers",
    folder: "Dineout-Offers",
    files: ["Swiggy.csv", "Eazydiner.csv", "Zomato.csv"],
  },
  {
    key: "delivery",
    label: "Delivery Offers",
    folder: "Delivery-Offers",
    files: ["Swiggy.csv", "Zomato.csv", "UberEats.csv"],
  },
  {
    key: "grocery",
    label: "Grocery Offers",
    folder: "Grocery-Offers",
    files: ["blinkit.csv", "zepto.csv", "swiggy_instamart.csv"],
  },
  {
    key: "ecommerce",
    label: "Ecommerce Offers",
    folder: "Ecommerce-Offers",
    files: ["croma.csv"],
  },
  {
    key: "lounge",
    label: "Lounge Offers",
    folder: "Lounge-Offers",
    files: ["AirportLounge.csv", "RailwayLounge.csv"],
  },
  {
    key: "clothing",
    label: "Clothing Offers",
    folder: "Clothing-Offers",
    files: ["Myntra.csv", "Ajio.csv", "TataCliq.csv"],
  },
];

const LIST_FIELDS = {
  title: ["Offer Title", "Title", "Offer"],
  image: ["Image", "Offer Image", "image", "Credit Card Image", "Image URL"],
  link: ["Link", "Offer Link", "Offer URL", "Url", "URL"],
  desc: ["Description", "Details", "Offer Description", "Benefit"],
  terms: ["Terms and conditions", "Terms & conditions", "Terms & Conditions", "T&C", "Terms"],
  coupon: ["Coupon code", "Coupon Code", "Coupon", "Code"],
};

/**
 * ✅ Put these files inside: public/images/
 * Example: public/images/paytm.jpg  -> use "/images/paytm.jpg"
 *
 * ✅ Must start with "/" in React
 */
const WEBSITE_LOGO_BY_SOURCE = {
  makemytrip: "/images/make%20my%20trip.png",
  airindia: "/images/airindia.webp",
  goibibo: "/images/goibibo.png",
  redbus: "/images/redbus.png",
  abhibus: "/images/abhibus.png",
  ixigo: "/images/ixigo.png",
  easemytrip: "/images/ease%20my%20trip.png",
  yatra: "/images/yatra.png",
  indigo: "/images/Indigo.png",
  croma: "/images/croma.png",
  bookmyshow: "/images/bookmyshow.jpg",
  districtpaytm: "/images/paytm.jpg",
  pvr: "/images/pvr.jpg",
  cleartrip: "/images/cleartrip.png",
  swiggyinstamart: "/images/swiggy_instamart.jpg",
  zepto: "/images/zepto.png",
  zomato:"/images/zomato.png",
  swiggy:"/images/swiggy.png",
  eazydiner:"/images/eazydiner.png"
};

/** -------------------- HELPERS -------------------- */

/** ✅ NEW: removes BOM + zero-width chars that break header matching */
function stripInvisible(s) {
  return String(s || "").replace(/[\uFEFF\u200B-\u200D]/g, "");
}

const toNorm = (s) =>
  stripInvisible(String(s || ""))
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toKeyNorm = (s) => toNorm(s).replace(/_/g, " ");

function isNonEmpty(v) {
  return v !== undefined && v !== null && String(v).trim() !== "";
}

/** ✅ Works even if Papa renamed duplicates: Link -> Link_1 etc */
function pickField(row, candidates) {
  if (!row) return undefined;

  // 1) direct match
  for (const k of candidates) {
    if (isNonEmpty(row[k])) return row[k];
  }

  // 2) normalized match (handles Link_1, Link_2 and BOM headers)
  const wantedNorms = candidates.map(toKeyNorm);
  const keys = Object.keys(row);

  for (const k of keys) {
    const kn = toKeyNorm(k);
    for (const wn of wantedNorms) {
      if (kn === wn || kn.startsWith(wn + " ")) {
        if (isNonEmpty(row[k])) return row[k];
      }
    }
  }
  return undefined;
}

function valueByNormalizedKey(row, wantedKey) {
  const wanted = toKeyNorm(wantedKey);
  if (!row) return undefined;
  const keys = Object.keys(row);
  for (const k of keys) {
    if (toKeyNorm(k) === wanted) return row[k];
  }
  return undefined;
}

function isYes(val) {
  const v = toNorm(val);
  return v === "yes" || v === "y" || v === "true" || v === "1";
}

/**
 * ✅ Only treat REAL URLs or public paths as usable images
 * - Rejects: "Chartered1.png", "Desktop Detail page.png" etc
 */
function isUsableImage(val) {
  if (!val) return false;
  const s = String(val).trim();
  if (!s) return false;
  if (/^(na|n\/a|null|undefined|-|image unavailable)$/i.test(s)) return false;

  if (/^https?:\/\//i.test(s)) return true;
  if (/^data:image\//i.test(s)) return true;
  if (s.startsWith("/")) return true;

  return false;
}

/** ✅ Link normalize (fix for AirIndia etc) */
function normalizeLink(raw) {
  if (!raw) return "";

  let s = stripInvisible(String(raw)).trim();
  if (!s) return "";

  // remove outer quotes
  s = s.replace(/^"+|"+$/g, "").trim();

  // placeholders
  if (/^(na|n\/a|null|undefined|-|#)$/i.test(s)) return "";

  // //example.com
  if (s.startsWith("//")) s = "https:" + s;

  // www.example.com
  if (/^www\./i.test(s)) s = "https://" + s;

  // no scheme but looks like a domain
  const looksLikeDomain = /^[a-z0-9.-]+\.[a-z]{2,}([/].*)?$/i.test(s);
  if (!/^https?:\/\//i.test(s) && looksLikeDomain) s = "https://" + s;

  // must be http(s)
  if (!/^https?:\/\//i.test(s)) return "";

  // validate URL
  try {
    // eslint-disable-next-line no-new
    new URL(s);
    return s;
  } catch {
    return "";
  }
}

/**
 * ✅ Source key mapping:
 * - yatraDomestic / yatraInternational -> yatra
 * - easeMyTrip -> easemytrip
 * - district-paytm -> districtpaytm
 * - Bookmyshow -> bookmyshow
 */
function sourceKeyFromFile(fileName) {
  const base = toNorm(String(fileName || "").replace(/\.csv$/i, ""));

  // remove spaces + - + _
  const cleaned = base.replace(/[\s\-_]/g, "");

  if (cleaned.startsWith("yatra")) return "yatra";
  if (cleaned.includes("easemytrip")) return "easemytrip";

  return cleaned; // airindia, goibibo, indigo, makemytrip, districtpaytm, bookmyshow, pvr, etc
}

function prettySourceName(fileName) {
  const raw = String(fileName || "").replace(/\.csv$/i, "");
  const spaced = raw.replace(/[-_]/g, " ").trim();
  if (!spaced) return "";
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** ✅ resolve image: if missing/invalid -> website logo */
function resolveImage(candidate, sourceFileName) {
  const srcKey = sourceKeyFromFile(sourceFileName);
  const websiteLogo = WEBSITE_LOGO_BY_SOURCE[srcKey] || "";

  if (isUsableImage(candidate)) {
    return { src: String(candidate).trim(), usingFallback: false, fallbackSrc: websiteLogo };
  }
  return { src: websiteLogo, usingFallback: true, fallbackSrc: websiteLogo };
}

/** ✅ if image 404 -> swap to logo */
function handleImgError(e) {
  const el = e.currentTarget;
  const fallback = el.getAttribute("data-fallback") || "";
  if (fallback && el.src !== fallback) {
    el.src = fallback;
    el.classList.add("is-fallback");
    return;
  }
  el.style.display = "none";
}

/** Disclaimer */
const Disclaimer = () => (
  <section className="disclaimer">
    <h3>Disclaimer</h3>
    <p>
      All offers, coupons, and discounts listed on our platform are provided for informational purposes only.
      We do not guarantee the accuracy, availability, or validity of any offer.
      Users are advised to verify the terms and conditions with the respective merchants before making any purchase.
      We are not responsible for any discrepancies, expired offers, or losses arising from the use of these coupons.
    </p>
  </section>
);

export default function NonPaymentOffers() {
  const [activeCategory, setActiveCategory] = useState(CATEGORY_CONFIG?.[0]?.key || null);
  const [loading, setLoading] = useState(false);
  const [rawRows, setRawRows] = useState([]);
  const [error, setError] = useState("");

  const activeCat = useMemo(
    () => CATEGORY_CONFIG.find((c) => c.key === activeCategory) || null,
    [activeCategory]
  );

  async function loadCategory(categoryKey) {
    setActiveCategory(categoryKey);
    setLoading(true);
    setError("");
    setRawRows([]);

    try {
      const cat = CATEGORY_CONFIG.find((c) => c.key === categoryKey);
      if (!cat) {
        setError("Category not found");
        return;
      }

      const all = [];
      const failed = [];

      await Promise.all(
        (cat.files || []).map(async (name) => {
          try {
            const res = await axios.get(`/${cat.folder}/${encodeURIComponent(name)}`);
            const parsed = Papa.parse(res.data, {
              header: true,
              skipEmptyLines: true,
              // ✅ FIX: also strip BOM/zero-width from headers
              transformHeader: (h) => stripInvisible(String(h || "")).trim(),
            });

            const rows = parsed.data || [];
            rows.forEach((r) => all.push({ ...r, __sourceFile: name }));
          } catch (e) {
            failed.push(name);
            console.warn(`Skipping ${cat.folder}/${name}:`, e?.message || e);
          }
        })
      );

      setRawRows(all);

      if (failed.length) setError(`Some files failed to load: ${failed.join(", ")}`);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeCategory) loadCategory(activeCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ✅ Filter only Non-Payments-Offers = yes */
  const offers = useMemo(() => {
    const out = [];
    const NONPAY_KEYS = [
      "Non-Payments-Offers",
      "Non Payment Offers",
      "Non-Payment Offers",
      "NonPaymentsOffers",
      "Non Payments Offers",
    ];

    for (const row of rawRows || []) {
      let flag;
      for (const k of NONPAY_KEYS) {
        const v = valueByNormalizedKey(row, k);
        if (isNonEmpty(v)) {
          flag = v;
          break;
        }
      }
      if (isYes(flag)) out.push(row);
    }

    return out;
  }, [rawRows]);

  /** Group offers by CSV source file */
  const groupedOffers = useMemo(() => {
    const map = new Map();
    for (const row of offers) {
      const srcFile = row.__sourceFile || "Other.csv";
      const srcKey = prettySourceName(srcFile) || "Other";
      if (!map.has(srcKey)) map.set(srcKey, []);
      map.get(srcKey).push(row);
    }
    return map;
  }, [offers]);

  /** Render groups in SAME order as config files */
  const orderedSourceKeys = useMemo(() => {
    const inOrder = (activeCat?.files || []).map((f) => prettySourceName(f));
    for (const k of groupedOffers.keys()) {
      if (!inOrder.includes(k)) inOrder.push(k);
    }
    return inOrder;
  }, [activeCat, groupedOffers]);

  const OfferCard = ({ row }) => {
    const sourceFileName = row.__sourceFile || "";

    const title = pickField(row, LIST_FIELDS.title) || "Offer";
    const rawImage = pickField(row, LIST_FIELDS.image);
    const desc = pickField(row, LIST_FIELDS.desc);
    const terms = pickField(row, LIST_FIELDS.terms);
    const coupon = pickField(row, LIST_FIELDS.coupon);

    // ✅ Link field decides the button
    const rawLink = pickField(row, LIST_FIELDS.link);
    const normalizedLink = useMemo(() => normalizeLink(rawLink), [rawLink]);

    // ✅ show button if link exists + valid URL format
    const hasLink = !!normalizedLink;

    const { src: imgSrc, usingFallback, fallbackSrc } = resolveImage(rawImage, sourceFileName);

    const [copied, setCopied] = useState(false);
    async function onCopy(text) {
      try {
        await navigator.clipboard.writeText(String(text || ""));
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      } catch {}
    }

    return (
      <div className="offer-card offer-card--horizontal">
        {imgSrc ? (
          <img
            className={`offer-img ${usingFallback ? "is-fallback" : ""}`}
            src={imgSrc}
            data-fallback={fallbackSrc}
            alt={title}
            onError={handleImgError}
            loading="lazy"
          />
        ) : null}

        <div className="offer-info offer-info--stack">
          <div className="offer-body">
            <h3 className="offer-title">{title}</h3>

            {coupon && (
              <div className="coupon-row">
                <code className="coupon-code">{coupon}</code>
                <button className="btn" onClick={() => onCopy(coupon)}>
                  {copied ? "✓ Copied" : "📋 Copy"}
                </button>
              </div>
            )}

            {desc && (
              <div className="scroll-box">
                <p className="offer-desc" style={{ margin: 0 }}>
                  {desc}
                </p>
              </div>
            )}

            {terms && (
              <div className="scroll-box terms-box">
                <p className="offer-desc" style={{ margin: 0 }}>
                  <strong>Terms and conditions:</strong> {terms}
                </p>
              </div>
            )}
          </div>

          {/* ✅ Button only if link exists (valid URL format) + sticks to bottom */}
          {hasLink ? (
            <div className="offer-cta">
              <button className="btn btn-full" onClick={() => window.open(normalizedLink, "_blank")}>
                View Offer
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const activeLabel = activeCat?.label || "Offers";

  return (
    <div className="App">
      <div className="top-panel">
        <div className="top-subtitle">Non Payment Offers</div>

        <div className="chip-row">
          {CATEGORY_CONFIG.map((c) => (
            <span
              key={c.key}
              role="button"
              tabIndex={0}
              onClick={() => loadCategory(c.key)}
              onKeyDown={(e) => (e.key === "Enter" ? loadCategory(c.key) : null)}
              className={`chip ${activeCategory === c.key ? "chip-active" : ""}`}
              title={`Click to open ${c.label}`}
            >
              {c.label}
            </span>
          ))}
        </div>
      </div>

      {activeCategory && (
        <div className="offers-section">
          <div className="offer-group">
            <h2 className="center-title">{activeLabel}</h2>

            {loading ? (
              <p className="center-text">Loading...</p>
            ) : error ? (
              <p className="center-text error">{error}</p>
            ) : offers.length ? (
              <>
                {orderedSourceKeys.map((srcKey) => {
                  const rows = groupedOffers.get(srcKey) || [];
                  if (!rows.length) return null;

                  return (
                    <div key={`${activeCategory}-${srcKey}`} className="source-group">
                      <div className="source-heading">{srcKey} Offers</div>

                      <div className="offer-row">
                        {rows.map((row, i) => (
                          <OfferCard key={`${activeCategory}-${srcKey}-${i}`} row={row} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <p className="center-text error">No non-payment offers available</p>
            )}
          </div>
        </div>
      )}

      <Disclaimer />
    </div>
  );
}
