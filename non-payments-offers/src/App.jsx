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
    files: ["BookMyShow.csv", "PaytmMovies.csv"],
  },
  {
    key: "hotel",
    label: "Hotel Offers",
    folder: "Hotel-Offers",
    files: ["Cleartrip.csv", "Goibibo.csv", "MakeMyTrip.csv"],
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
    files: ["Amazon.csv", "Flipkart.csv", "Croma.csv"],
  },
  {
    key: "dineout",
    label: "Dineout Offers",
    folder: "Dineout-Offers",
    files: ["SwiggyDineout.csv", "EazyDiner.csv", "ZomatoDining.csv"],
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
    files: ["Blinkit.csv", "Zepto.csv", "BigBasket.csv"],
  },
  {
    key: "ecommerce",
    label: "Ecommerce Offers",
    folder: "Ecommerce-Offers",
    files: ["Amazon.csv", "Flipkart.csv", "Myntra.csv"],
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
 * ✅ IMPORTANT:
 * Best practice is: keep logos locally in /public/logos/
 * Example: public/logos/makemytrip.png  ->  "/logos/makemytrip.png"
 *
 * But if you want remote logos, you can keep URLs.
 */
const WEBSITE_LOGO_BY_SOURCE = {
  // makemytrip: "/logos/makemytrip.png",
  // goibibo: "/logos/goibibo.png",
  // redbus: "/logos/redbus.png",
  // abhibus: "/logos/abhibus.png",
  // ixigo: "/logos/ixigo.png",
  // easemytrip: "/logos/easemytrip.png",
  // yatra: "/logos/yatra.png",
  // indigo: "/logos/indigo.png",
  // airindia: "/logos/airindia.png",
  // bookmyshow: "/logos/bookmyshow.png",
  // paytmmovies: "/logos/paytm.png",
  // cleartrip: "/logos/cleartrip.png",
  // amazon: "/logos/amazon.png",
  // flipkart: "/logos/flipkart.png",
  // myntra: "/logos/myntra.png",
  // ajio: "/logos/ajio.png",
  // tatacliq: "/logos/tatacliq.png",
  // croma: "/logos/croma.png",
  // blinkit: "/logos/blinkit.png",
  // zepto: "/logos/zepto.png",
  // bigbasket: "/logos/bigbasket.png",
  // swiggy: "/logos/swiggy.png",
  // zomato: "/logos/zomato.png",
  // eazydiner: "/logos/eazydiner.png",
  // swiggydineout: "/logos/swiggy.png",
  // zomatodining: "/logos/zomato.png",
};

/** -------------------- HELPERS -------------------- */
const toNorm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Treat underscores like spaces too (for Image_1 etc) */
const toKeyNorm = (s) => toNorm(s).replace(/_/g, " ");

function isNonEmpty(v) {
  return v !== undefined && v !== null && String(v).trim() !== "";
}

/** ✅ Works even if Papa renamed duplicates: Image -> Image_1, Link -> Link_2 */
function pickField(row, candidates) {
  if (!row) return undefined;

  // 1) direct match
  for (const k of candidates) {
    if (isNonEmpty(row[k])) return row[k];
  }

  // 2) normalized exact match
  const wantedNorms = candidates.map(toKeyNorm);
  const keys = Object.keys(row);

  for (const k of keys) {
    const kn = toKeyNorm(k);
    for (const wn of wantedNorms) {
      // exact OR "image 1" starts with "image"
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

function isUsableImage(val) {
  if (!val) return false;
  const s = String(val).trim();
  if (!s) return false;
  if (/^(na|n\/a|null|undefined|-|image unavailable)$/i.test(s)) return false;
  return true;
}

function isUsableLink(val) {
  if (!val) return false;
  const s = String(val).trim();
  if (!s) return false;
  if (/^(na|n\/a|null|undefined|-|#)$/i.test(s)) return false;
  return /^https?:\/\//i.test(s);
}

function prettySourceName(fileName) {
  if (!fileName) return "";
  const name = String(fileName).replace(/\.csv$/i, "").trim();
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : "";
}

/**
 * ✅ Very important:
 * yatraDomestic.csv / yatraInternational.csv should map to yatra logo
 */
function sourceKeyFromFile(fileName) {
  const base = toNorm(String(fileName || "").replace(/\.csv$/i, ""));
  if (base.startsWith("yatra")) return "yatra";
  return base;
}

/** ✅ resolve image: if missing OR 404 -> website logo based on source */
function resolveImage(candidate, sourceFileName) {
  const srcKey = sourceKeyFromFile(sourceFileName);
  const websiteLogo = WEBSITE_LOGO_BY_SOURCE[srcKey];

  const usingFallback = !isUsableImage(candidate);
  if (!usingFallback) return { src: candidate, usingFallback: false, fallbackSrc: websiteLogo || "" };

  return { src: websiteLogo || "", usingFallback: true, fallbackSrc: websiteLogo || "" };
}

function handleImgError(e) {
  const el = e.currentTarget;
  const fallback = el.getAttribute("data-fallback") || "";
  if (fallback && el.src !== window.location.origin + fallback && el.src !== fallback) {
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

/** -------------------- COMPONENT -------------------- */
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
              transformHeader: (h) => String(h || "").trim(),
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

      if (failed.length) {
        // show warning but still show whatever loaded
        setError(`Some files failed to load: ${failed.join(", ")}`);
      }
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  /** AUTO LOAD first category */
  useEffect(() => {
    if (activeCategory) loadCategory(activeCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ✅ Filter only Non-Payments-Offers = yes (supports many header spellings) */
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
    const link = pickField(row, LIST_FIELDS.link);

    const { src: imgSrc, usingFallback, fallbackSrc } = resolveImage(rawImage, sourceFileName);
    const hasLink = isUsableLink(link);

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

          {/* ✅ button only if link exists + sticks to bottom */}
          {hasLink ? (
            <div className="offer-cta">
              <button className="btn btn-full" onClick={() => window.open(link, "_blank")}>
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
