// Vercel Serverless Function
// بتتنادى تلقائيًا لما حد يفتح رابط زي /u/RS-0001
// بتجيب بيانات الوحدة من الباك إند (Apps Script) وتبني صفحة صغيرة
// فيها Open Graph meta tags بصورة الوحدة الحقيقية، وبعدها توديك
// تلقائيًا للموقع الفعلي بنفس الوحدة مفتوحة

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwAbUsJH_44MWngzSeFMZ-OHg2hcIjZydb0VP3wHCIuw_FElZfmS7JsmGD3Km03hGkt7A/exec";

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPrice(n) {
  const num = Number(n);
  if (!num) return "";
  return num.toLocaleString("en-US") + " جنيه";
}

export default async function handler(req, res) {
  const { id } = req.query;
  const host = req.headers.host || "resale-units.vercel.app";
  const siteUrl = "https://" + host;
  const destination = siteUrl + "/?unit=" + encodeURIComponent(id || "");

  let unit = null;
  try {
    const apiRes = await fetch(APPS_SCRIPT_URL + "?action=list&keyword=" + encodeURIComponent(id || ""));
    const data = await apiRes.json();
    if (data.success) {
      unit = (data.units || []).find(u => u["Unit ID"] === id) || (data.units || [])[0] || null;
    }
  } catch (err) {
    // فشل الاتصال بالباك إند - هنكمل بالبيانات الافتراضية تحت
  }

  const title = unit
    ? `${unit["Property Type"] || ""} - ${unit["Project Name"] || ""} | Digital Real Estate`
    : "وحدة ريسيل | Digital Real Estate";

  const priceText = unit ? formatPrice(unit["Price"]) : "";
  const location = unit ? `${unit["City"] || ""}${unit["Area/District"] ? " - " + unit["Area/District"] : ""}` : "";
  const description = unit
    ? `${location}${priceText ? " | " + priceText : ""} | تواصل مباشرة مع صاحب الوحدة - خدمة مجانية بالكامل`
    : "تصفّح أحدث وحدات الريسيل المتاحة للبيع وتواصل مباشرة مع أصحابها.";

  const images = unit && unit["Images"]
    ? String(unit["Images"]).split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const imageUrl = images[0] || (siteUrl + "/city-bg.png");

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(imageUrl)}">
<meta property="og:url" content="${escapeHtml(destination)}">
<meta property="og:locale" content="ar_EG">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(imageUrl)}">
<meta http-equiv="refresh" content="0; url=${escapeHtml(destination)}">
<script>window.location.replace(${JSON.stringify(destination)});</script>
<style>
  body { font-family: Tahoma, Arial, sans-serif; background: #0f2942; color: #fff; display: flex;
         align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
  a { color: #c9992e; }
</style>
</head>
<body>
  <p>جاري تحويلك لتفاصيل الوحدة... <br><a href="${escapeHtml(destination)}">اضغط هنا لو الصفحة متفتحتش تلقائيًا</a></p>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
  res.status(200).send(html);
}
