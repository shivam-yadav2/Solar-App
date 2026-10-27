// Copied from SAAS-Solar/src/components/admin/quotations/QuotationDocument.tsx — keep in sync.
// Never rendered on screen in the app: renderToStaticMarkup turns it into the PDF's HTML.
import React from 'react';
import type {
  QuotationComponentLine,
  QuotationSettings,
  QuotationTemplateKey,
  Tenant,
} from '../types';

// Everything in this file uses inline styles with hex colours only. The
// same DOM node is printed through an isolated iframe and rasterised for
// the PDF, neither of which sees the app's Tailwind stylesheet.

export const A4_WIDTH_PX = 794;
export const A4_HEIGHT_PX = 1123;

export interface QuotationDocumentData {
  quotationNumber?: string;
  quotationDate?: string;
  validUntil?: string;
  recipientName?: string;
  recipientAddress?: string;
  recipientPhone?: string;
  title?: string;
  systemCapacityKw?: number;
  features: string[];
  components: QuotationComponentLine[];
  totalAmount: number;
  priceLabel?: string;
  paymentTerms?: string;
  termsConditions?: string;
  notes?: string;
  preparedByName?: string;
  preparedByPhone?: string;
}

export const QUOTATION_TEMPLATES: { key: QuotationTemplateKey; name: string; description: string; swatch: string[] }[] = [
  { key: 'classic', name: 'Classic', description: 'Bordered tables, yellow & green bands — the familiar rooftop format', swatch: ['#fdefc3', '#c5e0b4', '#b91c1c'] },
  { key: 'modern', name: 'Modern', description: 'Brand-colour header, feature ticks and a price card', swatch: ['#0f766e', '#f1f5f9', '#ffffff'] },
  { key: 'minimal', name: 'Minimal', description: 'Black & white, serif headings, lots of white space', swatch: ['#ffffff', '#111111', '#9ca3af'] },
  { key: 'bold', name: 'Premium Dark', description: 'Dark sidebar with company & bank details, accent totals', swatch: ['#0f172a', '#f59e0b', '#ffffff'] },
];

// ---------------------------------------------------------------- helpers

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`;
}

function threeDigits(n: number): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  return [hundred ? `${ONES[hundred]} Hundred` : '', rest ? twoDigits(rest) : ''].filter(Boolean).join(' ');
}

/** Indian numbering: 195000 → "One Lakh Ninety Five Thousand". */
export function amountInWords(amount: number): string {
  let n = Math.floor(Math.abs(amount));
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) parts.push(`${crore >= 100 ? threeDigits(crore) : twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (n) parts.push(threeDigits(n));
  return parts.join(' ');
}

export function rupees(amount: number): string {
  return `Rs. ${Math.round(amount || 0).toLocaleString('en-IN')}/-`;
}

function ordinal(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] || 'th';
}

/** "2026-08-20" → "20th Aug 2026". */
export function quotationDateLabel(value?: string): string {
  if (!value) return '';
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return value;
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1];
  return `${d}${ordinal(d)} ${month} ${y}`;
}

function validityDays(from?: string, to?: string): number | null {
  if (!from || !to) return null;
  const diff = Math.round((Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) / 86400000);
  return Number.isFinite(diff) && diff > 0 ? diff : null;
}

function normalizeHex(hex?: string): string {
  const value = (hex || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  if (/^#[0-9a-f]{3}$/i.test(value)) return `#${value.slice(1).split('').map((c) => c + c).join('')}`;
  return '#b45309';
}

/** Black or white, whichever reads better on the given background. */
function readableOn(hex: string): string {
  const v = normalizeHex(hex);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.45 ? '#111827' : '#ffffff';
}

function tint(hex: string, amount: number): string {
  const v = normalizeHex(hex);
  const mix = [1, 3, 5].map((i) => {
    const c = parseInt(v.slice(i, i + 2), 16);
    return Math.round(c + (255 - c) * amount).toString(16).padStart(2, '0');
  });
  return `#${mix.join('')}`;
}

function lines(value?: string): string[] {
  return (value || '').split('\n').map((l) => l.trim()).filter(Boolean);
}

interface Company {
  name: string;
  legalName: string;
  logoUrl: string;
  accent: string;
  headerNote: string;
  email: string;
  phone: string;
  gstin: string;
  address: string;
  branchAddress: string;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  signatoryTitle: string;
}

function companyFrom(tenant: Tenant | null, settings: QuotationSettings): Company {
  const profile = tenant?.businessProfile;
  const branding = tenant?.branding;
  // Many profiles already type city/state/PIN into the address line itself.
  const street = (profile?.address || '').trim();
  const extras = [profile?.city, profile?.state, profile?.pincode]
    .filter((part): part is string => Boolean(part && !street.toLowerCase().includes(part.trim().toLowerCase())));
  const address = [street, ...extras].filter(Boolean).join(', ');
  return {
    name: tenant?.name || profile?.legalEntityName || 'Your Company',
    legalName: profile?.legalEntityName || tenant?.name || '',
    logoUrl: branding?.logoUrl || '',
    accent: normalizeHex(branding?.primaryColor),
    headerNote: settings.headerNote || branding?.companyTagline || '',
    email: branding?.supportEmail || tenant?.adminEmail || '',
    phone: branding?.supportPhone || '',
    gstin: profile?.gstin || '',
    address,
    branchAddress: settings.branchAddress || '',
    bankName: profile?.bankName || '',
    bankAccount: profile?.bankAccountNumber || '',
    bankIfsc: profile?.bankIfsc || '',
    signatoryTitle: settings.signatoryTitle || 'Authorised Signatory',
  };
}

const SANS = "'Segoe UI', Calibri, Arial, Helvetica, sans-serif";
const SERIF = "Georgia, 'Times New Roman', Times, serif";

const page = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  width: A4_WIDTH_PX,
  minHeight: A4_HEIGHT_PX,
  background: '#ffffff',
  color: '#111827',
  fontFamily: SANS,
  fontSize: 12,
  lineHeight: 1.4,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  ...extra,
});

const PhoneIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" style={{ verticalAlign: 'middle' }}>
    <circle cx="12" cy="12" r="12" fill={color} />
    <path d="M9.2 6.5c.3 0 .6.2.7.5l.8 1.9c.1.3 0 .6-.2.8l-.9.8a8 8 0 0 0 3.9 3.9l.8-.9c.2-.2.5-.3.8-.2l1.9.8c.3.1.5.4.5.7v1.6c0 .5-.4.9-.9.9A10.4 10.4 0 0 1 6.6 8c0-.5.4-.9.9-.9z" fill="#ffffff" />
  </svg>
);

const PinIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" style={{ verticalAlign: 'middle' }}>
    <circle cx="12" cy="12" r="12" fill={color} />
    <path d="M12 5.5a4 4 0 0 0-4 4c0 3 4 8 4 8s4-5 4-8a4 4 0 0 0-4-4zm0 5.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" fill="#ffffff" />
  </svg>
);

const Logo: React.FC<{ company: Company; size: number; rounded?: boolean; background?: string }> = ({ company, size, rounded, background }) => {
  if (company.logoUrl) {
    return (
      <img
        src={company.logoUrl}
        alt=""
        crossOrigin="anonymous"
        style={{ width: size, height: size, objectFit: 'contain', borderRadius: rounded ? 12 : 0, background: background || 'transparent', padding: background ? 6 : 0, boxSizing: 'border-box' }}
      />
    );
  }
  const initials = company.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: rounded ? 12 : size / 2, background: company.accent, color: readableOn(company.accent), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
};

// ---------------------------------------------------------------- classic

const ClassicTemplate: React.FC<{ data: QuotationDocumentData; company: Company }> = ({ data, company }) => {
  const cell: React.CSSProperties = { border: '1px solid #1f2937', padding: '4px 8px', fontSize: 13 };
  const days = validityDays(data.quotationDate, data.validUntil);
  const red = company.accent;
  return (
    <div style={page({ padding: '28px 36px 0' })}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingBottom: 10, borderBottom: `4px solid ${tint('#65a30d', 0.1)}` }}>
        <Logo company={company} size={96} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 38, fontWeight: 900, color: red, letterSpacing: 0.5, textTransform: 'uppercase', lineHeight: 1.1 }}>{company.name}</div>
          {company.headerNote && <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{company.headerNote}</div>}
          {company.email && <div style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>E-mail : {company.email}</div>}
        </div>
      </div>

      {/* To / From */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, margin: '18px 18px 10px', fontSize: 13 }}>
        <div style={{ maxWidth: 360 }}>
          <div style={{ fontSize: 15, marginBottom: 6 }}>To,</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{data.recipientName || '—'}</div>
          {lines(data.recipientAddress).map((l, i) => <div key={i}>{l}</div>)}
          {data.recipientPhone && <div>Ph no {data.recipientPhone}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>From,</div>
          {data.preparedByName && <div>{data.preparedByName}</div>}
          {data.preparedByPhone && <div>Ph no {data.preparedByPhone}</div>}
          <div>Quotation No {data.quotationNumber || ''}</div>
          <div>Date : {quotationDateLabel(data.quotationDate)}</div>
        </div>
      </div>

      {/* Features */}
      {data.features.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
          <thead>
            <tr style={{ background: '#fdefc3' }}>
              <th style={{ ...cell, fontSize: 17, fontWeight: 800, textAlign: 'center' }}>Unique features</th>
              <th style={{ ...cell, fontSize: 17, fontWeight: 800, textAlign: 'center', width: 190 }}>Included Yes/No</th>
            </tr>
          </thead>
          <tbody>
            {data.features.map((feature) => (
              <tr key={feature}>
                <td style={{ ...cell, fontWeight: 700, textAlign: 'center', fontSize: 14 }}>{feature}</td>
                <td style={{ ...cell, fontWeight: 700, textAlign: 'center', fontSize: 14 }}>Yes</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Components */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr style={{ background: '#c5e0b4' }}>
            <td colSpan={3} style={{ ...cell, fontWeight: 700, textAlign: 'center' }}>{data.title}</td>
          </tr>
          {data.components.map((c, i) => (
            <tr key={i}>
              <td style={{ ...cell, fontSize: 14, width: 190 }}>{c.category}</td>
              <td style={{ ...cell, textAlign: 'center', fontSize: 14, background: c.highlight ? '#fff200' : undefined }}>{c.brand}</td>
              <td style={{ ...cell, textAlign: 'center', fontSize: 14, width: 190 }}>{c.spec}</td>
            </tr>
          ))}
          <tr>
            <td style={cell} />
            <td style={{ ...cell, fontSize: 12 }}>{data.priceLabel}</td>
            <td style={{ ...cell, fontSize: 13, fontWeight: 700 }}>{rupees(data.totalAmount)}</td>
          </tr>
          <tr>
            <td style={cell} />
            <td style={{ ...cell, fontSize: 11 }} colSpan={2}>
              Rupees {amountInWords(data.totalAmount)} Only
              {days ? <><br />Note- Quotation valid only for {days} days</> : null}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Payment terms + bank */}
      <div style={{ display: 'flex', gap: 28, marginTop: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, marginBottom: 8, paddingLeft: 12 }}>Payment Term and Bank Details :</div>
          <div style={{ background: '#e5e7eb', padding: '14px 14px', fontSize: 13 }}>
            {lines(data.paymentTerms).map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
        <div style={{ width: 300, background: '#e5e7eb', padding: '10px 12px', fontSize: 12, fontWeight: 700 }}>
          <div>{company.legalName || company.name}</div>
          {company.gstin && <div>GST NO : {company.gstin}</div>}
          {(company.bankAccount || company.bankName) && <div>Bank Detail :</div>}
          {company.bankAccount && <div>Account no : <span style={{ color: '#1d4ed8', textDecoration: 'underline' }}>{company.bankAccount}</span></div>}
          {company.bankIfsc && <div>IFSC : {company.bankIfsc}</div>}
          {company.bankName && <div>Bank Name: {company.bankName}</div>}
        </div>
      </div>

      {(data.termsConditions || data.notes) && (
        <div style={{ marginTop: 14, fontSize: 11, color: '#374151' }}>
          {data.notes && <div style={{ marginBottom: 4 }}>{data.notes}</div>}
          {lines(data.termsConditions).map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}

      <div style={{ textAlign: 'right', marginTop: 24, marginRight: 30, fontSize: 12, color: '#1e3a8a', fontStyle: 'italic' }}>
        <div>For {company.name}</div>
        <div style={{ height: 30 }} />
        <div>{company.signatoryTitle}</div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 'auto', paddingTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 700, padding: '0 8px 6px' }}>
          {company.phone && <><PhoneIcon color="#111827" /> <span style={{ whiteSpace: 'nowrap' }}>{company.phone}</span><span style={{ margin: '0 6px' }}>|</span></>}
          {company.address && <><PinIcon color="#111827" /> <span>Registered Address – {company.address}</span></>}
        </div>
        <div style={{ background: '#65a30d', color: '#ffffff', fontSize: 12, fontWeight: 700, padding: '5px 12px', textAlign: 'center', marginLeft: -36, marginRight: -36 }}>
          {company.branchAddress ? `Branch Address – ${company.branchAddress}` : company.name}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- modern

const ModernTemplate: React.FC<{ data: QuotationDocumentData; company: Company }> = ({ data, company }) => {
  const accent = company.accent;
  const onAccent = readableOn(accent);
  const soft = tint(accent, 0.9);
  const days = validityDays(data.quotationDate, data.validUntil);
  const label: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: '#64748b', marginBottom: 4 };
  return (
    <div style={page()}>
      <div style={{ background: accent, color: onAccent, padding: '26px 36px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Logo company={company} size={64} rounded background="#ffffff" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{company.name}</div>
          {company.headerNote && <div style={{ fontSize: 12, opacity: 0.9 }}>{company.headerNote}</div>}
          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{[company.phone, company.email].filter(Boolean).join('  •  ')}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 3 }}>QUOTATION</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>No. {data.quotationNumber || '—'}</div>
          <div style={{ fontSize: 12 }}>{quotationDateLabel(data.quotationDate)}</div>
        </div>
      </div>

      <div style={{ padding: '22px 36px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
            <div style={label}>Prepared for</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{data.recipientName || '—'}</div>
            {lines(data.recipientAddress).map((l, i) => <div key={i} style={{ color: '#334155' }}>{l}</div>)}
            {data.recipientPhone && <div style={{ color: '#334155' }}>Phone: {data.recipientPhone}</div>}
          </div>
          <div style={{ width: 230, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
            <div style={label}>Prepared by</div>
            <div style={{ fontWeight: 700 }}>{data.preparedByName || company.name}</div>
            {data.preparedByPhone && <div style={{ color: '#334155' }}>Phone: {data.preparedByPhone}</div>}
            {data.validUntil && <div style={{ color: '#334155', marginTop: 6 }}>Valid until: <b>{quotationDateLabel(data.validUntil)}</b></div>}
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', flex: 1 }}>{data.title}</div>
          {data.systemCapacityKw ? <div style={{ background: soft, color: '#0f172a', border: `1px solid ${tint(accent, 0.6)}`, borderRadius: 999, padding: '3px 12px', fontWeight: 700, fontSize: 12 }}>{data.systemCapacityKw} kW</div> : null}
        </div>

        {data.features.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.features.map((f) => (
              <div key={f} style={{ width: 'calc(50% - 4px)', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 8, background: soft, borderRadius: 8, padding: '7px 10px', fontWeight: 600 }}>
                <span style={{ width: 18, height: 18, minWidth: 18, borderRadius: 9, background: accent, color: onAccent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>✓</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#0f172a', color: '#ffffff' }}>
              <th style={{ textAlign: 'left', padding: '8px 10px', width: 170 }}>Component</th>
              <th style={{ textAlign: 'left', padding: '8px 10px' }}>Brand / Make</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', width: 160 }}>Specification</th>
            </tr>
          </thead>
          <tbody>
            {data.components.map((c, i) => (
              <tr key={i} style={{ background: c.highlight ? tint(accent, 0.8) : i % 2 ? '#f8fafc' : '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '7px 10px', fontWeight: 700 }}>{c.category}</td>
                <td style={{ padding: '7px 10px' }}>{c.brand}</td>
                <td style={{ padding: '7px 10px' }}>{c.spec}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', gap: 16, marginTop: 18 }}>
          <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
            <div style={label}>Payment terms</div>
            {lines(data.paymentTerms).map((l, i) => <div key={i} style={{ marginBottom: 2 }}>• {l}</div>)}
            {(company.bankAccount || company.bankName) && (
              <>
                <div style={{ ...label, marginTop: 10 }}>Bank details</div>
                <div>{company.legalName || company.name}{company.gstin ? `  |  GSTIN ${company.gstin}` : ''}</div>
                <div>A/c {company.bankAccount}  |  IFSC {company.bankIfsc}</div>
                <div>{company.bankName}</div>
              </>
            )}
          </div>
          <div style={{ width: 250, background: accent, color: onAccent, borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 11, opacity: 0.9 }}>{data.priceLabel}</div>
            <div style={{ fontSize: 28, fontWeight: 800, margin: '4px 0' }}>{rupees(data.totalAmount)}</div>
            <div style={{ fontSize: 10, opacity: 0.9 }}>Rupees {amountInWords(data.totalAmount)} Only</div>
          </div>
        </div>

        {(data.notes || data.termsConditions || days) && (
          <div style={{ marginTop: 14, fontSize: 11, color: '#475569' }}>
            {days ? <div>This quotation is valid for {days} days from the date of issue.</div> : null}
            {data.notes && <div>{data.notes}</div>}
            {lines(data.termsConditions).map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 26 }}>
          <div style={{ textAlign: 'center', minWidth: 200 }}>
            <div style={{ height: 36 }} />
            <div style={{ borderTop: '1px solid #94a3b8', paddingTop: 4, fontWeight: 700 }}>For {company.name}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{company.signatoryTitle}</div>
          </div>
        </div>

        <div style={{ marginTop: 'auto', padding: '16px 0 18px', borderTop: `3px solid ${accent}`, fontSize: 10.5, color: '#475569', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <span>{company.address}</span>
          <span>{company.branchAddress ? `Branch: ${company.branchAddress}` : company.email}</span>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- minimal

const MinimalTemplate: React.FC<{ data: QuotationDocumentData; company: Company }> = ({ data, company }) => {
  const small: React.CSSProperties = { fontSize: 9.5, letterSpacing: 2, textTransform: 'uppercase', color: '#6b7280' };
  const days = validityDays(data.quotationDate, data.validUntil);
  return (
    <div style={page({ padding: '48px 56px 0', color: '#111111' })}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {company.logoUrl && <Logo company={company} size={52} />}
          <div>
            <div style={{ fontFamily: SERIF, fontSize: 24 }}>{company.name}</div>
            {company.headerNote && <div style={{ fontSize: 11, color: '#6b7280' }}>{company.headerNote}</div>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: SERIF, fontSize: 30, letterSpacing: 1 }}>Quotation</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>{data.quotationNumber}</div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #111111', margin: '22px 0 18px' }} />

      <div style={{ display: 'flex', gap: 32 }}>
        <div style={{ flex: 1 }}>
          <div style={small}>Billed to</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{data.recipientName || '—'}</div>
          {lines(data.recipientAddress).map((l, i) => <div key={i}>{l}</div>)}
          {data.recipientPhone && <div>{data.recipientPhone}</div>}
        </div>
        <div style={{ width: 150 }}>
          <div style={small}>Date</div>
          <div style={{ marginTop: 4 }}>{quotationDateLabel(data.quotationDate)}</div>
          <div style={{ ...small, marginTop: 10 }}>Valid until</div>
          <div style={{ marginTop: 4 }}>{quotationDateLabel(data.validUntil)}</div>
        </div>
        <div style={{ width: 170 }}>
          <div style={small}>Contact</div>
          <div style={{ marginTop: 4 }}>{data.preparedByName || company.name}</div>
          {(data.preparedByPhone || company.phone) && <div>{data.preparedByPhone || company.phone}</div>}
          {company.email && <div>{company.email}</div>}
        </div>
      </div>

      <div style={{ fontFamily: SERIF, fontSize: 18, marginTop: 28 }}>{data.title}</div>

      {data.features.length > 0 && (
        <div style={{ marginTop: 10, columnCount: 2, columnGap: 32 }}>
          {data.features.map((f) => <div key={f} style={{ padding: '3px 0', breakInside: 'avoid' }}>—&nbsp; {f}</div>)}
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 18 }}>
        <thead>
          <tr>
            {['Item', 'Make / Description', 'Specification'].map((h, i) => (
              <th key={h} style={{ ...small, textAlign: 'left', fontWeight: 400, padding: '0 0 6px', borderBottom: '1px solid #111111', width: i === 1 ? undefined : 170 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.components.map((c, i) => (
            <tr key={i}>
              <td style={{ padding: '7px 0', borderBottom: '1px solid #e5e7eb' }}>{c.category}</td>
              <td style={{ padding: '7px 8px 7px 0', borderBottom: '1px solid #e5e7eb', fontWeight: c.highlight ? 700 : 400 }}>{c.brand}</td>
              <td style={{ padding: '7px 0', borderBottom: '1px solid #e5e7eb' }}>{c.spec}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={small}>{data.priceLabel}</div>
          <div style={{ fontFamily: SERIF, fontSize: 28, marginTop: 4 }}>{rupees(data.totalAmount)}</div>
          <div style={{ fontSize: 10.5, color: '#6b7280' }}>Rupees {amountInWords(data.totalAmount)} Only</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 32, marginTop: 26 }}>
        <div style={{ flex: 1 }}>
          <div style={small}>Payment terms</div>
          {lines(data.paymentTerms).map((l, i) => <div key={i} style={{ marginTop: 3 }}>{l}</div>)}
          {days ? <div style={{ marginTop: 6, color: '#6b7280' }}>Quotation valid for {days} days.</div> : null}
          {data.notes && <div style={{ marginTop: 6, color: '#6b7280' }}>{data.notes}</div>}
        </div>
        <div style={{ width: 260 }}>
          <div style={small}>Bank details</div>
          <div style={{ marginTop: 3 }}>{company.legalName || company.name}</div>
          {company.gstin && <div>GSTIN {company.gstin}</div>}
          {company.bankAccount && <div>A/c {company.bankAccount}</div>}
          {company.bankIfsc && <div>IFSC {company.bankIfsc}</div>}
          {company.bankName && <div>{company.bankName}</div>}
        </div>
      </div>

      {data.termsConditions && (
        <div style={{ marginTop: 18, fontSize: 10.5, color: '#4b5563' }}>
          <div style={small}>Terms &amp; conditions</div>
          {lines(data.termsConditions).map((l, i) => <div key={i} style={{ marginTop: 2 }}>{l}</div>)}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 34 }}>
        <div style={{ width: 200, borderTop: '1px solid #111111', paddingTop: 5, textAlign: 'center', fontSize: 11 }}>
          {company.signatoryTitle}, {company.name}
        </div>
      </div>

      <div style={{ marginTop: 'auto', padding: '14px 0 22px', borderTop: '1px solid #e5e7eb', fontSize: 10, color: '#6b7280', textAlign: 'center' }}>
        {[company.address, company.branchAddress && `Branch: ${company.branchAddress}`, company.phone].filter(Boolean).join('   ·   ')}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- premium dark

const BoldTemplate: React.FC<{ data: QuotationDocumentData; company: Company }> = ({ data, company }) => {
  const accent = company.accent;
  const onAccent = readableOn(accent);
  const side: React.CSSProperties = { fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase', color: accent, fontWeight: 700, marginTop: 18, marginBottom: 4 };
  const days = validityDays(data.quotationDate, data.validUntil);
  return (
    <div style={page({ flexDirection: 'row' })}>
      <div style={{ width: 230, background: '#0f172a', color: '#cbd5e1', padding: '32px 22px', boxSizing: 'border-box', fontSize: 11 }}>
        <Logo company={company} size={72} rounded background="#ffffff" />
        <div style={{ color: '#ffffff', fontSize: 18, fontWeight: 800, marginTop: 14, lineHeight: 1.2 }}>{company.name}</div>
        {company.headerNote && <div style={{ marginTop: 4 }}>{company.headerNote}</div>}

        <div style={side}>Contact</div>
        {company.phone && <div>{company.phone}</div>}
        {company.email && <div style={{ wordBreak: 'break-all' }}>{company.email}</div>}
        {company.address && <div style={{ marginTop: 4 }}>{company.address}</div>}
        {company.branchAddress && <div style={{ marginTop: 4 }}>Branch: {company.branchAddress}</div>}

        {company.gstin && (<><div style={side}>GSTIN</div><div>{company.gstin}</div></>)}

        {(company.bankAccount || company.bankName) && (
          <>
            <div style={side}>Bank details</div>
            <div>{company.legalName || company.name}</div>
            {company.bankAccount && <div>A/c {company.bankAccount}</div>}
            {company.bankIfsc && <div>IFSC {company.bankIfsc}</div>}
            {company.bankName && <div>{company.bankName}</div>}
          </>
        )}

        {data.paymentTerms && (
          <>
            <div style={side}>Payment terms</div>
            {lines(data.paymentTerms).map((l, i) => <div key={i} style={{ marginBottom: 3 }}>{l}</div>)}
          </>
        )}
      </div>

      <div style={{ flex: 1, padding: '32px 32px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: '#64748b', fontWeight: 700 }}>SOLAR PROPOSAL</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 4, maxWidth: 330 }}>{data.title}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: '#475569' }}>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>#{data.quotationNumber || '—'}</div>
            <div>{quotationDateLabel(data.quotationDate)}</div>
            {data.validUntil && <div>Valid till {quotationDateLabel(data.validUntil)}</div>}
          </div>
        </div>

        <div style={{ marginTop: 18, borderLeft: `4px solid ${accent}`, paddingLeft: 12 }}>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, letterSpacing: 1 }}>PREPARED FOR</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{data.recipientName || '—'}</div>
          {lines(data.recipientAddress).map((l, i) => <div key={i} style={{ color: '#334155' }}>{l}</div>)}
          {data.recipientPhone && <div style={{ color: '#334155' }}>Ph: {data.recipientPhone}</div>}
          {data.preparedByName && <div style={{ color: '#64748b', marginTop: 4, fontSize: 11 }}>Your contact: {data.preparedByName}{data.preparedByPhone ? ` (${data.preparedByPhone})` : ''}</div>}
        </div>

        {data.features.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.features.map((f) => (
              <span key={f} style={{ background: '#0f172a', color: '#ffffff', borderRadius: 6, padding: '5px 9px', fontSize: 11, fontWeight: 600 }}>
                <span style={{ color: accent }}>★</span> {f}
              </span>
            ))}
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 11.5 }}>
          <tbody>
            {data.components.map((c, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: c.highlight ? tint(accent, 0.85) : undefined }}>
                <td style={{ padding: '7px 6px', fontWeight: 700, color: '#0f172a', width: 120 }}>{c.category}</td>
                <td style={{ padding: '7px 6px', color: '#334155' }}>{c.brand}</td>
                <td style={{ padding: '7px 6px', color: '#334155', textAlign: 'right', width: 120 }}>{c.spec}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 18, background: accent, color: onAccent, borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, maxWidth: 220 }}>{data.priceLabel}</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 26, fontWeight: 900 }}>{rupees(data.totalAmount)}</div>
            <div style={{ fontSize: 9.5, opacity: 0.9 }}>Rupees {amountInWords(data.totalAmount)} Only</div>
          </div>
        </div>

        {(days || data.notes || data.termsConditions) && (
          <div style={{ marginTop: 12, fontSize: 10.5, color: '#475569' }}>
            {days ? <div>Quotation valid only for {days} days.</div> : null}
            {data.notes && <div>{data.notes}</div>}
            {lines(data.termsConditions).map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', padding: '24px 0 30px' }}>
          <div style={{ textAlign: 'center', minWidth: 190 }}>
            <div style={{ height: 30 }} />
            <div style={{ borderTop: '2px solid #0f172a', paddingTop: 4, fontWeight: 800, color: '#0f172a' }}>For {company.name}</div>
            <div style={{ fontSize: 10.5, color: '#64748b' }}>{company.signatoryTitle}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- entry

interface QuotationDocumentProps {
  data: QuotationDocumentData;
  tenant: Tenant | null;
  settings: QuotationSettings;
  template: QuotationTemplateKey;
}

export const QuotationDocument = React.forwardRef<HTMLDivElement, QuotationDocumentProps>(
  ({ data, tenant, settings, template }, ref) => {
    const company = companyFrom(tenant, settings);
    const Template = { classic: ClassicTemplate, modern: ModernTemplate, minimal: MinimalTemplate, bold: BoldTemplate }[template] || ClassicTemplate;
    return (
      <div ref={ref} style={{ width: A4_WIDTH_PX, background: '#ffffff' }}>
        <Template data={data} company={company} />
      </div>
    );
  }
);
QuotationDocument.displayName = 'QuotationDocument';
