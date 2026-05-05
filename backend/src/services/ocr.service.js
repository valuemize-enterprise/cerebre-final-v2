const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const sharp = require('sharp');
const logger = require('../utils/logger');

// ── Table extraction helpers ─────────────────────────────────

/**
 * Detect tabular data from raw text using pattern recognition.
 * Looks for lines with consistent delimiters (|, tabs, 2+ spaces).
 */
const extractTables = (text) => {
  const tables = [];
  const lines = text.split('\n');
  let currentTable = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentTable && currentTable.rows.length > 1) {
        tables.push(currentTable);
      }
      currentTable = null;
      continue;
    }

    // Pipe-delimited table
    if (trimmed.includes('|') && trimmed.split('|').length >= 3) {
      const cells = trimmed.split('|').map((c) => c.trim()).filter(Boolean);
      if (!currentTable) {
        currentTable = { headers: cells, rows: [] };
      } else {
        // Skip separator rows (---|---|---)
        if (!cells.every((c) => /^[-: ]+$/.test(c))) {
          currentTable.rows.push(cells);
        }
      }
      continue;
    }

    // Tab or multi-space delimited
    if (/\t| {2,}/.test(trimmed)) {
      const cells = trimmed.split(/\t| {2,}/).map((c) => c.trim()).filter(Boolean);
      if (cells.length >= 2) {
        if (!currentTable) {
          currentTable = { headers: cells, rows: [] };
        } else {
          currentTable.rows.push(cells);
        }
        continue;
      }
    }

    if (currentTable) {
      if (currentTable.rows.length > 1) tables.push(currentTable);
      currentTable = null;
    }
  }

  if (currentTable && currentTable.rows.length > 1) tables.push(currentTable);
  return tables;
};

// ── PDF Parsing ───────────────────────────────────────────────

/**
 * Extract text and tables from a PDF buffer.
 */
const parsePDF = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    const rawText = data.text;
    const tables = extractTables(rawText);

    logger.debug('[OCR] PDF parsed', {
      pages: data.numpages,
      chars: rawText.length,
      tables: tables.length,
    });

    return {
      rawText,
      tables,
      metadata: {
        type: 'pdf',
        pages: data.numpages,
        pdfInfo: data.info || {},
        charCount: rawText.length,
      },
    };
  } catch (err) {
    logger.error('[OCR] PDF parse failed', { error: err.message });
    throw new Error(`PDF parsing failed: ${err.message}`);
  }
};

// ── Image OCR ─────────────────────────────────────────────────

/**
 * Pre-process image for better OCR accuracy:
 * - Convert to greyscale
 * - Increase contrast
 * - Resize if needed
 */
const preprocessImage = async (buffer) => {
  return sharp(buffer)
    .greyscale()
    .normalize()
    .sharpen()
    .toBuffer();
};

/**
 * Run Tesseract OCR on an image buffer.
 * Returns extracted text, tables, and confidence.
 */
const parseImage = async (buffer, mimeType) => {
  try {
    const processed = await preprocessImage(buffer);

    const { data } = await Tesseract.recognize(processed, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          logger.debug('[OCR] Progress', { progress: Math.round(m.progress * 100) });
        }
      },
      // PSM 3 = Auto page segmentation — works for most marketing report layouts
      tessedit_pageseg_mode: '3',
    });

    const rawText = data.text;
    const confidence = data.confidence;
    const tables = extractTables(rawText);

    logger.debug('[OCR] Image parsed', {
      confidence: confidence.toFixed(1),
      chars: rawText.length,
      tables: tables.length,
    });

    if (confidence < 40) {
      logger.warn('[OCR] Low confidence — image quality may be poor', { confidence });
    }

    return {
      rawText,
      tables,
      metadata: {
        type: 'image',
        mimeType,
        confidence,
        charCount: rawText.length,
        lowQualityWarning: confidence < 40,
      },
    };
  } catch (err) {
    logger.error('[OCR] Image OCR failed', { error: err.message });
    throw new Error(`Image OCR failed: ${err.message}`);
  }
};

// ── Router ────────────────────────────────────────────────────

/**
 * Main extraction entry point.
 * Detects file type and routes to the right parser.
 */
const extractContent = async (buffer, mimeType) => {
  if (mimeType === 'application/pdf') {
    return parsePDF(buffer);
  }
  if (['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(mimeType)) {
    return parseImage(buffer, mimeType);
  }
  throw new Error(`Unsupported file type: ${mimeType}`);
};

module.exports = { extractContent, parsePDF, parseImage, extractTables };
