import { jsPDF } from "jspdf";
import { localTaxRates } from "../data/localTaxes";
import JSZip from "jszip";
import { saveAs } from "file-saver";

// ---- helper to load logo safely ----
async function loadImageAsBase64(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const blob = await r.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ✅ NUMBER FORMATTER (Adds commas)
function fmt(n) {
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ✅ STATE TAX RATES (by state abbreviation)
const STATE_TAX_RATES = {
  AL: 0.05, AK: 0, AZ: 0.025, AR: 0.047, CA: 0.06, CO: 0.0455, CT: 0.05,
  DE: 0.052, FL: 0, GA: 0.0575, HI: 0.07, ID: 0.059, IL: 0.0495, IN: 0.0323,
  IA: 0.05, KS: 0.0525, KY: 0.045, LA: 0.045, ME: 0.0715, MD: 0.0575, MA: 0.05,
  MI: 0.0425, MN: 0.055, MS: 0.05, MO: 0.05, MT: 0.0675, NE: 0.05, NV: 0,
  NH: 0, NJ: 0.0637, NM: 0.049, NY: 0.064, NC: 0.0475, ND: 0.027, OH: 0.035,
  OK: 0.05, OR: 0.08, PA: 0.0307, RI: 0.0375, SC: 0.07, SD: 0, TN: 0, TX: 0,
  UT: 0.0485, VT: 0.065, VA: 0.0575, WA: 0, WV: 0.065, WI: 0.053, WY: 0,
};

// Helper: Convert day name to index
const DAY_MAP = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
};

// Helper: Find next given weekday from a date
function nextWeekday(date, weekday) {
  const result = new Date(date);
  const target = DAY_MAP[weekday];
  while (result.getDay() !== target) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

// Safe date parser
function safeDate(value) {
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}

// ---- MULTI PAYSTUB GENERATOR ----
export async function generateAndDownloadMultiple(data) {
  const numStubs = Number(data.numStubs) || 1;
  const hireDate = safeDate(data.hireDate);
  const payFrequency = data.payFrequency || "bi-weekly";
  const payDay = data.payDay || "Friday";

  const hoursList =
    data.hoursList?.toString().trim() === ""
      ? []
      : data.hoursList?.split(",").map((x) => parseFloat(x.trim()) || 0) || [];
  const overtimeList =
    data.overtimeList?.toString().trim() === ""
      ? []
      : data.overtimeList?.split(",").map((x) => parseFloat(x.trim()) || 0) || [];

  const periodLength = payFrequency === "biweekly" ? 14 : 7;
  let startDate = new Date(hireDate);

  // Create ZIP
  const zip = new JSZip();

  // Keep track of all generated paystubs (for year-to-date sums)
  const allPaystubs = [];

  for (let i = 0; i < numStubs; i++) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + periodLength - 1);

    const tentativePayDate = new Date(endDate);
    tentativePayDate.setDate(tentativePayDate.getDate() + 7);
    const payDate = nextWeekday(tentativePayDate, payDay);

    const hours = hoursList[i] || (payFrequency === "biweekly" ? 80 : 40);
    const overtime = overtimeList[i] || 0;

    // Compute gross values for this stub
    const overtimeRate = Number(data.rate) * 1.5;
    const regularGross = Number(data.rate) * Number(hours);
    const overtimeGross = overtimeRate * Number(overtime || 0);
    const gross = regularGross + overtimeGross;
    const totalHours = Number(hours) + Number(overtime || 0);

    // Taxes (current period) - employee portion
    const stateRate = STATE_TAX_RATES[data.state?.toUpperCase()] ?? 0;
    const locationKey = `${data.city?.trim()}, ${data.state?.trim()}`;
    const localTaxInfo = localTaxRates[locationKey];
    const includeLocalTax = data.includeLocalTax !== false;

    const socialSecurity = gross * 0.062;
    const medicare = gross * 0.0145;
    const stateWithholding = gross * stateRate;
    const localWithholding = includeLocalTax && localTaxInfo ? gross * localTaxInfo.rate : 0;

    // Total employee taxes for this paystub (sum of employee-side taxes)
    const totalEmpTax = socialSecurity + medicare + stateWithholding + localWithholding;

    // Employer taxes (for display if needed)
    const futa = gross * 0.006;
    const stateUnemployment = gross * 0.01;
    const employerSocial = gross * 0.062;
    const employerMedicare = gross * 0.0145;
    const totalEmployerTax = futa + stateUnemployment + employerSocial + employerMedicare;

    // Build the period data to pass into the single-paystub renderer
    const periodData = {
      ...data,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      payDate: payDate.toISOString().split("T")[0],
      hours,
      overtime,
      periods: numStubs,
      // pass precomputed breakdown so single generator can use them
      regularGross,
      overtimeGross,
      gross,
      totalHours,
      socialSecurity,
      medicare,
      stateWithholding,
      localWithholding,
      totalEmpTax,
      futa,
      stateUnemployment,
      employerSocial,
      employerMedicare,
      totalEmployerTax,
      // reference to the running array (will include previous stubs and we will add current below)
      allPaystubs,
    };

    // Add the current stub record to allPaystubs (important: include current values)
    allPaystubs.push({
      payDate: periodData.payDate,
      regularGross,
      overtimeGross,
      gross,
      hours: periodData.hours,
      totalHours,
      socialSecurity,
      medicare,
      stateWithholding,
      localWithholding,
      totalEmpTax,
      net: gross - totalEmpTax,
    });

    // Generate PDF blob for this stub (single renderer will use data.allPaystubs for YTD)
    const pdfBlob = await generateSinglePaystub(periodData, true);

    // Add to ZIP (use a filename that includes an index to avoid collisions)
    const safeName = (data.name || "employee").replace(/\s+/g, "_");
    zip.file(`${safeName}-paystub-${periodData.payDate}.pdf`, pdfBlob);

    // advance to next period
    startDate.setDate(startDate.getDate() + periodLength);
  }

  // generate ZIP and trigger single download
  const zipBlob = await zip.generateAsync({ type: "blob" });
  saveAs(zipBlob, `${(data.name || "paystubs").replace(/\s+/g, "_")}-paystubs.zip`);
}

// ---- SINGLE PAYSTUB GENERATOR ----
async function generateSinglePaystub(data, returnBlob = false) {
  // Allow the function to compute values itself if not passed in (backwards compatible)
  const filename = `${data.name}-paystub-${data.payDate}.pdf`;
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const left = 36;
  const usableWidth = 540;
  let y = 40;

  // ---------- HEADER ----------
  const top = y;
  const logoX = left;
  const logoWidth = 70;

  try {
    const logoData = await loadImageAsBase64("/gustoLogo.png");
    if (logoData) {
      const img = new Image();
      img.src = logoData;
      await new Promise((resolve) => {
        img.onload = () => {
          const aspect = img.height / img.width || 0.4;
          doc.addImage(img, "PNG", logoX, top, logoWidth, logoWidth * aspect);
          resolve();
        };
        img.onerror = resolve;
      });
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Gusto", logoX, top + 20);
    }
  } catch {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Gusto", logoX, top + 20);
  }

  // Left column: earnings info
  let leftY = top + 60;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Earnings Statement", logoX, leftY);
  leftY += 30;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Pay period: ${data.startDate} – ${data.endDate}   Pay Day: ${data.payDate}`,
    logoX,
    leftY
  );
  leftY += 12;
  doc.text(`Hire Date: ${data.hireDate}`, logoX, leftY);
  leftY += 12;
  doc.text(`${data.name} (...Direct Deposit to ${data.bankName} ******${data.bank})`, logoX, leftY);

  // Right: Company + Employee boxes
  const boxTop = top + 30;
  const boxHeight = 70;
  const boxWidth = 130;
  const rightStartX = left + 270;

  doc.setFillColor(248, 248, 248);
  doc.rect(rightStartX, boxTop, boxWidth, boxHeight, "F");
  doc.rect(rightStartX + boxWidth + 10, boxTop, boxWidth, boxHeight, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Company", rightStartX + 8, boxTop + 14);
  doc.text("Employee", rightStartX + boxWidth + 18, boxTop + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(data.company, rightStartX + 8, boxTop + 28);
  doc.text(data.companyAddress, rightStartX + 8, boxTop + 40);
  doc.text(`${data.companyCity}, ${data.companyState} ${data.companyZip}`, rightStartX + 8, boxTop + 52);
  doc.text(data.companyPhone, rightStartX + 8, boxTop + 64);
  doc.text(data.name, rightStartX + boxWidth + 18, boxTop + 28);
  doc.text(`XXX-XX-${data.ssn}`, rightStartX + boxWidth + 18, boxTop + 40);
  doc.text(data.address, rightStartX + boxWidth + 18, boxTop + 52);
  doc.text(`${data.city}, ${data.state} ${data.zip}`, rightStartX + boxWidth + 18, boxTop + 64);

  y = Math.max(leftY, boxTop + boxHeight) + 30;

  // ---------- EARNINGS ----------
  // prefer precomputed values passed from the generator; fall back to compute here
  const overtimeRate = data.overtimeRate ?? Number(data.rate) * 1.5;
  const regularGross = Number(data.regularGross ?? Number(data.rate) * Number(data.hours));
  const overtimeGross = Number(data.overtimeGross ?? overtimeRate * Number(data.overtime || 0));
  const gross = Number(data.gross ?? regularGross + overtimeGross);
  const totalHours = Number(data.totalHours ?? (Number(data.hours) + Number(data.overtime || 0)));

  // YTD and totals will be computed below using data.allPaystubs
  sectionHeader(doc, "Employee Gross Earnings", left, y, usableWidth);
  y += 20;

  // Determine YTD values by calendar year using data.allPaystubs (if provided)
  // If no allPaystubs provided, fall back to simple per-file behavior
  let ytdRegularGross = regularGross;
  let ytdOvertimeGross = overtimeGross;
  let ytdGross = gross;
  let ytdHours = totalHours;
  let ytdSocial = data.socialSecurity ?? gross * 0.062;
  let ytdMedicare = data.medicare ?? gross * 0.0145;
  let ytdStateWithholding = data.stateWithholding ?? (gross * (STATE_TAX_RATES[data.state?.toUpperCase()] ?? 0));
  let ytdLocalWithholding = data.localWithholding ?? 0;
  let ytdTotalEmpTax = data.totalEmpTax ?? ytdSocial + ytdMedicare + ytdStateWithholding + ytdLocalWithholding;

  if (Array.isArray(data.allPaystubs) && data.allPaystubs.length > 0) {
    const thisDate = new Date(data.payDate);
    const yearStart = new Date(thisDate.getFullYear(), 0, 1);
    const payPeriodsThisYear = data.allPaystubs.filter((p) => {
      const d = new Date(p.payDate);
      return d >= yearStart && d <= thisDate;
    });

    // Sum up the year-to-date values
    ytdRegularGross = payPeriodsThisYear.reduce((s, p) => s + (p.regularGross || 0), 0);
    ytdOvertimeGross = payPeriodsThisYear.reduce((s, p) => s + (p.overtimeGross || 0), 0);
    ytdGross = payPeriodsThisYear.reduce((s, p) => s + (p.gross || 0), 0);
    ytdHours = payPeriodsThisYear.reduce((s, p) => s + (p.totalHours || 0), 0);
    ytdSocial = payPeriodsThisYear.reduce((s, p) => s + (p.socialSecurity || 0), 0);
    ytdMedicare = payPeriodsThisYear.reduce((s, p) => s + (p.medicare || 0), 0);
    ytdStateWithholding = payPeriodsThisYear.reduce((s, p) => s + (p.stateWithholding || 0), 0);
    ytdLocalWithholding = payPeriodsThisYear.reduce((s, p) => s + (p.localWithholding || 0), 0);
    ytdTotalEmpTax = payPeriodsThisYear.reduce((s, p) => s + (p.totalEmpTax || 0), 0);
  }

  const earningsRows = [
    ["Description", "Rate", "Hours", "Current", "Year-To-Date"],
    [
      "Regular Hours | Hourly",
      `$${fmt(data.rate)}`,
      data.hours,
      `$${fmt(regularGross)}`,
      `$${fmt(ytdRegularGross)}`,
    ],
  ];

  if (Number(data.overtime) > 0) {
    earningsRows.push([
      "Overtime Hours | 1.5x",
      `$${fmt(overtimeRate)}`,
      data.overtime,
      `$${fmt(overtimeGross)}`,
      `$${fmt(ytdOvertimeGross)}`,
    ]);
  }

  drawEarningsTableWithUnderline(doc, left, y, earningsRows, 16, usableWidth);
  y += 60;

  // ---------- TAXES ----------
  const taxGap = 10;
  const taxTableWidth = (usableWidth - taxGap) / 2;
  const taxLeftX = left;
  const taxRightX = left + taxTableWidth + taxGap;

  sectionHeader(doc, "Employee Taxes Withheld", taxLeftX, y, taxTableWidth);
  sectionHeader(doc, "Employer Tax", taxRightX, y, taxTableWidth);
  y += 18;

  // Recompute rates and local info as fallback
  const stateRate = STATE_TAX_RATES[data.state?.toUpperCase()] ?? 0;
  const locationKey = `${data.city?.trim()}, ${data.state?.trim()}`;
  const localTax = localTaxRates[locationKey];
  const includeLocalTax = data.includeLocalTax !== false;

  const taxDefs = [
    ["Social Security", 0.062, "Social Security", 0.062],
    ["Medicare", 0.0145, "Medicare", 0.0145],
    [`${data.state?.toUpperCase() || "State"} Withholding Tax`, stateRate, "FUTA", 0.006],
    [
      localTax && includeLocalTax ? localTax.name : "Local Tax (none)",
      localTax && includeLocalTax ? localTax.rate : 0.0,
      `${data.state?.toUpperCase() || "State"} Unemployment Tax`,
      0.01,
    ],
  ];

  // Current period employee taxes (use provided breakdown if present)
  const eCurrentBreakdown = {
    "Social Security": Number(data.socialSecurity ?? regularGross * 0.062 + overtimeGross * 0.062) || (gross * 0.062),
    "Medicare": Number(data.medicare ?? gross * 0.0145) || (gross * 0.0145),
    [`${data.state?.toUpperCase() || "State"} Withholding Tax`]: Number(data.stateWithholding ?? gross * stateRate) || (gross * stateRate),
    [localTax && includeLocalTax ? localTax.name : "Local Tax (none)"]: Number(data.localWithholding ?? (includeLocalTax && localTax ? gross * localTax.rate : 0)) || 0,
  };

  const empTaxRows = [["Description", "Current", "YTD"]];
  const erTaxRows = [["Company Tax", "Current", "YTD"]];
  let totalEmpTax = 0;
  let totalEmpTaxYtd = ytdTotalEmpTax;

  // build rows using taxDefs, but consult computed breakdowns and YTD sums
  taxDefs.forEach(([eLabel, eRate, rLabel, rRate]) => {
    const eCurrent =
      // prefer breakdown values we computed earlier in generator
      (eLabel === "Social Security" ? Number(data.socialSecurity ?? socialSecurity)
        : eLabel === "Medicare" ? Number(data.medicare ?? medicare)
        : eLabel.includes("Withholding") && eLabel.toLowerCase().includes("state") ? Number(data.stateWithholding ?? (gross * stateRate))
        : eLabel === (localTax && includeLocalTax ? localTax.name : "Local Tax (none)") ? Number(data.localWithholding ?? localWithholding)
        : gross * (eRate || 0)
      ) || 0;

    // YTD for this tax from earlier sums
    const eYtd =
      (eLabel === "Social Security" ? ytdSocial
        : eLabel === "Medicare" ? ytdMedicare
        : eLabel.includes("Withholding") && eLabel.toLowerCase().includes("state") ? ytdStateWithholding
        : eLabel === (localTax && includeLocalTax ? localTax.name : "Local Tax (none)") ? ytdLocalWithholding
        : 0
      ) || 0;

    totalEmpTax += eCurrent;

    // employer current & ytd
    const rCurrent = gross * (rRate || 0);
    // compute rYtd by summing from data.allPaystubs if available
    let rYtd = 0;
    if (Array.isArray(data.allPaystubs) && data.allPaystubs.length > 0) {
      const thisDate = new Date(data.payDate);
      const yearStart = new Date(thisDate.getFullYear(), 0, 1);
      const payPeriodsThisYear = data.allPaystubs.filter((p) => {
        const d = new Date(p.payDate);
        return d >= yearStart && d <= thisDate;
      });
      rYtd = payPeriodsThisYear.reduce((s, p) => s + ((p.gross || 0) * (rRate || 0)), 0);
    } else {
      rYtd = rCurrent * (data.periods || 1);
    }

    empTaxRows.push([eLabel, `$${fmt(eCurrent)}`, `$${fmt(eYtd)}`]);
    erTaxRows.push([rLabel, `$${fmt(rCurrent)}`, `$${fmt(rYtd)}`]);
  });

  // Ensure totals are consistent (overwrite with computed totalEmpTax if we computed earlier)
  totalEmpTax = Number(data.totalEmpTax ?? totalEmpTax);

  const taxYStart = y;
  const empTaxHeight = drawTable(doc, taxLeftX, y, empTaxRows, 16, taxTableWidth, true, true);
  const erTaxHeight = drawTable(doc, taxRightX, y, erTaxRows, 16, taxTableWidth, true, true);
  y = taxYStart + Math.max(empTaxHeight, erTaxHeight) + 10;

  // ---------- DEDUCTIONS ----------
  sectionHeader(doc, "Employee Deductions", left, y, usableWidth);
  y += 18;
  drawTable(
    doc,
    left,
    y,
    [["Description", "Type", "Current", "Year-To-Date"], ["None", "–", "$0.00", "$0.00"]],
    16,
    usableWidth,
    false,
    true
  );
  y += 40;

  // ---------- CONTRIBUTIONS ----------
  sectionHeader(doc, "Employee Contributions", left, y, usableWidth);
  y += 18;
  drawTable(
    doc,
    left,
    y,
    [["Description", "Type", "Current", "Year-To-Date"], ["None", "–", "$0.00", "$0.00"]],
    16,
    usableWidth,
    false,
    true
  );
  y += 40;

  // ---------- SUMMARY ----------
  sectionHeader(doc, "Summary", left, y, usableWidth);
  y += 18;
  const net = gross - totalEmpTax;
  // compute ytdNet from sums earlier
  const ytdNet = (() => {
    if (Array.isArray(data.allPaystubs) && data.allPaystubs.length > 0) {
      const thisDate = new Date(data.payDate);
      const yearStart = new Date(thisDate.getFullYear(), 0, 1);
      const payPeriodsThisYear = data.allPaystubs.filter((p) => {
        const d = new Date(p.payDate);
        return d >= yearStart && d <= thisDate;
      });
      return payPeriodsThisYear.reduce((s, p) => s + ((p.gross || 0) - (p.totalEmpTax || 0)), 0);
    } else {
      // fallback: use ytdGross - ytdTotalEmpTax
      return ytdGross - ytdTotalEmpTax;
    }
  })();

  drawTable(
    doc,
    left,
    y,
    [
      ["Description", "Current", "Year-To-Date"],
      ["Gross Earnings", `$${fmt(gross)}`, `$${fmt(ytdGross)}`],
      ["Taxes", `$${fmt(totalEmpTax)}`, `$${fmt(ytdTotalEmpTax)}`],
      ["Net Pay", `$${fmt(net)}`, `$${fmt(ytdNet)}`],
      ["Total Reimbursements", "$0.00", "$0.00"],
      ["Check Amount", `$${fmt(net)}`, `$${fmt(ytdNet)}`],
      ["Hours Worked", `${fmt(totalHours)}`, `${fmt(ytdHours)}`],
    ],
    16,
    usableWidth,
    true,
    true
  );

  if (returnBlob) {
    return doc.output("blob");
  } else {
    doc.save(filename);
  }
}

// ---- helpers ----
function sectionHeader(doc, text, x, y, width) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(text, x, y);
  doc.setFillColor(0, 168, 161);
  doc.rect(x - 0.5, y + 3, width + 1, 1, "F");
}

function drawEarningsTableWithUnderline(doc, startX, startY, rows, rowHeight = 16, tableWidth = 500) {
  const colWidths = [
    tableWidth * 0.45,
    tableWidth * 0.13,
    tableWidth * 0.1,
    tableWidth * 0.14,
    tableWidth * 0.18,
  ];
  let y = startY;
  doc.setFontSize(9);
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);

  rows.forEach((row, i) => {
    if (i === 0) {
      doc.setFont("helvetica", "bold");
      doc.setFillColor(255, 255, 255);
      doc.rect(startX, y - 11, tableWidth, rowHeight, "F");
    } else {
      const isGray = i % 2 === 1;
      if (isGray) {
        doc.setFillColor(245);
        doc.rect(startX, y - 11, tableWidth, rowHeight, "F");
      }
      doc.setFont("helvetica", "normal");
    }
    let x = startX;
    row.forEach((cell, colIndex) => {
      if (colIndex === 0) {
        const textX = x + 4;
        const text = String(cell);
        doc.text(text, textX, y, { align: "left" });
        if (text.includes("Regular Hours")) {
          const underlineWidth = doc.getTextWidth("Regular Hours");
          doc.setDrawColor(0);
          doc.line(textX, y + 1, textX + underlineWidth, y + 1);
          doc.setDrawColor(200);
        }
      } else {
        doc.text(String(cell), x + colWidths[colIndex] - 4, y, { align: "right" });
      }
      if (colIndex > 0) doc.line(x, y - 11, x, y + rowHeight - 11);
      x += colWidths[colIndex];
    });
    y += rowHeight;
  });
  return rows.length * rowHeight;
}

function drawTable(
  doc,
  startX,
  startY,
  rows,
  rowHeight = 16,
  tableWidth = 500,
  underline = true,
  bottomBorder = false
) {
  const numCols = rows[0].length;
  const colWidths = [tableWidth * 0.4, ...Array(numCols - 1).fill(tableWidth * 0.6 / (numCols - 1))];
  let y = startY;
  doc.setFontSize(9);
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);

  rows.forEach((row, i) => {
    if (i === 0) {
      doc.setFont("helvetica", "bold");
      doc.setFillColor(255, 255, 255);
      doc.rect(startX, y - 11, tableWidth, rowHeight, "F");
    } else {
      const isGray = i % 2 === 1;
      if (isGray) {
        doc.setFillColor(245);
        doc.rect(startX, y - 11, tableWidth, rowHeight, "F");
      }
      doc.setFont("helvetica", "normal");
    }
    let x = startX;
    row.forEach((cell, colIndex) => {
      const text = String(cell);
      if (colIndex === 0) {
        const textX = x + 4;
        doc.text(text, textX, y, { align: "left" });
        if (underline && i > 0 && text.toLowerCase() !== "description") {
          const underlineWidth = doc.getTextWidth(text);
          doc.setDrawColor(0);
          doc.line(textX, y + 1, textX + underlineWidth, y + 1);
          doc.setDrawColor(200);
        }
      } else {
        doc.text(text, x + colWidths[colIndex] - 4, y, { align: "right" });
      }
      if (colIndex > 0) doc.line(x, y - 11, x, y + rowHeight - 11);
      x += colWidths[colIndex];
    });
    y += rowHeight;
  });

  if (bottomBorder) {
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(startX, y - 11, startX + tableWidth, y - 11);
  }

  return rows.length * rowHeight;
}

// ---- TEST UI ----
export default function PaystubGeneratorTestUI() {
  const handleTest = async () => {
    const testData = {
      name: "John Doe",
      ssn: "1234",
      address: "1234 Main St",
      city: "Louisville",
      state: "KY",
      company: "Supreme Detail Studio",
      companyAddress: "4600 Pinewood Rd Ste A",
      companyCity: "Louisville",
      companyState: "KY",
      companyPhone: "502-417-0690",
      rate: 20,
      hours: 8,
      startDate: "2025-10-01",
      endDate: "2025-10-15",
      payDate: "2025-10-18",
      periods: 3,
      includeLocalTax: true,
    };
    await generateAndDownloadMultiple(testData);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Paystub Generator Test</h2>
      <button
        onClick={handleTest}
        style={{
          background: "#007bff",
          color: "#fff",
          padding: "10px 20px",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Generate Sample Paystubs
      </button>
    </div>
  );
}
