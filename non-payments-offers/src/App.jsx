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
    files: ["Ixigo.csv", "Yatra.csv", "EaseMyTrip.csv"],
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
  image: ["Image", "Offer Image", "image", "Credit Card Image"],
  link: ["Link", "Offer Link"],
  desc: ["Description", "Details", "Offer Description", "Benefit"],
  terms: ["Terms and conditions", "Terms & conditions", "Terms & Conditions", "T&C", "Terms"],
  coupon: ["Coupon code", "Coupon Code", "Coupon", "Code"],
};

const FALLBACK_IMAGE_BY_CATEGORY = {
  bus: "https://play-lh.googleusercontent.com/2sknePPj33W1Iu2tZbDFario3G7kpIJFkKYm9VgGnQYKzn_WJygKFihJkZTx8H7sb0o",
  movie:
    "https://play-lh.googleusercontent.com/7wG2aCk3oTgH7E4V0JZgV8vCkIYvI6t6u8yK0d2y8p0v3v4m9mS3U5xXkYxQmQ=s256-rw",
  flight:
    "https://play-lh.googleusercontent.com/ZgBXowR57R5sLG3BmzrVDYH5f-3I18IMUl1IDGwUOPmGejvN0lzRYCSYsVNDSUW0H51M",
  hotel: "https://bottindia.com/wp-content/uploads/2023/09/Cleartrip.webp",
};

/** -------------------- HELPERS -------------------- */
const toNorm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function firstField(obj, keys) {
  for (const k of keys) {
    if (obj && obj[k] && String(obj[k]).trim() !== "") return obj[k];
  }
  return undefined;
}

function valueByNormalizedKey(row, wantedKey) {
  const wanted = toNorm(wantedKey);
  if (!row) return undefined;
  const keys = Object.keys(row);
  for (const k of keys) {
    if (toNorm(k) === wanted) return row[k];
  }
  return undefined;
}

function isYes(val) {
  const v = toNorm(val);
  return v === "yes" || v === "y" || v === "true";
}

function isUsableImage(val) {
  if (!val) return false;
  const s = String(val).trim();
  if (!s) return false;
  if (/^(na|n\/a|null|undefined|-|image unavailable)$/i.test(s)) return false;
  return true;
}

function resolveImage(categoryKey, candidate) {
  const fallback = FALLBACK_IMAGE_BY_CATEGORY[categoryKey];
  const usingFallback = !isUsableImage(candidate) && !!fallback;
  return { src: usingFallback ? fallback : candidate, usingFallback };
}

function handleImgError(e, categoryKey) {
  const fallback = FALLBACK_IMAGE_BY_CATEGORY[categoryKey];
  const el = e.currentTarget;
  if (fallback && el.src !== fallback) {
    el.src = fallback;
    el.classList.add("is-fallback");
  } else {
    el.style.display = "none";
  }
}

function prettySourceName(fileName) {
  if (!fileName) return "";
  const name = String(fileName).replace(/\.csv$/i, "").trim();
  // ✅ Capitalize nicely: "goibibo" -> "Goibibo"
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : "";
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
      await Promise.all(
        (cat.files || []).map(async (name) => {
          try {
            const res = await axios.get(`/${cat.folder}/${encodeURIComponent(name)}`);
            const parsed = Papa.parse(res.data, { header: true, skipEmptyLines: true });
            const rows = parsed.data || [];
            rows.forEach((r) => all.push({ ...r, __sourceFile: name }));
          } catch (e) {
            console.warn(`Skipping ${cat.folder}/${name}:`, e?.message || e);
          }
        })
      );

      setRawRows(all);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  /** ✅ AUTO LOAD first category on screen open */
  useEffect(() => {
    if (activeCategory) loadCategory(activeCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Filter only Non-Payments-Offers = yes */
  const offers = useMemo(() => {
    const out = [];
    for (const row of rawRows || []) {
      const flag = valueByNormalizedKey(row, "Non-Payments-Offers");
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

  const OfferCard = ({ row, categoryKey }) => {
    const title = firstField(row, LIST_FIELDS.title) || "Offer";
    const rawImage = firstField(row, LIST_FIELDS.image);
    const desc = firstField(row, LIST_FIELDS.desc);
    const terms = firstField(row, LIST_FIELDS.terms);
    const coupon = firstField(row, LIST_FIELDS.coupon);
    const link = firstField(row, LIST_FIELDS.link);

    const { src: imgSrc, usingFallback } = resolveImage(categoryKey, rawImage);

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
        {imgSrc && (
          <img
            className={`offer-img ${usingFallback ? "is-fallback" : ""}`}
            src={imgSrc}
            alt={title}
            onError={(e) => handleImgError(e, categoryKey)}
          />
        )}

        <div className="offer-info">
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

          {link && (
            <button className="btn" onClick={() => window.open(link, "_blank")}>
              View Offer
            </button>
          )}
        </div>
      </div>
    );
  };

  const activeLabel = activeCat?.label || "Offers";

  return (
    <div className="App">
      {/* TOP PANEL ALWAYS VISIBLE */}
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

      {/* OFFERS ALWAYS VISIBLE */}
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
                      {/* ✅ Heading uses category label + source */}
                      <div className="source-heading">
                        {srcKey} Offers
                      </div>

                      {/* ✅ horizontal scroll row for cards */}
                      <div className="offer-row">
                        {rows.map((row, i) => (
                          <OfferCard
                            key={`${activeCategory}-${srcKey}-${i}`}
                            row={row}
                            categoryKey={activeCategory}
                          />
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
