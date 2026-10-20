import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { absoluteUrl } from './apis/account';
import { formatDate, formatINR } from './formatters';
import type { Tenant } from '../types';

// Printable invoice / receipt / warranty certificate — the same layout as the
// web's PrintableDocumentModal, rendered to PDF on the phone with expo-print.

export type DocKind = 'invoice' | 'receipt' | 'warranty';

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const money = (n: unknown) => esc(formatINR(Number(n) || 0));

function header(t: Tenant | null, gst: any, primary: string, secondary: string, title: string, numberLabel: string, number: string, date: string) {
  const b = t?.branding;
  const bp = (t as any)?.businessProfile || {};
  const legal = gst?.sellerName || bp.legalEntityName || '';
  const company = t?.name || legal || 'Your company';
  const street = (gst?.sellerAddress || bp.address || '').trim();
  const extras = [bp.city, bp.state, bp.pincode].filter((x: string) => x && !street.toLowerCase().includes(String(x).toLowerCase()));
  const address = [street, ...extras].filter(Boolean).join(', ');
  const gstin = gst?.sellerGstin || bp.gstin || '';
  const logo = b?.logoUrl ? absoluteUrl(b.logoUrl) : '';
  return `
  <div style="height:6px;background:linear-gradient(90deg,${primary},${secondary})"></div>
  <div class="head">
    <div class="logo">${logo ? `<img src="${esc(logo)}"/>` : `<div class="sun" style="background:${primary}">☀</div>`}</div>
    <div class="co">
      <h1 style="color:${primary}">${esc(company)}</h1>
      ${legal && legal.toLowerCase() !== company.toLowerCase() ? `<p class="legal">${esc(legal)}</p>` : ''}
      ${b?.companyTagline ? `<p class="tag" style="color:${secondary}">${esc(b.companyTagline)}</p>` : ''}
      <p class="muted">${esc(address || 'Address not set — add it in Settings → Company profile')}</p>
      <p class="muted">${[gstin && `GSTIN: ${esc(gstin)}`, b?.supportPhone && `Ph: ${esc(b.supportPhone)}`, esc(b?.supportEmail || '')].filter(Boolean).join('&nbsp;&nbsp;|&nbsp;&nbsp;')}</p>
    </div>
    <div class="logo"></div>
  </div>
  <div class="title" style="border-color:${primary}">
    <span style="color:${primary}">${esc(title)}</span>
    <div class="num">${number ? `<p><span class="muted">${esc(numberLabel)}</span> <b>${esc(number)}</b></p>` : ''}<p><span class="muted">Date</span> <b>${esc(formatDate(date))}</b></p></div>
  </div>`;
}

function footer(t: Tenant | null, primary: string, secondary: string) {
  const b = t?.branding;
  const company = t?.name || 'Your company';
  return `
  <div class="sign"><div><p class="small">For ${esc(company)}</p><div class="line"></div><p class="small"><b>Authorised Signatory</b></p></div></div>
  <div class="foot" style="background:linear-gradient(90deg,${primary},${secondary})">
    <span>This is a computer-generated document.</span>
    <b>${[company, b?.supportPhone, b?.supportEmail].filter(Boolean).map(esc).join('&nbsp;&nbsp;•&nbsp;&nbsp;')}</b>
  </div>`;
}

const CSS = `
  *{box-sizing:border-box} body{margin:0;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#0f172a;font-size:11px}
  .page{border:1px solid #e2e8f0} .head{display:grid;grid-template-columns:84px 1fr 84px;gap:12px;align-items:center;padding:16px 24px 12px}
  .logo img{width:80px;height:80px;object-fit:contain} .sun{width:64px;height:64px;border-radius:12px;color:#fff;font-size:30px;display:flex;align-items:center;justify-content:center}
  .co{text-align:center} h1{margin:0;font-size:20px;text-transform:uppercase;letter-spacing:.5px} .legal{margin:2px 0;font-weight:600;font-size:10.5px}
  .tag{margin:2px 0;font-weight:600} .muted{color:#64748b;margin:2px 0} p{margin:2px 0}
  .title{margin:0 24px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid;border-bottom:1px solid;padding:8px 0}
  .title span{font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:1px} .num{text-align:right}
  .body{padding:16px 24px} .box{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px}
  .lbl{font-size:9.5px;font-weight:700;color:#94a3b8;text-transform:uppercase}
  table{width:100%;border-collapse:collapse;margin-top:14px} th,td{border:1px solid #e2e8f0;padding:6px 8px} th{background:#f1f5f9;text-align:left}
  .r{text-align:right} .c{text-align:center} .mono{font-family:Menlo,monospace} tfoot td{background:#f8fafc;font-weight:700}
  .tax th,.tax td{font-size:9.5px;padding:4px 6px} .bank{margin-top:12px;padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px}
  .card{padding:16px;border-radius:6px} .grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding-top:8px;margin-top:8px}
  .sign{display:flex;justify-content:flex-end;padding:16px 24px 8px;text-align:center} .line{width:150px;height:40px;border-bottom:1px solid #94a3b8;margin-bottom:4px} .small{font-size:10px}
  .foot{display:flex;justify-content:space-between;padding:10px 24px;color:#fff;font-size:10px}
`;

export function documentHtml(kind: DocKind, data: any, tenant: Tenant | null): string {
  const b = tenant?.branding;
  const primary = b?.primaryColor || '#b45309';
  const secondary = (b as any)?.secondaryColor || '#f59e0b';
  const gst = data.gstSnapshot;
  const title = kind === 'invoice' ? data.invoiceType || 'Tax Invoice' : kind === 'warranty' ? 'Warranty Certificate' : 'Payment Receipt';
  const numberLabel = kind === 'invoice' ? 'Invoice No.' : kind === 'receipt' ? 'Receipt No.' : 'Certificate No.';
  const number = data.invoiceNumber || data.customId || '';
  const date = data.invoiceDate || data.paymentDate || data.startDate || new Date().toISOString();
  let body = '';

  if (kind === 'invoice') {
    const total = Number(data.amount) || 0, tax = Number(data.taxAmount) || 0;
    const lines = Array.isArray(data.lineItems) && data.lineItems.length ? data.lineItems : [{
      itemDescription: data.description || 'Turnkey Solar Rooftop Power Plant', hsnSacCode: gst?.defaultHsnSacCode || '85414011',
      taxableValue: Math.max(0, total - tax), cgstAmount: tax / 2, sgstAmount: tax - tax / 2, igstAmount: 0, totalAmount: total,
    }];
    const hsn = gst?.defaultHsnSacCode || '85414011';
    const inter = gst?.supplyType === 'INTER_STATE';
    const supply = gst?.placeOfSupply || data.state || '';
    const specs = [data.capacityKw ? `${data.capacityKw} KW` : '', data.panelBrand ? `Panels: ${data.panelBrand} ${data.panelModel || ''}` : '', data.inverterBrand ? `Inverter: ${data.inverterBrand} ${data.inverterModel || ''}` : ''].filter(Boolean).join(' • ');
    const sum = (k: string) => lines.reduce((s: number, l: any) => s + Number(l[k] || 0), 0);
    const bp = (tenant as any)?.businessProfile || {};
    body = `
      <div class="box">
        <div><p class="lbl">Billed to customer</p><p><b>${esc(data.customerName || 'Customer')}</b></p><p class="muted">${esc(data.installationAddress || data.customerAddress || '')}</p><p class="muted">Phone: ${esc(data.customerMobile || '—')}</p></div>
        <div><p class="lbl">Project & supply details</p><p><b>HSN Code: ${esc(hsn)} (Solar Systems)</b></p><p class="muted">Supply place: ${esc(supply)}${gst?.placeOfSupplyCode ? ` (${esc(gst.placeOfSupplyCode)})` : ''}</p>
          ${gst ? `<p class="muted">Tax treatment: ${inter ? 'Inter-state — IGST' : 'Intra-state — CGST + SGST'}</p>` : ''}
          ${data.projectName ? `<p class="muted">Project: ${esc(data.projectName)}</p>` : ''}${specs ? `<p class="muted">${esc(specs)}</p>` : ''}
          <p class="muted">Payment due: ${esc(formatDate(data.dueDate || date))}</p></div>
      </div>
      <table><thead><tr><th>#</th><th>Description of goods & services</th><th class="c">HSN</th><th class="r">Taxable (₹)</th><th class="r">GST (₹)</th><th class="r">Total (₹)</th></tr></thead>
        <tbody>${lines.map((l: any, i: number) => `<tr><td>${i + 1}</td><td><b>${esc(l.itemDescription)}</b></td><td class="c mono">${esc(l.hsnSacCode || hsn)}</td><td class="r">${money(l.taxableValue)}</td><td class="r">${money(Number(l.cgstAmount || 0) + Number(l.sgstAmount || 0) + Number(l.igstAmount || 0))}</td><td class="r mono"><b>${money(l.totalAmount)}</b></td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="5" class="r">Grand total payable</td><td class="r mono">${money(total)}</td></tr></tfoot></table>
      <table class="tax"><thead><tr><th>HSN / SAC</th><th class="r">Taxable value</th><th class="r">CGST</th><th class="r">SGST</th><th class="r">IGST</th><th class="r">Total tax</th></tr></thead>
        <tbody>${lines.map((l: any) => `<tr><td class="mono">${esc(l.hsnSacCode || hsn)}</td><td class="r">${money(l.taxableValue)}</td><td class="r">${l.cgstRate ? `${l.cgstRate}% / ` : ''}${money(l.cgstAmount)}</td><td class="r">${l.sgstRate ? `${l.sgstRate}% / ` : ''}${money(l.sgstAmount)}</td><td class="r">${l.igstRate ? `${l.igstRate}% / ` : ''}${money(l.igstAmount)}</td><td class="r"><b>${money(Number(l.cgstAmount || 0) + Number(l.sgstAmount || 0) + Number(l.igstAmount || 0))}</b></td></tr>`).join('')}</tbody>
        <tfoot><tr><td class="r">Total</td><td class="r">${money(sum('taxableValue'))}</td><td class="r">${money(sum('cgstAmount'))}</td><td class="r">${money(sum('sgstAmount'))}</td><td class="r">${money(sum('igstAmount'))}</td><td class="r">${money(sum('cgstAmount') + sum('sgstAmount') + sum('igstAmount'))}</td></tr></tfoot></table>
      ${bp.bankName || bp.bankAccountNumber ? `<div class="bank"><b>Bank details for RTGS/NEFT:</b><p class="muted">Bank: ${esc(bp.bankName || '—')} | A/C name: ${esc(bp.legalEntityName || tenant?.name || '')} | A/C no: ${esc(bp.bankAccountNumber || '—')} | IFSC: ${esc(bp.bankIfsc || '—')}</p></div>` : ''}`;
  } else if (kind === 'warranty') {
    body = `
      <div class="card" style="background:#fffbeb;border:1px solid #fde68a">
        <div style="display:flex;justify-content:space-between;align-items:center"><div><h3 style="margin:0;font-size:13px">${esc(data.itemType || 'Equipment')} official guarantee</h3><p class="muted">OEM brand: <b>${esc(data.brand || '')}</b> | Model: ${esc(data.model || '')}</p></div>
        <span style="font-size:14px;font-weight:700;background:#fde68a;padding:4px 12px;border-radius:6px">${esc(data.periodYears || '')} years</span></div>
        <div class="grid2" style="border-top:1px solid #fde68a">
          <p><span class="muted">Serial:</span> <b class="mono">${esc(data.serialNumber || '')}</b></p><p><span class="muted">Commissioning:</span> <b>${esc(formatDate(data.startDate))}</b></p>
          <p><span class="muted">Expires:</span> <b style="color:#047857">${esc(formatDate(data.expiryDate))}</b></p><p><span class="muted">Beneficiary:</span> <b>${esc(data.customerName || '')}</b></p>
        </div>
      </div>
      <p style="margin-top:12px"><b>Warranty coverage terms</b></p><p class="muted">${esc(data.terms || `Manufacturer performance guarantee against defects in material and workmanship. For service, raise a request in the ${tenant?.name || ''} customer portal or call the service desk.`)}</p>`;
  } else {
    body = `
      <div class="card" style="background:#ecfdf5;border:1px solid #a7f3d0">
        <div style="display:flex;justify-content:space-between;align-items:center"><div><p class="lbl" style="color:#065f46">Received with thanks from</p><h3 style="margin:2px 0;font-size:14px">${esc(data.customerName || '')}</h3></div>
        <div style="text-align:right"><p class="lbl" style="color:#065f46">Amount received</p><h3 class="mono" style="margin:2px 0;font-size:16px;color:#065f46">${money(data.amount)}</h3></div></div>
        <div class="grid2" style="border-top:1px solid #a7f3d0">
          <p><span class="muted">Payment mode:</span> <b>${esc(data.paymentMethod || '')}</b></p><p><span class="muted">Transaction / ref:</span> <span class="mono">${esc(data.transactionRef || 'N/A')}</span></p>
          <p><span class="muted">Project:</span> ${esc(data.projectName || '')}</p><p><span class="muted">Status:</span> <b style="color:#047857">${esc(data.status === 'Completed' || !data.status ? 'Received' : data.status)}</b></p>
          ${data.balanceAfter !== undefined ? `<p><span class="muted">Balance after this payment:</span> <b>${money(data.balanceAfter)}</b></p>` : ''}
        </div>
      </div>`;
  }

  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>${CSS}</style></head><body><div class="page">${header(tenant, gst, primary, secondary, title, numberLabel, number, date)}<div class="body">${body}</div>${footer(tenant, primary, secondary)}</div></body></html>`;
}

/** Render to an A4 PDF. Returns the file URI and base64 (for "send to customer"). */
export async function makePdf(html: string): Promise<{ uri: string; base64?: string }> {
  return Print.printToFileAsync({ html, width: 595, height: 842, base64: true });
}

export async function sharePdf(html: string, fileName: string): Promise<void> {
  if (Platform.OS === 'web') { await Print.printAsync({ html }); return; }
  const { uri } = await makePdf(html);
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: fileName });
}
