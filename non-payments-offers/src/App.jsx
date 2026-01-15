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
    files: ["abhibus.csv", "goibibo.csv", "makemytrip.csv", "redbus.csv"],
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

/** ✅ WEBSITE LOGOS */
const WEBSITE_LOGO_BY_SOURCE = {
  // makemytrip:
  //   "https://play-lh.googleusercontent.com/aYbdxj9f3B5mF9Xw6o6jXw2k3L2cR2iFqf9e_2Gm5q2GxgqzZxWv0r6mG0JQ=s256-rw",
  // goibibo:
  //   "https://play-lh.googleusercontent.com/0ZP5j4Q9lP8o_0xjX5n8i7o1wYJ1vX0m5lQZl5Qp9m9h0lZ0q8nR6qv6h6s=s256-rw",
  // redbus:
  //   "https://play-lh.googleusercontent.com/VV2V8qz3G7bZrLQKZ3oDq9x9f6sL0R6m8nq1C2u3bV0=s256-rw",
  // abhibus:
  //   "https://play-lh.googleusercontent.com/1jD5f3m8lq3v9a1z7g8xQ5k6o2w4b1r2d3f4g5h6i7j=s256-rw",
  // ixigo:
  //   "https://play-lh.googleusercontent.com/ZgBXowR57R5sLG3BmzrVDYH5f-3I18IMUl1IDGwUOPmGejvN0lzRYCSYsVNDSUW0H51M",
  // easemytrip:
  //   "https://play-lh.googleusercontent.com/2xg2k3n7h7q8p9y8m3v2b1n0c9x8z7l6k5j4h3g2f1d=s256-rw",
  // yatra:
  //   "https://play-lh.googleusercontent.com/3v4b5n6m7c8x9z0l1k2j3h4g5f6d7s8a9p0o=s256-rw",
  // indigo:
  //   "https://play-lh.googleusercontent.com/7u6y5t4r3e2w1q0p9o8i7u6y5t4r3e2w1q0=s256-rw",
  // airindia:
  //   "https://play-lh.googleusercontent.com/9p8o7i6u5y4t3r2e1w0q9p8o7i6u5y4t3r2=s256-rw",
  // bookmyshow:
  //   "https://play-lh.googleusercontent.com/7wG2aCk3oTgH7E4V0JZgV8vCkIYvI6t6u8yK0d2y8p0v3v4m9mS3U5xXkYxQmQ=s256-rw",
  // paytmmovies:
  //   "https://play-lh.googleusercontent.com/5t4r3e2w1q0p9o8i7u6y5t4r3e2w1q0p9o8=s256-rw",
  // cleartrip: "https://bottindia.com/wp-content/uploads/2023/09/Cleartrip.webp",
  // amazon:
  //   "https://play-lh.googleusercontent.com/1j2k3l4m5n6b7v8c9x0z1a2s3d4f5g6h7j8=s256-rw",
  // flipkart:
  //   "https://play-lh.googleusercontent.com/ZlVYv0mQzXy5mNqg3p1yYw2xZp0s4mQe8pQ=s256-rw",
  // myntra:
  //   "https://play-lh.googleusercontent.com/0v9b8n7m6c5x4z3l2k1j0h9g8f7d6s5a4p3=s256-rw",
  // ajio:
  //   "https://play-lh.googleusercontent.com/2b3n4m5c6x7z8l9k0j1h2g3f4d5s6a7p8o9=s256-rw",
  // tatacliq:
  //   "https://play-lh.googleusercontent.com/4n5m6c7x8z9l0k1j2h3g4f5d6s7a8p9o0i1=s256-rw",
};

const FALLBACK_IMAGE_BY_CATEGORY = {};

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

function sourceKeyFromFile(fileName) {
  return toNorm(String(fileName || "").replace(/\.csv$/i, ""));
}

/** ✅ try name variants to survive case-sensitive deploys */
function fileNameVariants(name) {
  const n = String(name || "");
  const lower = n.toLowerCase();
  const capFirst = n ? n.charAt(0).toUpperCase() + n.slice(1) : n;
  const uniq = Array.from(new Set([n, lower, capFirst]));
  return uniq;
}

async function fetchCsvWithFallback(folder, fileName) {
  const variants = fileNameVariants(fileName);
  let lastErr = null;

  for (const v of variants) {
    try {
      const res = await axios.get(`/${folder}/${encodeURIComponent(v)}`, { responseType: "text" });
      return { data: res.data, usedName: v };
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("Failed to fetch CSV");
}

/** ✅ resolve fallback image */
function resolveImage(categoryKey, candidate, sourceFileName) {
  const srcKey = sourceKeyFromFile(sourceFileName);
  const websiteLogo = WEBSITE_LOGO_BY_SOURCE[srcKey];
  const categoryFallback = FALLBACK_IMAGE_BY_CATEGORY[categoryKey];

  if (isUsableImage(candidate)) return { src: candidate, usingFallback: false };

  return { src: websiteLogo || categoryFallback || "", usingFallback: true };
}

function handleImgError(e, categoryKey, sourceFileName) {
  const srcKey = sourceKeyFromFile(sourceFileName);
  const websiteLogo = WEBSITE_LOGO_BY_SOURCE[srcKey];
  const categoryFallback = FALLBACK_IMAGE_BY_CATEGORY[categoryKey];
  const finalFallback = websiteLogo || categoryFallback;

  const el = e.currentTarget;
  if (finalFallback && el.src !== finalFallback) {
    el.src = finalFallback;
    el.classList.add("is-fallback");
  } else {
    el.style.display = "none";
  }
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
  const [missingFiles, setMissingFiles] = useState([]); // ✅ NEW

  const activeCat = useMemo(
    () => CATEGORY_CONFIG.find((c) => c.key === activeCategory) || null,
    [activeCategory]
  );

  async function loadCategory(categoryKey) {
    setActiveCategory(categoryKey);
    setLoading(true);
    setError("");
    setRawRows([]);
    setMissingFiles([]);

    try {
      const cat = CATEGORY_CONFIG.find((c) => c.key === categoryKey);
      if (!cat) {
        setError("Category not found");
        return;
      }

      const all = [];
      const missing = [];

      await Promise.all(
        (cat.files || []).map(async (name) => {
          try {
            const { data } = await fetchCsvWithFallback(cat.folder, name);

            const parsed = Papa.parse(data, { header: true, skipEmptyLines: true });
            const rows = parsed.data || [];

            rows.forEach((r) => all.push({ ...r, __sourceFile: name })); // keep config name for grouping
          } catch (e) {
            missing.push(`${cat.folder}/${name}`);
            console.warn(`Skipping ${cat.folder}/${name}:`, e?.message || e);
          }
        })
      );

      setMissingFiles(missing);
      setRawRows(all);
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

  const offers = useMemo(() => {
    const out = [];
    for (const row of rawRows || []) {
      const flag = valueByNormalizedKey(row, "Non-Payments-Offers");
      if (isYes(flag)) out.push(row);
    }
    return out;
  }, [rawRows]);

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

    const sourceFileName = row.__sourceFile || "";
    const { src: imgSrc, usingFallback } = resolveImage(categoryKey, rawImage, sourceFileName);

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
        {imgSrc && (
          <img
            className={`offer-img ${usingFallback ? "is-fallback" : ""}`}
            src={imgSrc}
            alt={title}
            onError={(e) => handleImgError(e, categoryKey, sourceFileName)}
          />
        )}

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

          {hasLink && (
            <div className="offer-cta">
              <button className="btn btn-full" onClick={() => window.open(link, "_blank")}>
                View Offer
              </button>
            </div>
          )}
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

            {/* ✅ SHOW MISSING FILES CLEARLY */}
            {!!missingFiles.length && (
              <div className="missing-box">
                <b>Some CSV files are not loading (check filename/case in public folder):</b>
                <ul>
                  {missingFiles.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

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
                          <OfferCard key={`${activeCategory}-${srcKey}-${i}`} row={row} categoryKey={activeCategory} />
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
