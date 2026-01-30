import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, degrees } from 'pdf-lib';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTRACTS_DIR = path.join(__dirname, '../../data/contracts');

// Ensure contracts directory exists
if (!fs.existsSync(CONTRACTS_DIR)) {
  fs.mkdirSync(CONTRACTS_DIR, { recursive: true });
}

export interface PDFGenerationResult {
  filePath: string;
  fileName: string;
  hash: string;
  generatedAt: string;
  version: number;
}

// ─── Color Palette ───────────────────────────────────────────
const BRAND_BLUE = rgb(0.176, 0.247, 0.906);     // #2D3FE7
const BRAND_BLUE_LIGHT = rgb(0.92, 0.93, 0.99);  // Very light blue bg
const BRAND_BLUE_SOFT = rgb(0.45, 0.52, 0.94);   // Softer blue for accents
const DARK = rgb(0.08, 0.08, 0.12);
const DARK_SECONDARY = rgb(0.22, 0.22, 0.28);
const MEDIUM = rgb(0.38, 0.38, 0.42);
const SOFT = rgb(0.55, 0.55, 0.58);
const FAINT = rgb(0.72, 0.72, 0.75);
const LIGHT_LINE = rgb(0.88, 0.88, 0.90);
const BG_LIGHT = rgb(0.965, 0.965, 0.975);
const BG_WARM = rgb(0.975, 0.972, 0.965);
const WHITE = rgb(1, 1, 1);
const SUCCESS_GREEN = rgb(0.13, 0.59, 0.25);
const SUCCESS_BG = rgb(0.92, 0.98, 0.93);

// ─── HTML Parser ─────────────────────────────────────────────
interface TextBlock {
  type: 'h2' | 'h3' | 'paragraph' | 'bullet' | 'empty' | 'italic' | 'table-row' | 'separator';
  text: string;
  label?: string;
}

function htmlToBlocks(html: string): TextBlock[] {
  const blocks: TextBlock[] = [];

  const parts = html
    .replace(/\r\n/g, '\n')
    .replace(/\n\s*\n/g, '\n');

  // Match <hr> tags as separators
  const hrRegex = /<hr\s*\/?>/gi;
  let hrMatch;
  const hrPositions: number[] = [];
  while ((hrMatch = hrRegex.exec(parts)) !== null) {
    hrPositions.push(hrMatch.index);
  }

  const tagRegex = /<(h2|h3|p|li|em|tr)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;

  while ((match = tagRegex.exec(parts)) !== null) {
    // Insert separators that appear before this tag
    while (hrPositions.length > 0 && hrPositions[0] < match.index) {
      blocks.push({ type: 'separator', text: '' });
      hrPositions.shift();
    }

    const tag = match[1].toLowerCase();
    let content = match[2]
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '$1')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<td[^>]*>(.*?)<\/td>/gi, '$1|||')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

    if (!content) continue;

    switch (tag) {
      case 'h2':
        blocks.push({ type: 'h2', text: content });
        break;
      case 'h3':
        blocks.push({ type: 'h3', text: content });
        break;
      case 'li':
        blocks.push({ type: 'bullet', text: content });
        break;
      case 'em':
        blocks.push({ type: 'italic', text: content });
        break;
      case 'tr': {
        const cells = content.split('|||').filter(Boolean).map(s => s.trim());
        if (cells.length >= 2) {
          blocks.push({ type: 'table-row', text: cells[1], label: cells[0] });
        }
        break;
      }
      default:
        blocks.push({ type: 'paragraph', text: content });
    }
  }

  return blocks;
}

// ─── Text Wrapping ───────────────────────────────────────────
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(test, fontSize);
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// ─── Decorative Helpers ──────────────────────────────────────
function drawDiamondDots(page: PDFPage, x: number, y: number, count: number, spacing: number) {
  for (let i = 0; i < count; i++) {
    const dx = x + i * spacing;
    page.drawRectangle({
      x: dx - 1.2, y: y - 1.2, width: 2.4, height: 2.4,
      color: FAINT,
      rotate: degrees(45),
    });
  }
}

function drawWatermarkText(page: PDFPage, font: PDFFont, text: string, W: number, H: number) {
  const size = 52;
  const tw = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (W - tw) / 2,
    y: H / 2 - 10,
    size,
    font,
    color: rgb(0.94, 0.94, 0.96),
    rotate: degrees(-35),
    opacity: 0.3,
  });
}

export const pdfService = {
  getUserContractsDir(userId: string): string {
    const userDir = path.join(CONTRACTS_DIR, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    return userDir;
  },

  getContractDir(userId: string, contractId: string): string {
    const contractDir = path.join(this.getUserContractsDir(userId), contractId);
    if (!fs.existsSync(contractDir)) {
      fs.mkdirSync(contractDir, { recursive: true });
    }
    return contractDir;
  },

  async generatePDF(params: {
    userId: string;
    contractId: string;
    content: string;
    photographerName: string;
    photographerAddress?: string;
    photographerSiret?: string;
    photographerEmail?: string;
    photographerPhone?: string;
    clientName: string;
    clientAddress?: string;
    clientEmail?: string;
    eventType?: string;
    version: number;
  }): Promise<PDFGenerationResult> {
    const generatedAt = new Date().toISOString();
    const contractDir = this.getContractDir(params.userId, params.contractId);
    const fileName = `contract_v${params.version}.pdf`;
    const filePath = path.join(contractDir, fileName);

    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(`Contrat - ${params.clientName}`);
    pdfDoc.setAuthor(params.photographerName);
    pdfDoc.setSubject('Contrat de prestation photographique');
    pdfDoc.setCreator('Lumina');

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const W = 595;
    const H = 842;
    const marginL = 60;
    const marginR = 60;
    const marginTop = 65;
    const marginBottom = 65;
    const contentW = W - marginL - marginR;

    let page = pdfDoc.addPage([W, H]);
    let y = H - marginTop;
    let articleNum = 0;

    const addPage = () => {
      page = pdfDoc.addPage([W, H]);
      y = H - marginTop;
      // Subtle top line on continuation pages
      page.drawRectangle({
        x: 0, y: H - 2, width: W, height: 2,
        color: BRAND_BLUE,
      });
    };

    const ensureSpace = (needed: number) => {
      if (y - needed < marginBottom) {
        addPage();
      }
    };

    const drawText = (text: string, options: {
      x?: number; size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; maxWidth?: number; lineHeight?: number;
    } = {}) => {
      const x = options.x || marginL;
      const size = options.size || 10;
      const f = options.font || font;
      const color = options.color || DARK;
      const mw = options.maxWidth || contentW;
      const lh = options.lineHeight || (size + 5);

      const lines = wrapText(text, f, size, mw);
      for (const line of lines) {
        ensureSpace(lh);
        page.drawText(line, { x, y, size, font: f, color });
        y -= lh;
      }
    };

    // ══════════════════════════════════════════════════════════
    // PAGE 1 — COVER HEADER
    // ══════════════════════════════════════════════════════════

    // Top gradient bar (3 stacked rectangles for gradient effect)
    page.drawRectangle({ x: 0, y: H - 3, width: W, height: 3, color: BRAND_BLUE });
    page.drawRectangle({ x: 0, y: H - 5, width: W, height: 2, color: BRAND_BLUE_SOFT });
    page.drawRectangle({ x: 0, y: H - 6.5, width: W, height: 1.5, color: BRAND_BLUE_LIGHT });

    // Header block with subtle background
    page.drawRectangle({
      x: 0, y: H - 100, width: W, height: 94,
      color: BG_LIGHT,
    });

    y = H - 32;

    // "LUMINA" branding - small
    page.drawText('LUMINA', {
      x: marginL, y, size: 8, font: fontBold,
      color: BRAND_BLUE_SOFT,
    });

    // Contract reference right-aligned
    const refStr = `Ref. ${params.contractId.substring(0, 8).toUpperCase()}`;
    const refW = font.widthOfTextAtSize(refStr, 7);
    page.drawText(refStr, {
      x: W - marginR - refW, y: y + 1, size: 7, font, color: FAINT,
    });

    y -= 22;

    // Main title
    page.drawText('CONTRAT DE PRESTATION', {
      x: marginL, y, size: 18, font: fontBold, color: DARK,
    });
    y -= 18;
    page.drawText('PHOTOGRAPHIQUE', {
      x: marginL, y, size: 18, font: fontBold, color: DARK,
    });
    y -= 16;

    // Blue accent underline
    page.drawRectangle({
      x: marginL, y, width: 50, height: 3,
      color: BRAND_BLUE,
    });

    y -= 14;

    // Date + event type
    const dateStr = new Date(generatedAt).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
    const metaText = params.eventType
      ? `${dateStr}  ·  ${params.eventType}`
      : dateStr;
    page.drawText(metaText, {
      x: marginL, y, size: 9, font, color: SOFT,
    });

    y = H - 120;

    // ══════════════════════════════════════════════════════════
    // PARTIES — Elegant two-column cards
    // ══════════════════════════════════════════════════════════
    const colW = (contentW - 24) / 2;
    const cardH = 90;
    const cardRadius = 0; // pdf-lib doesn't support border-radius

    // Left card — Photographer
    const leftCardY = y - cardH;
    page.drawRectangle({
      x: marginL, y: leftCardY, width: colW, height: cardH,
      color: WHITE, borderColor: LIGHT_LINE, borderWidth: 0.75,
    });
    // Blue left accent bar inside card
    page.drawRectangle({
      x: marginL, y: leftCardY, width: 3, height: cardH,
      color: BRAND_BLUE,
    });

    let ly = y - 16;
    page.drawText('LE PHOTOGRAPHE', {
      x: marginL + 14, y: ly, size: 7, font: fontBold, color: BRAND_BLUE,
    });
    ly -= 16;
    page.drawText(params.photographerName, {
      x: marginL + 14, y: ly, size: 10.5, font: fontBold, color: DARK,
    });
    ly -= 13;
    if (params.photographerAddress) {
      const addrLines = wrapText(params.photographerAddress, font, 8.5, colW - 24);
      for (const line of addrLines) {
        page.drawText(line, { x: marginL + 14, y: ly, size: 8.5, font, color: MEDIUM });
        ly -= 11;
      }
    }
    if (params.photographerSiret) {
      page.drawText(`SIRET ${params.photographerSiret}`, {
        x: marginL + 14, y: ly, size: 7.5, font, color: FAINT,
      });
      ly -= 11;
    }
    if (params.photographerEmail) {
      page.drawText(params.photographerEmail, {
        x: marginL + 14, y: ly, size: 7.5, font, color: FAINT,
      });
    }

    // Right card — Client
    const rightCardX = marginL + colW + 24;
    page.drawRectangle({
      x: rightCardX, y: leftCardY, width: colW, height: cardH,
      color: WHITE, borderColor: LIGHT_LINE, borderWidth: 0.75,
    });
    page.drawRectangle({
      x: rightCardX, y: leftCardY, width: 3, height: cardH,
      color: BRAND_BLUE,
    });

    let ry = y - 16;
    page.drawText('LE CLIENT', {
      x: rightCardX + 14, y: ry, size: 7, font: fontBold, color: BRAND_BLUE,
    });
    ry -= 16;
    page.drawText(params.clientName, {
      x: rightCardX + 14, y: ry, size: 10.5, font: fontBold, color: DARK,
    });
    ry -= 13;
    if (params.clientAddress) {
      const addrLines = wrapText(params.clientAddress, font, 8.5, colW - 24);
      for (const line of addrLines) {
        page.drawText(line, { x: rightCardX + 14, y: ry, size: 8.5, font, color: MEDIUM });
        ry -= 11;
      }
    }
    if (params.clientEmail) {
      page.drawText(params.clientEmail, {
        x: rightCardX + 14, y: ry, size: 7.5, font, color: FAINT,
      });
    }

    y = leftCardY - 30;

    // Decorative diamond dots separator
    drawDiamondDots(page, W / 2 - 20, y + 10, 5, 10);
    y -= 10;

    // ══════════════════════════════════════════════════════════
    // CONTENT — Parse and render HTML blocks
    // ══════════════════════════════════════════════════════════
    const blocks = htmlToBlocks(params.content);
    let tableRowIndex = 0;

    for (let bi = 0; bi < blocks.length; bi++) {
      const block = blocks[bi];

      switch (block.type) {
        case 'h2': {
          ensureSpace(40);
          y -= 14;

          // Article numbering
          articleNum++;
          const articleLabel = `ARTICLE ${articleNum}`;

          // Blue accent bar
          page.drawRectangle({
            x: marginL, y: y + 16, width: 40, height: 2.5,
            color: BRAND_BLUE,
          });

          // Article number
          page.drawText(articleLabel, {
            x: marginL, y: y + 4, size: 7, font: fontBold, color: BRAND_BLUE_SOFT,
          });
          y -= 6;

          drawText(block.text.toUpperCase(), {
            size: 12, font: fontBold, color: DARK, lineHeight: 16,
          });
          y -= 6;

          // Subtle underline
          page.drawLine({
            start: { x: marginL, y: y + 3 }, end: { x: marginL + contentW, y: y + 3 },
            thickness: 0.3, color: LIGHT_LINE,
          });
          y -= 6;
          break;
        }

        case 'h3': {
          ensureSpace(28);
          y -= 10;

          // Pill-shaped accent
          page.drawRectangle({
            x: marginL, y: y + 1, width: 5, height: 10,
            color: BRAND_BLUE,
          });

          drawText(block.text, {
            x: marginL + 14, size: 10.5, font: fontBold, color: DARK_SECONDARY,
            maxWidth: contentW - 14,
          });
          y -= 4;
          break;
        }

        case 'bullet': {
          ensureSpace(18);

          // Blue chevron marker
          page.drawText('\u2023', {
            x: marginL + 8, y: y + 1, size: 11, font, color: BRAND_BLUE,
          });
          drawText(block.text, {
            x: marginL + 22, size: 9.5, font, color: MEDIUM,
            maxWidth: contentW - 22, lineHeight: 13,
          });
          y -= 3;
          break;
        }

        case 'italic': {
          ensureSpace(18);
          y -= 4;

          // Left border for emphasis
          const italicLines = wrapText(block.text, fontItalic, 9, contentW - 16);
          const blockH = italicLines.length * 13 + 4;
          page.drawRectangle({
            x: marginL, y: y - blockH + 14, width: 2, height: blockH,
            color: BRAND_BLUE_SOFT,
          });

          drawText(block.text, {
            x: marginL + 12, size: 9, font: fontItalic, color: SOFT,
            maxWidth: contentW - 16, lineHeight: 13,
          });
          y -= 4;
          break;
        }

        case 'table-row': {
          ensureSpace(22);

          // Alternating background
          const isEven = tableRowIndex % 2 === 0;
          page.drawRectangle({
            x: marginL, y: y - 6, width: contentW, height: 20,
            color: isEven ? BG_LIGHT : WHITE,
          });

          // Left column — label
          page.drawText(block.label || '', {
            x: marginL + 8, y: y, size: 8.5, font: fontBold, color: DARK_SECONDARY,
          });

          // Right column — value
          const answerLines = wrapText(block.text, font, 8.5, contentW * 0.52);
          let ty = y;
          for (const line of answerLines) {
            page.drawText(line, {
              x: marginL + contentW * 0.44, y: ty, size: 8.5, font, color: MEDIUM,
            });
            ty -= 13;
          }
          y = Math.min(y - 20, ty);
          tableRowIndex++;
          break;
        }

        case 'separator': {
          ensureSpace(20);
          y -= 8;
          drawDiamondDots(page, W / 2 - 20, y + 4, 5, 10);
          y -= 12;
          break;
        }

        case 'paragraph': {
          ensureSpace(16);
          drawText(block.text, {
            size: 9.5, font, color: MEDIUM, lineHeight: 14,
          });
          y -= 4;
          break;
        }

        case 'empty':
          y -= 10;
          break;
      }
    }

    // ══════════════════════════════════════════════════════════
    // SIGNATURE BLOCK — Premium style
    // ══════════════════════════════════════════════════════════
    ensureSpace(140);
    y -= 16;

    drawDiamondDots(page, W / 2 - 20, y + 8, 5, 10);
    y -= 16;

    // "Lu et approuve" text
    page.drawText('Lu et approuve, fait en deux exemplaires originaux.', {
      x: marginL, y, size: 9, font: fontItalic, color: SOFT,
    });
    y -= 24;

    page.drawText('SIGNATURES DES PARTIES', {
      x: marginL, y, size: 8, font: fontBold, color: BRAND_BLUE,
    });
    y -= 20;

    // Two signature cards
    const boxW = (contentW - 24) / 2;
    const boxH = 80;

    // Photographer signature card
    page.drawRectangle({
      x: marginL, y: y - boxH, width: boxW, height: boxH,
      borderColor: LIGHT_LINE, borderWidth: 0.75, color: BG_LIGHT,
    });
    page.drawRectangle({
      x: marginL, y: y - boxH, width: boxW, height: 3,
      color: BRAND_BLUE,
    });
    page.drawText('Le Photographe', {
      x: marginL + 12, y: y - 16, size: 8, font: fontBold, color: DARK_SECONDARY,
    });
    page.drawText(params.photographerName, {
      x: marginL + 12, y: y - 30, size: 8.5, font, color: SOFT,
    });
    // "Signature" placeholder
    page.drawText('Signature :', {
      x: marginL + 12, y: y - 50, size: 7, font: fontItalic, color: FAINT,
    });

    // Client signature card
    const rightBoxX = marginL + boxW + 24;
    page.drawRectangle({
      x: rightBoxX, y: y - boxH, width: boxW, height: boxH,
      borderColor: LIGHT_LINE, borderWidth: 0.75, color: BG_LIGHT,
    });
    page.drawRectangle({
      x: rightBoxX, y: y - boxH, width: boxW, height: 3,
      color: BRAND_BLUE,
    });
    page.drawText('Le Client', {
      x: rightBoxX + 12, y: y - 16, size: 8, font: fontBold, color: DARK_SECONDARY,
    });
    page.drawText(params.clientName, {
      x: rightBoxX + 12, y: y - 30, size: 8.5, font, color: SOFT,
    });
    page.drawText('Signature :', {
      x: rightBoxX + 12, y: y - 50, size: 7, font: fontItalic, color: FAINT,
    });

    // ══════════════════════════════════════════════════════════
    // FOOTER — on every page
    // ══════════════════════════════════════════════════════════
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];

      // Bottom line
      p.drawLine({
        start: { x: marginL, y: 40 }, end: { x: W - marginR, y: 40 },
        thickness: 0.3, color: LIGHT_LINE,
      });

      // Left: Lumina branding
      p.drawText('LUMINA', {
        x: marginL, y: 26, size: 6.5, font: fontBold, color: FAINT,
      });

      // Center: page number with style
      const pageText = `${i + 1}  |  ${pages.length}`;
      const pw = font.widthOfTextAtSize(pageText, 7);
      p.drawText(pageText, {
        x: (W - pw) / 2, y: 26, size: 7, font, color: SOFT,
      });

      // Right: version + confidential
      const rightInfo = `v${params.version} · Confidentiel`;
      const riw = font.widthOfTextAtSize(rightInfo, 6.5);
      p.drawText(rightInfo, {
        x: W - marginR - riw, y: 26, size: 6.5, font: fontItalic, color: FAINT,
      });

      // Bottom brand bar (thin)
      p.drawRectangle({
        x: 0, y: 0, width: W, height: 2,
        color: BRAND_BLUE,
      });
    }

    // Save
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(filePath, pdfBytes);

    const hash = crypto.createHash('sha256').update(pdfBytes).digest('hex');

    return { filePath, fileName, hash, generatedAt, version: params.version };
  },

  async generateSignedPDF(params: {
    userId: string;
    contractId: string;
    content: string;
    photographerName: string;
    photographerAddress?: string;
    photographerSiret?: string;
    photographerEmail?: string;
    photographerPhone?: string;
    clientName: string;
    clientAddress?: string;
    clientEmail?: string;
    eventType?: string;
    signatureData: string;
    signedAt: string;
  }): Promise<PDFGenerationResult> {
    const generatedAt = new Date().toISOString();
    const contractDir = this.getContractDir(params.userId, params.contractId);
    const fileName = 'contract_signed.pdf';
    const filePath = path.join(contractDir, fileName);

    // Generate the base PDF
    const basePdf = await this.generatePDF({
      ...params,
      version: 0
    });

    // Load and add signature page
    const existingPdfBytes = fs.readFileSync(basePdf.filePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const W = 595;
    const H = 842;
    const marginL = 60;
    const page = pdfDoc.addPage([W, H]);

    // Top bar
    page.drawRectangle({ x: 0, y: H - 3, width: W, height: 3, color: BRAND_BLUE });
    page.drawRectangle({ x: 0, y: H - 5, width: W, height: 2, color: BRAND_BLUE_SOFT });
    page.drawRectangle({ x: 0, y: 0, width: W, height: 2, color: BRAND_BLUE });

    let y = H - 70;

    // "LUMINA" brand
    page.drawText('LUMINA', {
      x: marginL, y: y + 28, size: 8, font: fontBold, color: BRAND_BLUE_SOFT,
    });

    // Title block
    page.drawRectangle({
      x: marginL, y: y + 14, width: 50, height: 3,
      color: BRAND_BLUE,
    });
    y -= 2;
    page.drawText('ATTESTATION DE', {
      x: marginL, y, size: 18, font: fontBold, color: DARK,
    });
    y -= 22;
    page.drawText('SIGNATURE ELECTRONIQUE', {
      x: marginL, y, size: 18, font: fontBold, color: DARK,
    });
    y -= 30;

    // Success banner with border
    const bannerH = 40;
    page.drawRectangle({
      x: marginL, y: y - bannerH + 20, width: W - marginL * 2, height: bannerH,
      color: SUCCESS_BG,
      borderColor: rgb(0.82, 0.93, 0.84),
      borderWidth: 1,
    });
    // Green left accent
    page.drawRectangle({
      x: marginL, y: y - bannerH + 20, width: 4, height: bannerH,
      color: SUCCESS_GREEN,
    });

    page.drawText('Contrat signe electroniquement avec succes', {
      x: marginL + 18, y: y - 2, size: 11, font: fontBold,
      color: SUCCESS_GREEN,
    });
    const signedDate = new Date(params.signedAt).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    page.drawText(signedDate, {
      x: marginL + 18, y: y - 16, size: 9, font, color: rgb(0.3, 0.6, 0.35),
    });
    y -= bannerH + 20;

    // Info card
    const cardTop = y;
    const infoRows = [
      ['Signataire', params.clientName],
      ['Document', 'Contrat de prestation photographique'],
      ['Photographe', params.photographerName],
      ['Reference', params.contractId.substring(0, 8).toUpperCase()],
    ];
    const cardHeight = infoRows.length * 28 + 16;

    page.drawRectangle({
      x: marginL, y: cardTop - cardHeight, width: W - marginL * 2, height: cardHeight,
      color: BG_LIGHT, borderColor: LIGHT_LINE, borderWidth: 0.75,
    });

    y = cardTop - 20;
    for (const [label, value] of infoRows) {
      page.drawText(label, {
        x: marginL + 16, y, size: 8, font: fontBold, color: SOFT,
      });
      page.drawText(value, {
        x: marginL + 140, y, size: 10, font, color: DARK,
      });
      y -= 28;
    }
    y = cardTop - cardHeight - 30;

    // Signature section
    page.drawText('SIGNATURE', {
      x: marginL, y, size: 8, font: fontBold, color: BRAND_BLUE,
    });
    y -= 18;

    const sigBoxW = 280;
    const sigBoxH = 100;
    page.drawRectangle({
      x: marginL, y: y - sigBoxH, width: sigBoxW, height: sigBoxH,
      borderColor: LIGHT_LINE, borderWidth: 1, color: WHITE,
    });
    // Top blue accent on signature box
    page.drawRectangle({
      x: marginL, y: y, width: sigBoxW, height: 2,
      color: BRAND_BLUE,
    });

    try {
      if (params.signatureData.startsWith('data:image/png;base64,')) {
        const base64Data = params.signatureData.replace('data:image/png;base64,', '');
        const signatureImage = await pdfDoc.embedPng(Buffer.from(base64Data, 'base64'));
        const dims = signatureImage.scale(0.4);
        page.drawImage(signatureImage, {
          x: marginL + 15, y: y - sigBoxH + 12,
          width: Math.min(dims.width, sigBoxW - 30),
          height: Math.min(dims.height, sigBoxH - 20),
        });
      }
    } catch (error) {
      page.drawText('[Signature electronique]', {
        x: marginL + 20, y: y - sigBoxH / 2, size: 12, font: fontItalic, color: FAINT,
      });
    }

    y -= sigBoxH + 30;

    // Hash verification
    page.drawRectangle({
      x: marginL, y: y - 30, width: W - marginL * 2, height: 30,
      color: BG_WARM,
    });
    page.drawText('Empreinte SHA-256', {
      x: marginL + 10, y: y - 12, size: 7, font: fontBold, color: SOFT,
    });
    page.drawText('Calculee a la finalisation du document', {
      x: marginL + 10, y: y - 24, size: 7, font: fontItalic, color: FAINT,
    });
    y -= 50;

    // Legal notice
    page.drawLine({
      start: { x: marginL, y }, end: { x: W - marginL, y },
      thickness: 0.5, color: LIGHT_LINE,
    });
    y -= 18;

    const legalLines = [
      'Cette signature electronique a valeur legale conformement au reglement eIDAS',
      '(UE 910/2014) et a l\'article 1367 du Code civil francais.',
      '',
      'L\'integrite du document est garantie par empreinte cryptographique SHA-256.',
      'Ce document est genere automatiquement par Lumina et ne peut etre modifie.',
    ];

    for (const line of legalLines) {
      if (!line) { y -= 6; continue; }
      page.drawText(line, {
        x: marginL, y, size: 7.5, font: fontItalic, color: SOFT,
      });
      y -= 12;
    }

    // Footer on signature page
    page.drawLine({
      start: { x: marginL, y: 40 }, end: { x: W - marginL, y: 40 },
      thickness: 0.3, color: LIGHT_LINE,
    });

    const totalPages = pdfDoc.getPageCount();
    const pageNumText = `${totalPages}  |  ${totalPages}`;
    const pw = font.widthOfTextAtSize(pageNumText, 7);
    page.drawText('LUMINA', {
      x: marginL, y: 26, size: 6.5, font: fontBold, color: FAINT,
    });
    page.drawText(pageNumText, {
      x: (W - pw) / 2, y: 26, size: 7, font, color: SOFT,
    });
    page.drawText('Attestation de signature', {
      x: W - marginL - font.widthOfTextAtSize('Attestation de signature', 6.5), y: 26,
      size: 6.5, font: fontItalic, color: FAINT,
    });

    // Save
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(filePath, pdfBytes);

    // Clean up base PDF
    if (fs.existsSync(basePdf.filePath)) {
      fs.unlinkSync(basePdf.filePath);
    }

    const hash = crypto.createHash('sha256').update(pdfBytes).digest('hex');

    return { filePath, fileName, hash, generatedAt, version: 0 };
  },

  getPDFPath(userId: string, contractId: string, fileName: string): string | null {
    const filePath = path.join(this.getContractDir(userId, contractId), fileName);
    return fs.existsSync(filePath) ? filePath : null;
  },

  calculateHash(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  },

  verifyIntegrity(filePath: string, expectedHash: string): boolean {
    const actualHash = this.calculateHash(filePath);
    return actualHash === expectedHash;
  },

  deleteContractPDFs(userId: string, contractId: string): boolean {
    const contractDir = this.getContractDir(userId, contractId);
    if (fs.existsSync(contractDir)) {
      fs.rmSync(contractDir, { recursive: true });
      return true;
    }
    return false;
  }
};

export default pdfService;
