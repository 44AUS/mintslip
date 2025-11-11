import React, { useEffect } from "react";
import { jsPDF } from "jspdf";
import emailjs from "emailjs-com";
import BankStatementGenerator from "./BankStatementGenerator";

/**
 * SuccessPage.jsx
 * ----------------------------------------
 * This page runs automatically after Stripe redirects back
 * to /success. It reads user data saved in localStorage,
 * generates all requested paystubs (1–4), merges them into
 * a single PDF, downloads it, and emails it via EmailJS.
 */

export default function SuccessPage(){
      return (
    <>
    <BankStatementGenerator />
    </>
  );
}