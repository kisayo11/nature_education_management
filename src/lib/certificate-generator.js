import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

// 날짜 유틸: Date 객체 또는 YYYY-MM-DD / YYYY. M. D 문자열을 파싱
export function parseDate(dateVal) {
  if (!dateVal) return new Date();
  if (dateVal instanceof Date) return dateVal;
  
  const str = String(dateVal).trim().replace(/\./g, '-').replace(/\s+/g, '');
  const parts = str.split('-').filter(Boolean);
  if (parts.length >= 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  return new Date();
}

export function formatDateKorean(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}년 ${m}월 ${day}일`;
}

export function formatDateHyphen(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// 7자리 난수 수료번호 생성
export function generateCertNumber(date) {
  const y = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const random7 = Math.floor(1000000 + Math.random() * 9000000);
  return `제 ${y}-${mm}${dd}-${random7} 호`;
}

/**
 * 한글 전각 공백 벌어짐을 방지하고 정상 1칸 공백(약 4.5pt)으로 인쇄하는 헬퍼 함수
 */
function drawTextWithNormalSpace(page, text, startX, y, size, font, color, spaceWidth = 4.5) {
  const words = String(text).split(' ');
  let currentX = startX;
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word) {
      page.drawText(word, { x: currentX, y, size, font, color });
      currentX += font.widthOfTextAtSize(word, size);
    }
    if (i < words.length - 1) {
      currentX += spaceWidth;
    }
  }
  return currentX - startX; // 총 렌더링 너비 반환
}

function measureTextWithNormalSpace(text, size, font, spaceWidth = 4.5) {
  const words = String(text).split(' ');
  let width = 0;
  for (let i = 0; i < words.length; i++) {
    if (words[i]) width += font.widthOfTextAtSize(words[i], size);
    if (i < words.length - 1) width += spaceWidth;
  }
  return width;
}

/**
 * 수료증 1장 PDF 생성 함수 (NotoSansKR 단정 1칸 공백 및 소속 겹침 제거)
 * @param {Object} params
 * @param {'safety' | 'preplacement'} params.type
 * @param {string} params.name
 * @param {string} params.birth
 * @param {string|Date} params.joinDate
 * @param {string} [params.certNo]
 * @returns {Promise<Uint8Array>}
 */
export async function generateCertificatePdf({ type, name, birth, joinDate, certNo }) {
  const jDate = parseDate(joinDate);
  const isSafety = type === 'safety';

  // 규칙:
  // 산업안전: 입사일 ~ 입사일 + 2일 (8시간), 수료일/발급일 = 입사일 + 2일
  // 배치전교육: 입사일 ~ 입사일 + 6일 (15시간), 수료일/발급일 = 입사일 + 6일
  const durationDays = isSafety ? 2 : 6;
  const hours = isSafety ? 8 : 15;
  const courseTitle = isSafety ? '신규채용자 산업안전보건교육' : '요양병원 신규직원 배치전 교육';

  const finishDate = addDays(jDate, durationDays);
  const periodText = `${formatDateHyphen(jDate)} ~ ${formatDateHyphen(finishDate)}(${hours}시간)`;
  const completionDateText = formatDateHyphen(finishDate);
  const issueDateKorean = formatDateKorean(finishDate);

  const finalCertNo = certNo || generateCertNumber(finishDate);

  // 생년월일 포맷팅 (YYYY년 MM월 DD일)
  let birthText = String(birth || '').trim();
  if (/^\d{4}[-.]\d{1,2}[-.]\d{1,2}$/.test(birthText)) {
    birthText = formatDateKorean(parseDate(birthText));
  }

  // PDF 생성
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // NotoSansKR 폰트 로드
  const fontDir = path.join(process.cwd(), 'public/fonts');
  const boldFontBytes = fs.readFileSync(path.join(fontDir, 'NotoSansKR-Bold.ttf'));
  const semiBoldFontBytes = fs.readFileSync(path.join(fontDir, 'NotoSansKR-SemiBold.ttf'));
  const fontBold = await pdfDoc.embedFont(boldFontBytes);
  const fontRegular = await pdfDoc.embedFont(semiBoldFontBytes);

  // 배경 템플릿 로드
  const templateDir = path.join(process.cwd(), 'public/templates');
  const templateFile = isSafety ? 'cert_safety.png' : 'cert_preplacement.png';
  const imgBytes = fs.readFileSync(path.join(templateDir, templateFile));
  const bgImage = await pdfDoc.embedPng(imgBytes);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  // 배경 이미지 인쇄
  page.drawImage(bgImage, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
  });

  const textColor = rgb(0.12, 0.12, 0.12);
  const valueX = 174.1; // 슬라이드 템플릿 기준 정확한 시작 X 좌표

  // 1. 수료번호 (상단 박스 내부, 슬라이드 기준 y=762.9)
  drawTextWithNormalSpace(page, finalCertNo, 115.5, pageHeight - 79.0, 12.0, fontRegular, textColor, 4.0);

  // 2. 이름 (슬라이드 기준 y=619.9)
  page.drawText(name, {
    x: valueX,
    y: pageHeight - 222.0,
    size: 13.5,
    font: fontBold,
    color: textColor,
  });

  // 3. 생년월일 (슬라이드 기준 y=584.9, 단정한 1칸 공백 적용)
  drawTextWithNormalSpace(page, birthText, valueX, pageHeight - 257.0, 13.5, fontBold, textColor, 4.5);

  // ※ 소속 기관: 배경 이미지에 이미 '네이처요양병원'이 인쇄되어 있으므로 덧그리지 않음(겹침 방지)

  // 4. 훈련과정 (슬라이드 기준 y=516.4, '자'와 '산' 사이 정상 1칸 공백 적용)
  drawTextWithNormalSpace(page, courseTitle, valueX, pageHeight - 325.5, 13.5, fontBold, textColor, 4.5);

  // 5. 훈련기간 (슬라이드 기준 y=481.4)
  drawTextWithNormalSpace(page, periodText, valueX, pageHeight - 360.5, 13.5, fontBold, textColor, 4.5);

  // 6. 수료일 (슬라이드 기준 y=446.4)
  page.drawText(completionDateText, {
    x: valueX,
    y: pageHeight - 395.5,
    size: 13.5,
    font: fontBold,
    color: textColor,
  });

  // 7. 발급일자 (슬라이드 기준 y=210.9, 가운데 정렬, 단정한 1칸 공백)
  const dateWidth = measureTextWithNormalSpace(issueDateKorean, 15.8, fontBold, 5.0);
  drawTextWithNormalSpace(page, issueDateKorean, (pageWidth - dateWidth) / 2, pageHeight - 631.0, 15.8, fontBold, textColor, 5.0);

  const pdfBytes = await pdfDoc.save();
  return {
    pdfBytes: Buffer.from(pdfBytes),
    certNo: finalCertNo,
    courseTitle,
    finishDate: completionDateText,
  };
}
