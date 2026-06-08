import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, getRegionLabel } from "@/lib/types";
import type { ExpenseLineItem, ExpenseReport, Profile } from "@/lib/types";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get("reportId");

  if (!reportId) {
    return NextResponse.json({ error: "Report ID required" }, { status: 400 });
  }

  const { data: report, error: reportError } = await supabase
    .from("expense_reports")
    .select("*")
    .eq("id", reportId)
    .eq("user_id", user.id)
    .single();

  if (reportError || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: lineItems } = await supabase
    .from("expense_line_items")
    .select("*")
    .eq("report_id", reportId)
    .order("sort_order", { ascending: true });

  const buffer = await generateExpenseWorkbook(
    report as ExpenseReport,
    (profile as Profile) ?? null,
    (lineItems as ExpenseLineItem[]) ?? []
  );

  const filename = `PDX_Expense_${report.pay_period_start}_${report.pay_period_end}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

async function generateExpenseWorkbook(
  report: ExpenseReport,
  profile: Profile | null,
  lineItems: ExpenseLineItem[]
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Expense Report");

  const employeeName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : "Employee";

  // Title row
  sheet.mergeCells("A1:M1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = "Expense report";
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: "center" };

  sheet.mergeCells("A2:M2");
  sheet.getCell("A2").value = "All expenses must have receipts attached to the report.";
  sheet.getCell("A2").font = { italic: true, size: 10 };

  // Header info
  sheet.getCell("A4").value = "Employee/Independent Contractor Name:";
  sheet.getCell("C4").value = employeeName;
  sheet.getCell("A5").value = "Company:";
  sheet.getCell("C5").value = profile?.company ?? "Parts Distribution Xpress";
  sheet.getCell("A6").value = "PAY PERIOD:";
  sheet.getCell("B6").value = "From";
  sheet.getCell("C6").value = report.pay_period_start;
  sheet.getCell("D6").value = "To";
  sheet.getCell("E6").value = report.pay_period_end;
  sheet.getCell("G6").value = "Number of Pages:";
  sheet.getCell("H6").value = report.number_of_pages;

  // Column headers (row 8)
  const headers = [
    "Date",
    "Description",
    "RELATED TO",
    "TRV / LOD",
    "Tolls/Parking",
    "Enter Miles Only",
    "Mileage Calc",
    "OFF. SUP & sign",
    "Meals & Enter.",
    "Veh M / R",
    "Marketing",
    "Misc.",
    "Total",
  ];

  const headerRow = sheet.getRow(8);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 9 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: i === 2 ? "FFB4D7FF" : i === 5 ? "FFFFCCCC" : i >= 6 && i <= 12 ? "FFD9D9D9" : "FFE2EFDA" },
    };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
    cell.alignment = { horizontal: "center", wrapText: true };
  });

  // Data rows — pad to 25 rows like the template
  const rowCount = Math.max(lineItems.length, 25);
  const dataStartRow = 9;

  for (let i = 0; i < rowCount; i++) {
    const item = lineItems[i];
    const row = sheet.getRow(dataStartRow + i);
    const values = item
      ? [
          item.expense_date ?? "",
          item.description ?? "",
          item.related_to ?? "",
          item.travel_lodging || "",
          item.tolls_parking || "",
          item.miles || "",
          item.mileage_calc || "",
          item.office_supplies || "",
          item.meals_entertainment || "",
          item.vehicle_maintenance || "",
          item.marketing || "",
          item.misc || "",
          item.row_total || "",
        ]
      : ["", "", "", "", "", "", "", "", "", "", "", "", ""];

    values.forEach((v, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = v;
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
      if (colIdx >= 3) {
        cell.numFmt = colIdx === 5 ? "0.00" : '"$"#,##0.00';
      }
      if (i % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFF2CC" },
        };
      }
    });
  }

  // Totals row
  const totalsRowNum = dataStartRow + rowCount + 1;
  const totalsRow = sheet.getRow(totalsRowNum);
  totalsRow.getCell(3).value = "TOTALS";
  totalsRow.getCell(3).font = { bold: true };

  const totals = [
    report.total_travel_lodging,
    report.total_tolls_parking,
    report.total_miles,
    report.total_mileage_calc,
    report.total_office_supplies,
    report.total_meals_entertainment,
    report.total_vehicle_maintenance,
    report.total_marketing,
    report.total_misc,
    report.grand_total,
  ];

  totals.forEach((v, i) => {
    const cell = totalsRow.getCell(i + 4);
    cell.value = v;
    cell.font = { bold: true };
    cell.numFmt = i === 2 ? "0.00" : '"$"#,##0.00';
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9D9D9" },
    };
  });

  // Footer
  const footerRow = totalsRowNum + 3;
  sheet.getCell(`A${footerRow}`).value = "APPROVED:";
  sheet.getCell(`A${footerRow + 1}`).value = "_________________________";
  sheet.getCell(`A${footerRow + 2}`).value = "_________________________";

  sheet.getCell(`K${footerRow}`).value = "Subtotal:";
  sheet.getCell(`M${footerRow}`).value = report.grand_total;
  sheet.getCell(`M${footerRow}`).numFmt = '"$"#,##0.00';
  sheet.getCell(`M${footerRow}`).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFCCCC" },
  };

  sheet.getCell(`K${footerRow + 1}`).value = "Total:";
  sheet.getCell(`M${footerRow + 1}`).value = report.grand_total;
  sheet.getCell(`M${footerRow + 1}`).numFmt = '"$"#,##0.00';
  sheet.getCell(`M${footerRow + 1}`).font = { bold: true };
  sheet.getCell(`M${footerRow + 1}`).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFCCCC" },
  };

  // Column widths
  sheet.columns = [
    { width: 12 },
    { width: 25 },
    { width: 15 },
    { width: 10 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
    { width: 10 },
    { width: 12 },
    { width: 10 },
    { width: 12 },
  ];

  // Metadata sheet
  const metaSheet = workbook.addWorksheet("Metadata");
  metaSheet.getCell("A1").value = "Export Metadata";
  metaSheet.getCell("A1").font = { bold: true };
  metaSheet.getCell("A2").value = "Employee";
  metaSheet.getCell("B2").value = employeeName;
  metaSheet.getCell("A3").value = "Region";
  metaSheet.getCell("B3").value = profile ? getRegionLabel(profile.region) : "";
  metaSheet.getCell("A4").value = "Pay Period";
  metaSheet.getCell("B4").value = `${report.pay_period_start} to ${report.pay_period_end}`;
  metaSheet.getCell("A5").value = "Status";
  metaSheet.getCell("B5").value = report.status;
  metaSheet.getCell("A6").value = "Grand Total";
  metaSheet.getCell("B6").value = formatCurrency(report.grand_total);
  metaSheet.getCell("A7").value = "Exported At";
  metaSheet.getCell("B7").value = new Date().toISOString();

  return workbook.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}
