import React, { useEffect } from "react";
import { jsPDF } from "jspdf";
import emailjs from "emailjs-com";

/**
 * SuccessPage.jsx
 * ----------------------------------------
 * This page runs automatically after Stripe redirects back
 * to /success. It reads user data saved in localStorage,
 * generates all requested paystubs (1–4), merges them into
 * a single PDF, downloads it, and emails it via EmailJS.
 */

export default function SuccessPage() {
  useEffect(() => {
    const formData = JSON.parse(localStorage.getItem("paystubData"));
    if (formData) {
      generateAndSendPaystubs(formData);
    }
  }, []);

  // ---- Main Generation Function ----
  const generateAndSendPaystubs = async (data) => {
    const start = new Date(data.startDate);
    const count = parseInt(data.count) || 1;
    const isBiweekly = data.frequency === "biweekly";
    const daysBetween = isBiweekly ? 14 : 7;
    const allDocs = [];

    for (let i = 0; i < count; i++) {
      const payStart = new Date(start);
      payStart.setDate(payStart.getDate() + i * daysBetween);
      const payEnd = new Date(payStart);
      payEnd.setDate(payEnd.getDate() + 6);

      const periodLabel = `${payStart.toLocaleDateString()} - ${payEnd.toLocaleDateString()}`;
      const payDate = new Date(payEnd);
      payDate.setDate(payDate.getDate() + 5);

      const stub = await createPaystubPDF({
        ...data,
        payPeriod: periodLabel,
        payDate: payDate.toLocaleDateString(),
      });

      allDocs.push(stub);
    }

    // ---- Merge PDFs into one ----
    const merged = new jsPDF({ unit: "pt", format: "letter" });
    for (let i = 0; i < allDocs.length; i++) {
      const img = allDocs[i].output("datauristring");
      if (i > 0) merged.addPage();
    //   merged.addImage(img, "PNG", 0, 0, 612, 792);
    }

    // Download merged PDF
    merged.save(`${data.name.replace(/\s+/g, "_")}_paystubs.pdf`);

    // Email PDF as attachment
    const blob = merged.output("blob");
    sendEmail(blob, data.email);
  };

  // ---- Create a single paystub PDF ----
  const createPaystubPDF = async (data) => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const left = 36;
    const rightEdge = 559;
    let y = 40;

    // const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQAAAC9CAYAAABF9o+aAAAACXBIWXMAAAsTAAALEwEAmpwYAAAGAGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDUgNzkuMTYzNDk5LCAyMDE4LzA4LzEzLTE2OjQwOjIyICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoTWFjaW50b3NoKSIgeG1wOkNyZWF0ZURhdGU9IjIwMTktMDctMzBUMTA6NDM6MTMtMDc6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDE5LTA3LTMwVDEwOjUyOjI0LTA3OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDE5LTA3LTMwVDEwOjUyOjI0LTA3OjAwIiBkYzpmb3JtYXQ9ImltYWdlL3BuZyIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIgcGhvdG9zaG9wOklDQ1Byb2ZpbGU9InNSR0IgSUVDNjE5NjYtMi4xIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOmFiNTczNjNlLWI5ZWUtNDFjYS1hOGNlLTEwMjhhZmQ3ZTliOCIgeG1wTU06RG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOmU2NTZiMzNiLTY2NWUtYWM0Yi1hMDYxLWZhMzc0ZDI0NmI5ZCIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOjA3ZmZjMjgxLThkN2YtNGM3OC1hMjg0LWFmZmMxYTA1MmE0MCI+IDx4bXBNTTpIaXN0b3J5PiA8cmRmOlNlcT4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNyZWF0ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6MDdmZmMyODEtOGQ3Zi00Yzc4LWEyODQtYWZmYzFhMDUyYTQwIiBzdEV2dDp3aGVuPSIyMDE5LTA3LTMwVDEwOjQzOjEzLTA3OjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoTWFjaW50b3NoKSIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6YWI1NzM2M2UtYjllZS00MWNhLWE4Y2UtMTAyOGFmZDdlOWI4IiBzdEV2dDp3aGVuPSIyMDE5LTA3LTMwVDEwOjUyOjI0LTA3OjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoTWFjaW50b3NoKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz55NKKIAAAk/UlEQVR4nO3dd5hV5bXH8S8jKiqoFLGBvfeOvUZj19gbtsQSY6KouYmkiC1qTFETY4xJLIlivxqs1y72grFrRCUKghAFhFhA5f6xZmQYp5zy7rX23uf3eR4e2rDXYmbOWXu/Zb3dpg7eCRGRBrU18ADwKTAzwzi9gKHAORnGkAbXPToBEZFAczX/3KP5R5bmzfj60uCaohMQERGR+qmgi4iIlIAKuoiISAmooIuIiJSACrqIiEgJqKCLiIiUgAq6iIhI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"; // your full base64 string
    // doc.addImage(logoBase64, "PNG", left, y, 120, 32);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Earnings Statement", 306, y + 18, { align: "center" });

    y += 60;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    const gross = Number(data.rate) * Number(data.hours);
    const taxes = gross * 0.12; // Example 12% tax
    const net = gross - taxes;

    doc.text(`Employee: ${data.name}`, left, y);
    doc.text(`Company: ${data.company}`, left, y + 14);
    doc.text(`Pay Period: ${data.payPeriod}`, left, y + 28);
    doc.text(`Pay Date: ${data.payDate}`, left, y + 42);
    doc.text(`Hours Worked: ${data.hours}`, left, y + 56);
    doc.text(`Hourly Rate: $${data.rate}`, left, y + 70);
    doc.text(`Gross Pay: $${gross.toFixed(2)}`, left, y + 84);
    doc.text(`Taxes (est): $${taxes.toFixed(2)}`, left, y + 98);
    doc.text(`Net Pay: $${net.toFixed(2)}`, left, y + 112);

    y += 150;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text("This paystub was generated for record purposes only.", left, y);

    return doc;
  };

  // ---- Convert logo to base64 for jsPDF ----
  const toBase64 = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = url;
    });

  // ---- Email PDF via EmailJS ----
  const sendEmail = (blob, email) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64PDF = reader.result.split(",")[1];
      emailjs.send(
        "service_dwne62d",
        "Ytemplate_5ei15tc",
        {
          to_email: email,
          subject: "Your Paystub(s)",
          message: "Attached are your generated paystubs.",
          attachment: base64PDF,
        },
        "YOUR_PUBLIC_KEY"
      );
    };
    reader.readAsDataURL(blob);
  };

  return (
    <div className="text-center p-10">
      <h2 className="text-2xl font-bold text-green-600">Payment Successful!</h2>
      <p className="mt-4 text-gray-600">
        Generating your paystubs... They’ll be downloaded and emailed shortly.
      </p>
    </div>
  );
}
