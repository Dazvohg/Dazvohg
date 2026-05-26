import { supabase } from "./supabase";
import type { AdviceItem } from "../domain/finance";
import type { ExpenseCategory } from "../domain/types";

export type OcrReceiptResult = {
  amount: number;
  description: string;
  category: ExpenseCategory;
  date: string | null;
};

export type SmartAdviceSummary = {
  salary: number;
  totalExpenses: number;
  totalDebt: number;
  totalLiquid: number;
  inflationMonthly: number | null;
  countryRisk: number | null;
  blueDolar: number;
  mepDolar: number;
  riskLevel: "conservador" | "moderado" | "agresivo";
  simPnlPct: number | null;
  topExpenseCategory: string | null;
  goalsCount: number;
  hasCards: boolean;
};

export async function callSmartAdvice(summary: SmartAdviceSummary): Promise<AdviceItem[]> {
  if (!supabase) return [];
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];

  try {
    const res = await supabase.functions.invoke("smart-advice", {
      body: { summary },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.error) return [];
    const advices = (res.data as { advices?: AdviceItem[] })?.advices;
    if (!Array.isArray(advices) || advices.length === 0) return [];
    return advices;
  } catch {
    return [];
  }
}

export async function callOcrReceipt(
  imageBase64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp",
): Promise<OcrReceiptResult | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  try {
    const res = await supabase.functions.invoke("ocr-receipt", {
      body: { imageBase64, mimeType },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.error) return null;
    const result = res.data as OcrReceiptResult | { error: string };
    if ("error" in result) return null;
    return result;
  } catch {
    return null;
  }
}

/** Convert a File object to base64 string (strips the data: prefix). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
