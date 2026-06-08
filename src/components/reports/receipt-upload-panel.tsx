"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  analysisToLineItemDrafts,
  RECEIPT_CATEGORIES,
  RECEIPT_CATEGORY_LABELS,
  type AnalyzedReceipt,
  type ReceiptAnalysisResult,
  type ReceiptCategory,
} from "@/lib/receipt-analysis";
import { formatCurrency } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Sparkles,
  X,
  ZoomIn,
} from "lucide-react";

export type AppliedLineItemDraft = ReturnType<typeof analysisToLineItemDrafts>[number];

interface ReceiptUploadPanelProps {
  reportId: string;
  disabled?: boolean;
  onApply: (items: AppliedLineItemDraft[]) => void;
}

export function ReceiptUploadPanel({ reportId, disabled, onApply }: ReceiptUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [receipts, setReceipts] = useState<AnalyzedReceipt[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<AnalyzedReceipt | null>(null);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) return;

      for (const file of imageFiles) {
        const id = crypto.randomUUID();
        const localPreview = URL.createObjectURL(file);

        setReceipts((prev) => [
          ...prev,
          {
            id,
            fileName: file.name,
            previewUrl: localPreview,
            storagePath: "",
            status: "analyzing",
          },
        ]);

        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("reportId", reportId);

          const res = await fetch("/api/receipts/analyze", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.error || "Analysis failed");
          }

          setReceipts((prev) =>
            prev.map((r) =>
              r.id === id
                ? {
                    ...r,
                    previewUrl: data.previewUrl || localPreview,
                    storagePath: data.storagePath,
                    status: "ready" as const,
                    analysis: data.analysis as ReceiptAnalysisResult,
                  }
                : r
            )
          );
        } catch (err) {
          setReceipts((prev) =>
            prev.map((r) =>
              r.id === id
                ? {
                    ...r,
                    status: "error" as const,
                    error: err instanceof Error ? err.message : "Failed to analyze",
                  }
                : r
            )
          );
        }
      }
    },
    [reportId]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    processFiles(e.dataTransfer.files);
  }

  function handleApply(receipt: AnalyzedReceipt, editedAnalysis: ReceiptAnalysisResult) {
    const drafts = analysisToLineItemDrafts(editedAnalysis, receipt.storagePath);
    onApply(drafts);
    setReceipts((prev) =>
      prev.map((r) => (r.id === receipt.id ? { ...r, status: "applied" as const } : r))
    );
  }

  function dismissReceipt(id: string) {
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  }

  const pendingCount = receipts.filter((r) => r.status === "ready").length;

  return (
    <Card padding="md" className="border-2 border-dashed border-pdx-blue/20 bg-gradient-to-br from-blue-50/50 to-white">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-pdx-accent" />
              AI Receipt Scanner
            </CardTitle>
            <CardDescription>
              Upload receipt photos — AI will read, categorize, and itemize expenses for you
            </CardDescription>
          </div>
          {pendingCount > 0 && (
            <span className="shrink-0 px-2.5 py-1 rounded-full bg-pdx-accent text-white text-xs font-medium">
              {pendingCount} ready to review
            </span>
          )}
        </div>
      </CardHeader>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all",
          disabled && "opacity-50 cursor-not-allowed",
          dragOver
            ? "border-pdx-blue bg-blue-50 scale-[1.01]"
            : "border-slate-300 hover:border-pdx-blue hover:bg-slate-50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          multiple
          className="hidden"
          disabled={disabled}
          onChange={(e) => e.target.files && processFiles(e.target.files)}
        />
        <ImagePlus className="h-10 w-10 text-slate-400 mx-auto mb-3" />
        <p className="font-medium text-slate-700">
          Drop receipt images here or click to browse
        </p>
        <p className="text-xs text-slate-500 mt-1">JPEG, PNG, WebP · Max 10 MB · Multiple files OK</p>
      </div>

      {/* Receipt queue */}
      {receipts.length > 0 && (
        <div className="mt-6 space-y-4">
          {receipts.map((receipt) => (
            <ReceiptReviewCard
              key={receipt.id}
              receipt={receipt}
              disabled={disabled}
              onApply={(analysis) => handleApply(receipt, analysis)}
              onDismiss={() => dismissReceipt(receipt.id)}
              onPreview={() => setPreviewReceipt(receipt)}
            />
          ))}
        </div>
      )}

      {/* Full-size preview modal */}
      {previewReceipt && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreviewReceipt(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewReceipt(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300"
            >
              <X className="h-6 w-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewReceipt.previewUrl}
              alt="Receipt"
              className="max-h-[85vh] rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </Card>
  );
}

function ReceiptReviewCard({
  receipt,
  disabled,
  onApply,
  onDismiss,
  onPreview,
}: {
  receipt: AnalyzedReceipt;
  disabled?: boolean;
  onApply: (analysis: ReceiptAnalysisResult) => void;
  onDismiss: () => void;
  onPreview: () => void;
}) {
  const [edited, setEdited] = useState<ReceiptAnalysisResult | null>(receipt.analysis ?? null);

  useEffect(() => {
    if (receipt.analysis) setEdited(receipt.analysis);
  }, [receipt.analysis]);

  if (receipt.status === "analyzing") {
    return (
      <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200">
        <div className="h-16 w-16 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={receipt.previewUrl} alt="" className="h-full w-full object-cover opacity-50" />
        </div>
        <div className="flex-1 flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-pdx-blue" />
          <div>
            <p className="font-medium text-sm">{receipt.fileName}</p>
            <p className="text-xs text-slate-500">Analyzing with AI...</p>
          </div>
        </div>
      </div>
    );
  }

  if (receipt.status === "error") {
    return (
      <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-200">
        <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-red-800">{receipt.fileName}</p>
          <p className="text-xs text-red-600">{receipt.error}</p>
        </div>
        <button onClick={onDismiss} className="text-red-400 hover:text-red-600">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (receipt.status === "applied") {
    return (
      <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-200">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        <div className="flex-1">
          <p className="font-medium text-sm text-green-800">{receipt.fileName}</p>
          <p className="text-xs text-green-600">Added to expense report</p>
        </div>
        <button onClick={onDismiss} className="text-green-400 hover:text-green-600">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (!edited) return null;

  const confidencePct = Math.round(edited.confidence * 100);
  const confidenceColor =
    confidencePct >= 80 ? "text-green-600 bg-green-50" : confidencePct >= 50 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";

  function updateLineItem(index: number, field: "description" | "amount" | "category", value: string) {
    setEdited((prev) => {
      if (!prev) return prev;
      const items = [...prev.line_items];
      const item = { ...items[index] };
      if (field === "amount") item.amount = parseFloat(value) || 0;
      else if (field === "category") item.category = value as ReceiptCategory;
      else item.description = value;
      items[index] = item;
      const total = items.reduce((s, i) => s + i.amount, 0);
      return { ...prev, line_items: items, total_amount: Math.round(total * 100) / 100 };
    });
  }

  function updateField(field: keyof ReceiptAnalysisResult, value: string | number | null) {
    setEdited((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="flex flex-col sm:flex-row">
        {/* Thumbnail */}
        <button
          type="button"
          onClick={onPreview}
          className="relative sm:w-36 h-32 sm:h-auto shrink-0 group cursor-zoom-in"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={receipt.previewUrl} alt="Receipt" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>

        {/* Analysis review */}
        <div className="flex-1 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-slate-800">{edited.merchant_name}</h4>
              <p className="text-lg font-bold text-pdx-blue">{formatCurrency(edited.total_amount)}</p>
            </div>
            <span className={cn("px-2 py-0.5 rounded text-xs font-medium", confidenceColor)}>
              {confidencePct}% confidence
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              value={edited.expense_date ?? ""}
              onChange={(e) => updateField("expense_date", e.target.value || null)}
            />
            <Input
              label="Related To"
              value={edited.related_to}
              onChange={(e) => updateField("related_to", e.target.value)}
              hint="Client, account, or business purpose"
            />
          </div>

          {/* Itemized breakdown */}
          {edited.line_items.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Itemized ({edited.line_items.length} {edited.line_items.length === 1 ? "item" : "items"})
              </p>
              {edited.line_items.map((item, i) => (
                <div key={i} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(i, "description", e.target.value)}
                      className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
                    />
                  </div>
                  <select
                    value={item.category}
                    onChange={(e) => updateLineItem(i, "category", e.target.value)}
                    className="rounded border border-slate-200 px-2 py-1.5 text-xs max-w-[140px]"
                  >
                    {RECEIPT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {RECEIPT_CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={item.amount || ""}
                    onChange={(e) => updateLineItem(i, "amount", e.target.value)}
                    className="w-20 rounded border border-slate-200 px-2 py-1.5 text-xs text-right"
                  />
                </div>
              ))}
            </div>
          )}

          {edited.notes && (
            <p className="text-xs text-slate-500 italic">AI note: {edited.notes}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => onApply(edited)}
              disabled={disabled}
              className="flex-1 sm:flex-none"
            >
              <CheckCircle2 className="h-4 w-4" />
              Add to Report
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
