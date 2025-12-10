// BankStatementGenerator.jsx
import React, { useState, useEffect, useMemo } from "react";
import { jsPDF } from "jspdf";
import Calibri from "../assets/fonts/calibri.ttf"
import CalibriBold from "../assets/fonts/calibrib.ttf"
import GustoLogo from "../assets/Sutton.jpg";

export default function BankStatementGenerator() {
  const [accountName, setAccountName] = useState("Austin Flatt");
  const [accountAddress1, setAccountAddress1] = useState("4600 Pinewood Rd, Unit A");
  const [accountAddress2, setAccountAddress2] = useState("Louisville, KY 40218");
  const [accountNumber, setAccountNumber] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(""); // new
  const [statementStart, setStatementStart] = useState("");
  const [statementEnd, setStatementEnd] = useState("");
  const [beginningBalance, setBeginningBalance] = useState("0.00");

  const [transactions, setTransactions] = useState([
    { date: "", description: "", type: "Purchase", amount: "", settlementDate: "" },
  ]);

  // Format helper for full month names
  const formatDateLong = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "2-digit",
    });
  };

  // Automatically set start and end when month changes
  useEffect(() => {
    if (!selectedMonth) return;
    const [year, month] = selectedMonth.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0); // last day of month
    setStatementStart(start.toISOString().split("T")[0]);
    setStatementEnd(end.toISOString().split("T")[0]);
  }, [selectedMonth]);

  // Default to current month
  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    setSelectedMonth(`${y}-${m}`);
  }, []);

  function parseCurrencyStr(s) {
    const cleaned = String(s || "").replace(/[^0-9.-]/g, "");
    if (cleaned === "" || cleaned === "." || cleaned === "-") return 0;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  const addTransaction = () => {
    setTransactions((t) => [
      ...t,
      { date: "", description: "", type: "Purchase", amount: "", settlementDate: "" },
    ]);
  };

  const removeTransaction = (idx) => {
    setTransactions((t) => t.filter((_, i) => i !== idx));
  };

  const updateTransaction = (idx, field, value) => {
    setTransactions((t) => {
      const copy = [...t];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const summary = useMemo(() => {
    const beginning = parseCurrencyStr(beginningBalance);
    let ending = beginning;
    let deposits = 0,
      purchases = 0,
      transfers = 0,
      refunds = 0;

    transactions.forEach((tx) => {
      const amount = parseCurrencyStr(tx.amount);
      switch (tx.type) {
        case "Deposit":
          deposits += amount;
          ending += amount;
          break;
        case "Refund":
          refunds += amount;
          ending += amount;
          break;
        case "Purchase":
          purchases += amount;
          ending -= amount;
          break;
        case "Transfer":
          transfers += amount;
          ending -= amount;
          break;
        default:
          break;
      }
    });

    const toFixed = (n) =>
      n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    return { beginning, deposits, purchases, transfers, refunds, ending, toFixed };
  }, [transactions, beginningBalance]);

const downloadPdf = () => {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
// Register Calibri fonts
doc.addFileToVFS("calibri.ttf", Calibri);
doc.addFont("calibri.ttf", "Calibri", "normal");

doc.addFileToVFS("calibrib.ttf", CalibriBold);
doc.addFont("calibrib.ttf", "Calibri", "bold");

// Set default font



  const margin = 25;
  let y = margin + 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const grayLine = "#e6e6e6";

  // ✅ define helper BEFORE usage
  const formatDateLong = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleString("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric",
    });
  };

  // Header
  doc.setFontSize(28);
  doc.setTextColor("#00b26a");
  // <-- REPLACED: insert Gusto logo instead of the old "chime" text
  try {
    // If your bundler provides a URL or base64 string via import, this will work.
    doc.addImage(GustoLogo, "PNG", margin, y - 18, 90, 38);
  } catch (e) {
    // fallback to text if addImage fails
    doc.text("GUSTO", margin, y);
  }
  
// --- Member Services Header ---
doc.setFontSize(7);

const rightAlignX = pageWidth - margin;
y += 15;

// Measure width of "Member Services" so we can align phone under the M
doc.setTextColor("#b4b4b4");
const label = "Member Services";
doc.text(label, rightAlignX, y, { align: "right" });

// Get left X position of where "Member Services" starts
const textWidth = doc.getTextWidth(label);
const leftX = rightAlignX - textWidth;

// Black phone number directly under "Member Services", flush to the M
doc.setTextColor("#000000");
doc.text("(800) 422-3641", leftX, y + 12);


  // Account Info
  y += 60;

  doc.setTextColor("#000");
  doc.setFontSize(7);
  doc.text(accountName, margin, y);
  doc.text(accountAddress1, margin, y + 12);
  doc.text(accountAddress2, margin, y + 24);

  // Statement Title
  y += 80;
  doc.setFontSize(16);
  doc.setTextColor("#b4b4b4");
  doc.text("Checking Account Statement", margin, y);

  // Account number and period
  y += 30;
  doc.setFontSize(8);

  doc.setTextColor("#9c9c9c");
  doc.text("Account number", margin, y);

  doc.setTextColor("#b4b4b4");
  doc.text(String(accountNumber || ""), margin, y + 14);

  if (statementStart && statementEnd) {
  const [year, month] = selectedMonth.split("-").map(Number);
  const monthText = new Date(year, month - 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const dateRange = `(${formatDateLong(statementStart)} - ${formatDateLong(statementEnd)})`;

  // Label
  doc.setFontSize(8);

  doc.setTextColor("#9c9c9c");
  doc.text("Statement period", margin, y + 36);

  // Month (slightly larger)
  doc.setFontSize(8);
  doc.setTextColor("#b4b4b4");
  doc.text(monthText, margin, y + 50);

  // Date range (smaller, lighter, directly after month)
  const monthWidth = doc.getTextWidth(monthText);
  doc.setFontSize(7);
  doc.text(` ${dateRange}`, margin + monthWidth, y + 50);
}


  // Issued
  y += 70;
  doc.setFontSize(7);
  doc.setTextColor("#b4b4b4");
  doc.text("Issued by Sutton Bank, Member FDIC", margin, y);

  // ✅ Summary section
  y += 50;
  const summaryWidth = 220;
  doc.setFontSize(8);

  doc.setTextColor("#e97032");
  doc.text("Summary", margin, y);

  y += 10;

  const beginningDateText = statementStart
    ? `Beginning balance on ${formatDateLong(statementStart)}`
    : "Beginning balance";
  const endingDateText = statementEnd
    ? `Ending balance on ${formatDateLong(statementEnd)}`
    : "Ending balance";

  const summaryRows = [
    [beginningDateText, summary.beginning, "#000"],
    ["Deposits", summary.deposits, "#000"],
    ["ATM Withdrawls", "0.00", "#000"],
    ["Purchases", summary.purchases, "#000"],
    ["Adjustments", "0.00", "#000"],
    ["Transfers", summary.transfers, "#000"],
    ["Round Up Transfers", "0.00", "#000"],
    ["Fees", "0.00", "#000"],
    ["SpotMe Tips", "0.00", "#000"],
    [endingDateText, summary.ending, "#1a51aa"],
  ];

  const rowHeight = 20;
  summaryRows.forEach(([label, val, color], idx) => {
    const isLastRow = idx === summaryRows.length - 1;

    // Divider line before each row
    doc.setDrawColor("#dddddd");
    doc.setLineWidth(0.7);
    doc.line(margin, y, margin + summaryWidth, y);
    y += rowHeight / 2;

    doc.setFontSize(7);
    
    doc.setTextColor(color);
    doc.text(label, margin, y);
    doc.text(`$${summary.toFixed(val)}`, margin + summaryWidth, y, {
      align: "right",
    });

    y += rowHeight / 3;

    // Divider line after each row except the last one
    if (!isLastRow) {
      doc.line(margin, y, margin + summaryWidth, y);
    }
  });


    // Transactions
    y += 40;
    doc.setTextColor("#e97032");

    doc.setFontSize(8);
    doc.text("Transactions", margin, y);
    y += 10;
    doc.setDrawColor("#dcdcdc");
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;

    const col = {
      date: margin,
      desc: margin + 90,
      type: margin + 320,
      netAmt: margin + 400,
      amt: margin + 465,
      settle: margin + 470,
    };

    doc.setFont("helvetica", "bold");
    doc.setTextColor("#000");
    doc.setFontSize(7);
    doc.text("TRANSACTION DATE", col.date, y);
    doc.text("DESCRIPTION", col.desc, y);
    doc.text("TYPE", col.type, y);
    doc.text("AMOUNT", col.netAmt, y, { align: "right" });
    doc.text("NET AMOUNT", col.amt, y, { align: "right" });
    doc.text("SETTLEMENT DATE", col.settle, y);
    y += 8;
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

// ===================== TRANSACTIONS SECTION =====================
const bottomLimit = doc.internal.pageSize.getHeight() - 60;
const lineHeight = 14;

// ✅ Helper for date formatting (M/DD/YYYY)
const formatShortDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const month = d.getMonth() + 1; // no leading zero for month
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
};

// ✅ Helper to auto-generate realistic settlement dates
const getAutoSettlementDate = (tx) => {
  if (!tx.date) return "";
  const baseDate = new Date(tx.date + "T00:00:00");
  const type = (tx.type || "").toLowerCase();

  // Deposits, Transfers, Refunds settle same day
  if (["deposit", "transfer", "refund"].some((t) => type.includes(t))) {
    return formatShortDate(tx.date);
  }

  // Otherwise, randomly 1–2 days later
  const daysToAdd = Math.random() < 0.5 ? 1 : 2;
  baseDate.setDate(baseDate.getDate() + daysToAdd);
  const isoDate = baseDate.toISOString().split("T")[0];
  return formatShortDate(isoDate);
};

// ✅ Render transactions
transactions.forEach((tx) => {
  if (y + lineHeight > bottomLimit) {
    doc.addPage();
    y = margin;
  }

  const type = (tx.type || "").toLowerCase();
  const isDeduction =
    type.includes("withdrawal") ||
    type.includes("purchase") ||
    type.includes("fee") ||
    type.includes("transfer") ||
    type.includes("payment") ||
    type.includes("atm");

  const amountValue = parseCurrencyStr(tx.amount);
  const formattedAmount = `${isDeduction ? "-" : ""}$${amountValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
  })}`;
  const formattedNetAmount = `${isDeduction ? "-" : ""}$${amountValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
  })}`;

  const formattedDate = formatShortDate(tx.date);
  const formattedSettlementDate = getAutoSettlementDate(tx);

  // ✅ Description formatting logic
  const fullDesc = (tx.description || "").trim();
  let firstLine = "";
  let secondLine = "";

  if (type.includes("transfer")) {
    // Transfers → one line, normal case
    firstLine = fullDesc;
    secondLine = "";
  } else {
    // Other types → two-line format
    firstLine =
      fullDesc.length > 22 ? fullDesc.substring(0, 22).trim() + "" : fullDesc;
    secondLine = fullDesc.toUpperCase();
  }

  doc.setFont("helvetica", "normal");
  doc.setTextColor("#000");

  // Transaction Date
  doc.text(formattedDate, col.date, y);

  // Description lines
  doc.setFontSize(7);
  doc.text(firstLine, col.desc, y);

  if (secondLine) {
    doc.setFontSize(6);
    doc.text(secondLine, col.desc, y + 8);
    doc.setFontSize(7)
  }

  // Type, Amounts, Settlement
  doc.text(tx.type || "", col.type, y);
  doc.text(formattedAmount, col.amt, y, { align: "right" });
  doc.text(formattedNetAmount, col.netAmt, y, { align: "right" });
  doc.text(formattedSettlementDate, col.settle, y);

  // Adjust spacing depending on number of lines
  y += secondLine ? lineHeight * 1.5 : lineHeight;
});



// --- Final default page ---
doc.addPage();
const pageHeight = doc.internal.pageSize.getHeight();
doc.setFontSize(12);

doc.setTextColor("#333");
doc.text("Error Resolution Procedures", margin, margin + 50);

doc.setFontSize(10);
let yPos = margin + 90;

// Define text parts
const beforePhone =
  "In case of errors or questions about your electronic transactions, call ";
const phoneNumber = "1-800-422-3641";
const afterPhone =
  ", write to Sutton Bank Member Services, P.O. Box 505, Attica, OH 44807-505, as soon as you can, if you think your statement or receipt is wrong or if you need more information about a transfer listed on the statement or receipt. We must hear from you no later than 60 days after we sent the FIRST statement on which the problem or error appeared.";

// Combine for wrapping
const fullText = beforePhone + phoneNumber + afterPhone;

// Wrap text properly
const wrappedText = doc.splitTextToSize(fullText, pageWidth - margin * 2);

// Draw each line and color phone number
let lineY = yPos;
for (const line of wrappedText) {
  if (line.includes(phoneNumber)) {
    const parts = line.split(phoneNumber);
    let x = margin;

    // Before number
    doc.setTextColor("#333");
    doc.text(parts[0], x, lineY);
    x += doc.getTextWidth(parts[0]);

    // Phone number (blue + clickable)
    const blueColor = "#215e99";
    doc.setTextColor(blueColor);
    doc.textWithLink(phoneNumber, x, lineY, { url: "tel:18442446363" });
    x += doc.getTextWidth(phoneNumber);

    // After number
    if (parts[1]) {
      doc.setTextColor("#333");
      doc.text(parts[1], x, lineY);
    }
  } else {
    doc.setTextColor("#333");
    doc.text(line, margin, lineY);
  }

  lineY += 12; // line spacing
}

// --- Add the rest of the sentences ---
lineY += 12; // space before list
const additionalText = `(1) Tell us your name and account number (if any).

(2) Describe the error or the transfer you are unsure about, and explain as clearly as you can why you believe it is an error or why you need more information.

(3) Tell us the dollar amount of the suspected error.

We will investigate your complaint and will correct any error promptly. If we take more than 10 business days to do this, we will credit your account for the amount you think is in error, so that you will have the use of the money during the time it takes us to complete our investigation.`;

// Wrap and print additional text neatly
const wrappedAdditional = doc.splitTextToSize(additionalText, pageWidth - margin * 2);
doc.text(wrappedAdditional, margin, lineY);


    // --- Page Numbers ---
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor("#666");
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 30,
        { align: "center" }
      );
    }

    doc.save(`Sutton-Statement-${accountName || "statement"}.pdf`);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ textAlign: "center", fontSize: 22 }}>
        Bank Statement Generator — Chime Style
      </h1>
      <p style={{ textAlign: "center", color: "#666" }}>
        Fill in the form and download your PDF.
      </p>

      <div style={{ display: "flex", gap: 20, marginTop: 18 }}>
        <div style={{ flex: 1 }}>
          <label>
            Account Holder Name
            <input value={accountName} onChange={(e) => setAccountName(e.target.value)} />
          </label>
          <label>
            Address Line 1
            <input value={accountAddress1} onChange={(e) => setAccountAddress1(e.target.value)} />
          </label>
          <label>
            Address Line 2
            <input value={accountAddress2} onChange={(e) => setAccountAddress2(e.target.value)} />
          </label>
          <label>
            Account Number
            <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
          </label>

          {/* Month selector replaces start/end */}
          <label>
            Statement Month
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </label>

          <label>
            Beginning Balance
            <input value={beginningBalance} onChange={(e) => setBeginningBalance(e.target.value)} />
          </label>

          <div style={{ marginTop: 12 }}>Transactions - In order from newest to oldest</div>
          {transactions.map((tx, i) => (
            <div key={i} style={{ border: "1px solid #eee", padding: 6, marginTop: 6 }}>
              <input
                type="date"
                value={tx.date}
                onChange={(e) => updateTransaction(i, "date", e.target.value)}
              />
              <input
                placeholder="Description"
                value={tx.description}
                onChange={(e) => updateTransaction(i, "description", e.target.value)}
              />
              <select
                value={tx.type}
                onChange={(e) => updateTransaction(i, "type", e.target.value)}
              >
                <option>Purchase</option>
                <option>Deposit</option>
                <option>Transfer</option>
                <option>Refund</option>
              </select>
              <input
                placeholder="Amount"
                value={tx.amount}
                onChange={(e) => updateTransaction(i, "amount", e.target.value)}
              />
              <input
                type="date"
                placeholder="Settlement"
                value={tx.settlementDate}
                onChange={(e) => updateTransaction(i, "settlementDate", e.target.value)}
              />
              <button onClick={() => removeTransaction(i)}>Remove</button>
            </div>
          ))}
          <button onClick={addTransaction}>+ Add Transaction</button>
          <button onClick={downloadPdf}>Download PDF</button>
        </div>
      </div>
    </div>
  );
}
