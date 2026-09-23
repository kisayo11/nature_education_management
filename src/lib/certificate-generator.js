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
 * 수료증 1장 PDF 생성 함수
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

  // 폰트 로드
  const fontDir = path.join(process.cwd(), 'public/fonts');
  const regFontBytes = fs.readFileSync(path.join(fontDir, 'Pretendard-Regular.ttf'));
  const boldFontBytes = fs.readFileSync(path.join(fontDir, 'Pretendard-Bold.ttf'));
  const fontRegular = await pdfDoc.embedFont(regFontBytes);
  const fontBold = await pdfDoc.embedFont(boldFontBytes);

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
  const valueX = 185; // 라벨 뒤 시작 X 좌표 (균형 잡힌 여백)

  // 1. 수료번호 (상단)
  page.drawText(finalCertNo, {
    x: 123.5,
    y: pageHeight - 79.5,
    size: 11.9,
    font: fontRegular,
    color: textColor,
  });

  // 2. 성명
  page.drawText(name, {
    x: valueX,
    y: pageHeight - 221.5,
    size: 12.6,
    font: fontRegular,
    color: textColor,
  });

  // 3. 생년월일
  page.drawText(birthText, {
    x: valueX,
    y: pageHeight - 256.3,
    size: 12.6,
    font: fontRegular,
    color: textColor,
  });

  // 4. 소속
  page.drawText('네이처요양병원', {
    x: valueX,
    y: pageHeight - 290.5,
    size: 12.6,
    font: fontRegular,
    color: textColor,
  });

  // 5. 훈련과정명
  page.drawText(courseTitle, {
    x: valueX,
    y: pageHeight - 325.3,
    size: 12.6,
    font: fontRegular,
    color: textColor,
  });

  // 6. 훈련기간
  page.drawText(periodText, {
    x: valueX,
    y: pageHeight - 360.2,
    size: 12.6,
    font: fontRegular,
    color: textColor,
  });

  // 7. 수료일
  page.drawText(completionDateText, {
    x: valueX,
    y: pageHeight - 395.1,
    size: 12.6,
    font: fontRegular,
    color: textColor,
  });

  // 8. 발급일 (하단 가운데 정렬)
  const dateWidth = fontBold.widthOfTextAtSize(issueDateKorean, 15.8);
  page.drawText(issueDateKorean, {
    x: (pageWidth - dateWidth) / 2,
    y: pageHeight - 634.0,
    size: 15.8,
    font: fontBold,
    color: textColor,
  });

  const pdfBytes = await pdfDoc.save();
  return {
    pdfBytes: Buffer.from(pdfBytes),
    certNo: finalCertNo,
    courseTitle,
    finishDate: completionDateText,
  };
}
