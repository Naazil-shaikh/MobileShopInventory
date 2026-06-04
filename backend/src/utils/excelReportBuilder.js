const HEADER_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E293B" },
};

const HEADER_FONT = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };

export const formatDateCell = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export const formatMoney = (value) => {
  const n = Number(value) || 0;
  return Math.round(n * 100) / 100;
};

export const addReportTitle = (sheet, title, generatedAt, colSpan = 6) => {
  const endCol = String.fromCharCode(64 + Math.min(colSpan, 26));
  sheet.mergeCells(`A1:${endCol}1`);
  const titleCell = sheet.getCell("A1");
  titleCell.value = title;
  titleCell.font = { bold: true, size: 16, color: { argb: "FF0F172A" } };
  titleCell.alignment = { vertical: "middle" };

  sheet.mergeCells(`A2:${endCol}2`);
  sheet.getCell("A2").value = `Generated: ${formatDateCell(generatedAt)}`;
  sheet.getCell("A2").font = { size: 10, color: { argb: "FF64748B" } };

  sheet.getRow(1).height = 28;
  sheet.getRow(2).height = 20;
};

export const addTableHeaders = (sheet, rowIndex, headers) => {
  const row = sheet.getRow(rowIndex);
  headers.forEach((header, index) => {
    const cell = row.getCell(index + 1);
    cell.value = header;
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });
  row.height = 22;
};

export const addKeyValueRows = (sheet, startRow, entries) => {
  let rowIndex = startRow;
  for (const [label, value] of entries) {
    const row = sheet.getRow(rowIndex);
    row.getCell(1).value = label;
    row.getCell(1).font = { bold: true, color: { argb: "FF475569" } };
    row.getCell(2).value = value;
    rowIndex += 1;
  }
  return rowIndex;
};

export const autoSizeColumns = (sheet, minWidth = 12, maxWidth = 48) => {
  sheet.columns.forEach((column) => {
    let maxLen = minWidth;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const val = cell.value?.toString?.() || "";
      maxLen = Math.max(maxLen, Math.min(val.length + 2, maxWidth));
    });
    column.width = maxLen;
  });
};

export const addDataRows = (sheet, startRow, rows, columns) => {
  let rowIndex = startRow;
  for (const record of rows) {
    const row = sheet.getRow(rowIndex);
    columns.forEach((col, index) => {
      const raw = record[col.key];
      row.getCell(index + 1).value =
        col.format === "date"
          ? formatDateCell(raw)
          : col.format === "money"
            ? formatMoney(raw)
            : raw ?? "";
    });
    rowIndex += 1;
  }
  return rowIndex;
};

export const addSheetTable = (
  workbook,
  sheetName,
  title,
  generatedAt,
  headers,
  rows,
  columns,
) => {
  const sheet = workbook.addWorksheet(sheetName);
  addReportTitle(sheet, title, generatedAt, headers.length);
  const headerRow = 4;
  addTableHeaders(sheet, headerRow, headers);
  addDataRows(sheet, headerRow + 1, rows, columns);
  autoSizeColumns(sheet);
  return sheet;
};
