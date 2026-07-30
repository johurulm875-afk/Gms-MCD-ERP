import XLSX from 'xlsx-js-style';

export interface ExcelColumnDef {
  header: string;
  key: string;
  type?: 'text' | 'number' | 'date';
  width?: number;
  align?: 'left' | 'center' | 'right';
}

export interface CompanyExcelExportOptions<T> {
  moduleName: 'Sewing Thread' | 'Twill Tape' | 'Drawstring' | string;
  fileNamePrefix: string;
  data: T[];
  columns: ExcelColumnDef[];
  getBuyerName: (item: T) => string;
  isUnreceived?: (item: T) => boolean;
  getBookingQty?: (item: T) => number;
  getReceiveQty?: (item: T) => number;
  getDueQty?: (item: T) => number;
}

const COMPANY_NAME = 'GMS TEXTILES LTD.';
const COMPANY_ADDRESS = 'Tansutrapur, Kaliakair, Gazipur.';

/**
 * Creates a beautifully styled, professional Excel worksheet with:
 * 1. Company Name & Address Header Block (GMS TEXTILES LTD.)
 * 2. Module Title Header (e.g. Accessories MCD Daily Twill Tape Update - 2026)
 * 3. Summary Metadata Bar
 * 4. High-Contrast Table Headers with Borders
 * 5. Data Rows with Borders & Conditional Yellow Highlights for Unreceived/Due items
 * 6. Calculated Summary Totals Row at the bottom
 * 7. Auto Column Widths
 */
function createProfessionalWorksheet<T>(
  itemList: T[],
  columns: ExcelColumnDef[],
  titleHeader: string,
  options: CompanyExcelExportOptions<T>
): XLSX.WorkSheet {
  const numCols = columns.length;
  const lastColIdx = Math.max(0, numCols - 1);

  // 1. Construct Header Block Rows
  const companyRow = [COMPANY_NAME, ...Array(lastColIdx).fill('')];
  const addressRow = [COMPANY_ADDRESS, ...Array(lastColIdx).fill('')];
  const titleRow = [titleHeader, ...Array(lastColIdx).fill('')];
  
  const totalItemsCount = itemList.length;
  const reportDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const metaRow = [`Report Date: ${reportDate} | Total Records: ${totalItemsCount} | Department: Accessories MCD`, ...Array(lastColIdx).fill('')];
  const blankRow = Array(numCols).fill('');

  // 2. Table Header Row
  const headerLabels = columns.map(c => c.header);

  // 3. Data Rows
  const dataRows: (string | number)[][] = itemList.map((item) => {
    return columns.map(col => {
      const rawVal = (item as any)[col.key];
      if (col.type === 'number') {
        return Number(rawVal) || 0;
      }
      return rawVal != null ? String(rawVal) : '';
    });
  });

  // 4. Totals Row
  let hasNumericSum = false;
  const totalsRow: (string | number)[] = columns.map((col, cIdx) => {
    if (cIdx === 0) return 'TOTAL';
    if (col.type === 'number') {
      hasNumericSum = true;
      const sum = itemList.reduce((acc, item) => acc + (Number((item as any)[col.key]) || 0), 0);
      return sum;
    }
    return '';
  });

  const allAoa = [
    companyRow,      // Row 0
    addressRow,      // Row 1
    titleRow,        // Row 2
    metaRow,         // Row 3
    blankRow,        // Row 4
    headerLabels,    // Row 5 (Table Header)
    ...dataRows,     // Row 6..N
    ...(hasNumericSum ? [totalsRow] : []) // Bottom Totals
  ];

  const ws = XLSX.utils.aoa_to_sheet(allAoa);

  // 5. Merged Header Block Ranges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIdx } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastColIdx } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: lastColIdx } }
  ];

  // 6. Define Styles
  const thinBorder = {
    top: { style: 'thin', color: { rgb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
    left: { style: 'thin', color: { rgb: 'CBD5E1' } },
    right: { style: 'thin', color: { rgb: 'CBD5E1' } }
  };

  const thickTotalsBorder = {
    top: { style: 'thin', color: { rgb: '1E293B' } },
    bottom: { style: 'double', color: { rgb: '1E293B' } },
    left: { style: 'thin', color: { rgb: 'CBD5E1' } },
    right: { style: 'thin', color: { rgb: 'CBD5E1' } }
  };

  // Company Name Style
  const companyStyle = {
    fill: { fgColor: { rgb: '0F172A' } }, // Slate 900
    font: { name: 'Calibri', sz: 15, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { vertical: 'center', horizontal: 'center' }
  };

  // Address Style
  const addressStyle = {
    fill: { fgColor: { rgb: '1E293B' } }, // Slate 800
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'E2E8F0' } },
    alignment: { vertical: 'center', horizontal: 'center' }
  };

  // Title Style
  const titleStyle = {
    fill: { fgColor: { rgb: '1E3A8A' } }, // Navy 900
    font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: 'FDE047' } }, // Yellow text
    alignment: { vertical: 'center', horizontal: 'center' }
  };

  // Metadata Bar Style
  const metaStyle = {
    fill: { fgColor: { rgb: 'F1F5F9' } },
    font: { name: 'Calibri', sz: 9, italic: true, bold: true, color: { rgb: '475569' } },
    alignment: { vertical: 'center', horizontal: 'center' }
  };

  // Table Header Style
  const tableHeaderStyle = {
    fill: { fgColor: { rgb: '1E3A8A' } }, // Deep Navy
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
    border: {
      top: { style: 'medium', color: { rgb: '0F172A' } },
      bottom: { style: 'medium', color: { rgb: '0F172A' } },
      left: { style: 'thin', color: { rgb: '3B82F6' } },
      right: { style: 'thin', color: { rgb: '3B82F6' } }
    }
  };

  // Totals Row Style
  const totalsStyle = {
    fill: { fgColor: { rgb: 'FEF3C7' } }, // Light Amber
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '78350F' } },
    alignment: { vertical: 'center', horizontal: 'right' },
    border: thickTotalsBorder
  };

  // Apply Styles to Header Rows
  for (let c = 0; c < numCols; c++) {
    const c0 = XLSX.utils.encode_cell({ r: 0, c });
    const c1 = XLSX.utils.encode_cell({ r: 1, c });
    const c2 = XLSX.utils.encode_cell({ r: 2, c });
    const c3 = XLSX.utils.encode_cell({ r: 3, c });
    const c5 = XLSX.utils.encode_cell({ r: 5, c });

    if (ws[c0]) ws[c0].s = companyStyle;
    if (ws[c1]) ws[c1].s = addressStyle;
    if (ws[c2]) ws[c2].s = titleStyle;
    if (ws[c3]) ws[c3].s = metaStyle;
    if (ws[c5]) ws[c5].s = tableHeaderStyle;
  }

  // Row Heights
  const headerRowHeights = [
    { hpt: 26 }, // Company
    { hpt: 18 }, // Address
    { hpt: 22 }, // Title
    { hpt: 18 }, // Meta
    { hpt: 10 }, // Blank
    { hpt: 26 }  // Table Header
  ];

  const dataRowHeights = itemList.map(() => ({ hpt: 20 }));
  const totalsRowHeight = hasNumericSum ? [{ hpt: 22 }] : [];

  ws['!rows'] = [...headerRowHeights, ...dataRowHeights, ...totalsRowHeight];

  // Apply Styles to Data Rows
  itemList.forEach((item, idx) => {
    const r = 6 + idx; // Data starts at row 6 (0-indexed)

    const bQty = options.getBookingQty
      ? options.getBookingQty(item)
      : (Number((item as any).booking_qty) || 0);

    const rQty = options.getReceiveQty
      ? options.getReceiveQty(item)
      : (Number((item as any).receive_qty ?? (item as any).rcv_qty) || 0);

    const isZeroReceive = bQty > 0 && rQty === 0;
    const isPartialReceive = bQty > 0 && rQty > 0 && rQty < bQty;
    const isUnreceived = options.isUnreceived ? options.isUnreceived(item) : (isZeroReceive || isPartialReceive);

    columns.forEach((col, c) => {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) return;

      let fgColor = idx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
      let fontColor = '0F172A';
      let isBold = false;

      const isTargetCol = col.type === 'number' || col.key.includes('qty') || col.key.includes('colour') || col.key.includes('color');

      if (isTargetCol) {
        if (isZeroReceive) {
          // 🟡 Bright Yellow for Pending / Zero Received items
          fgColor = 'FFFF00'; // Bright Yellow
          fontColor = '991B1B'; // Bold Dark Red
          isBold = true;
        } else if (isPartialReceive) {
          // 🟠 Soft Bright Orange / Amber for Partial Receive (Received less than Booked, e.g. 300 out of 500)
          fgColor = 'FFC000'; // Soft Bright Orange / Amber
          fontColor = '7C2D12'; // Bold Dark Brown/Orange
          isBold = true;
        } else if (isUnreceived) {
          fgColor = 'FFFF00';
          fontColor = '991B1B';
          isBold = true;
        }
      }

      const align = col.align || (col.type === 'number' ? 'right' : (['sl', 'sl_no', 'date', 'booking_date', 'cm', 'yds', 'unit', 'size', 'size_mm'].includes(col.key) ? 'center' : 'left'));

      ws[cellRef].s = {
        fill: { fgColor: { rgb: fgColor } },
        font: { name: 'Calibri', sz: 10, bold: isBold, color: { rgb: fontColor } },
        border: thinBorder,
        alignment: {
          vertical: 'center',
          horizontal: align,
          wrapText: true
        }
      };
    });
  });

  // Apply Styles to Totals Row
  if (hasNumericSum) {
    const totalsRowIdx = 6 + itemList.length;
    columns.forEach((col, c) => {
      const cellRef = XLSX.utils.encode_cell({ r: totalsRowIdx, c });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          ...totalsStyle,
          alignment: {
            vertical: 'center',
            horizontal: c === 0 ? 'left' : (col.type === 'number' ? 'right' : 'center')
          }
        };
      }
    });
  }

  // Column Widths Calculation
  const colWidths = columns.map((col, cIdx) => {
    let maxLen = col.header.length;
    itemList.forEach((item) => {
      const rawVal = (item as any)[col.key];
      const strVal = rawVal != null ? String(rawVal) : '';
      if (strVal.length > maxLen) maxLen = strVal.length;
    });
    const defaultW = col.width || Math.min(Math.max(maxLen + 4, 10), 35);
    return { wch: defaultW };
  });

  ws['!cols'] = colWidths;

  return ws;
}

export function normalizeBuyerName(rawBuyer: string): string {
  if (!rawBuyer) return 'General Buyer';
  const clean = rawBuyer.trim().replace(/\s+/g, ' ');
  const upper = clean.toUpperCase();

  // Normalize all variations of Stanley Stella (e.g. "Stanly And Stella Sa", "Stanley Stella", "Stanly Stella", "Stanley & Stella", etc.) to "STANLEY STELLA"
  if (
    upper.includes('STANLEY') ||
    upper.includes('STANLY') ||
    upper.includes('STELLA')
  ) {
    return 'STANLEY STELLA';
  }

  // Normalize all variations of Kariban (e.g. "Kariban France", "KARIBAN FRANCE", "KARIBAN", etc.) to "KARIBAN"
  if (upper.includes('KARIBAN')) {
    return 'KARIBAN';
  }

  return upper;
}

/**
 * Main Multi-Sheet Excel Generator Function
 */
export function generateCompanyMultiSheetExcel<T>(options: CompanyExcelExportOptions<T>) {
  const { moduleName, fileNamePrefix, data, columns, getBuyerName } = options;

  if (!data || data.length === 0) {
    alert(`No records available to export for ${moduleName}.`);
    return;
  }

  const wb = XLSX.utils.book_new();
  const updateTitleHeader = `Accessories MCD Daily ${moduleName} Update - 2026`;

  // 1. Master Sheet with ALL Items
  const masterSheetName = `All ${moduleName}`;
  const wsMaster = createProfessionalWorksheet(data, columns, updateTitleHeader, options);
  XLSX.utils.book_append_sheet(wb, wsMaster, masterSheetName.slice(0, 31));

  // 2. Separate Buyer Sheets
  const buyerMap: Record<string, T[]> = {};
  data.forEach(item => {
    const rawBuyer = getBuyerName(item);
    const bNameKey = normalizeBuyerName(rawBuyer);
    if (!buyerMap[bNameKey]) {
      buyerMap[bNameKey] = [];
    }
    buyerMap[bNameKey].push(item);
  });

  Object.keys(buyerMap).forEach(bNameKey => {
    const buyerItems = buyerMap[bNameKey];
    const wsBuyer = createProfessionalWorksheet(buyerItems, columns, `${updateTitleHeader} (${bNameKey})`, options);

    // Clean sheet name (Excel 31 char limit, no invalid chars : \ / ? * [ ])
    let safeName = bNameKey.replace(/[:\\/?*\[\]]/g, '').trim().slice(0, 30);
    if (!safeName) safeName = 'BUYER';

    let finalSheetName = safeName;
    let counter = 1;
    while (wb.SheetNames.includes(finalSheetName)) {
      finalSheetName = `${safeName.slice(0, 25)}_${counter}`;
      counter++;
    }

    XLSX.utils.book_append_sheet(wb, wsBuyer, finalSheetName);
  });

  // 3. Write File
  const dateStr = new Date().toISOString().split('T')[0];
  const finalFileName = `${fileNamePrefix}_${dateStr}.xlsx`;
  XLSX.writeFile(wb, finalFileName);
}
