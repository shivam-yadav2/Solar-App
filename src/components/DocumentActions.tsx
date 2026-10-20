import React, { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Send, Share2 } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { ops } from '../lib/apis/ops';
import { documentHtml, DocKind, makePdf, sharePdf } from '../lib/docs';
import { Button, FormSection, GUTTER, Sheet, Spinner, space, T, TextField, ToggleField, useOverlay, useTheme } from '../ds';

/** "Share PDF" + "Send to customer" for an invoice, receipt or warranty. */
export const DocumentActions: React.FC<{ kind: DocKind; id: string; data: any; fileName: string }> = ({ kind, id, data, fileName }) => {
  const p = useTheme();
  const { tenant, user } = useAuth();
  const { toast } = useOverlay();
  const [busy, setBusy] = useState(false);
  const [send, setSend] = useState(false);
  const share = async () => {
    setBusy(true);
    try {
      await sharePdf(documentHtml(kind, data, tenant), fileName);
      void ops.track(kind === 'invoice' ? 'INVOICE_PRINTED' : kind === 'receipt' ? 'RECEIPT_PRINTED' : 'WARRANTY_CERTIFICATE_PRINTED', kind === 'invoice' ? 'Invoice' : kind === 'receipt' ? 'Payment' : 'WarrantyDocument', id, data.invoiceNumber || data.customId);
    } catch (e: any) { toast(e.message || 'Could not make the PDF', 'error'); } finally { setBusy(false); }
  };
  return (
    <View style={{ flexDirection: 'row', gap: space.s }}>
      <Button title="Share PDF" kind="gray" icon={<Share2 size={18} color={p.label} />} loading={busy} onPress={share} style={{ flex: 1 }} />
      {user?.role !== 'CUSTOMER' ? <Button title="Send" icon={<Send size={18} color={p.onAccent} />} onPress={() => setSend(true)} style={{ flex: 1 }} /> : null}
      <SendSheet visible={send} onClose={() => setSend(false)} kind={kind} id={id} data={data} fileName={fileName} />
    </View>
  );
};

function SendSheet({ visible, onClose, kind, id, data, fileName }: { visible: boolean; onClose: () => void; kind: DocKind; id: string; data: any; fileName: string }) {
  const { tenant } = useAuth();
  const { toast } = useOverlay();
  const pre = useQuery({ queryKey: ['send-preview', kind, id], queryFn: () => ops.sendPreview(kind, id), enabled: visible });
  const [email, setEmail] = useState(''); const [phone, setPhone] = useState('');
  const [useEmail, setUseEmail] = useState(true); const [useWa, setUseWa] = useState(true);
  const [busy, setBusy] = useState(false);
  React.useEffect(() => {
    if (!pre.data) return;
    setEmail(pre.data.to.email || ''); setPhone(pre.data.to.phone || '');
    setUseEmail(pre.data.channelsSetUp.includes('email')); setUseWa(pre.data.channelsSetUp.includes('whatsapp'));
  }, [pre.data]);
  const ready = pre.data?.channelsSetUp || [];
  const go = async () => {
    const channels = [useEmail && 'email', useWa && 'whatsapp'].filter(Boolean) as string[];
    if (!channels.length) { toast('Choose email or WhatsApp', 'error'); return; }
    setBusy(true);
    try {
      const pdf = await makePdf(documentHtml(kind, data, tenant)).catch(() => null);
      const r = await ops.sendDocument({ kind, id, channels, email: email || undefined, phone: phone || undefined, pdfBase64: pdf?.base64, fileName });
      onClose();
      toast(r.sent.length ? `Sent by ${r.sent.join(' and ')}` : r.failed.map((f) => f.error).join('; ') || 'Not sent', r.sent.length ? 'success' : 'error');
    } catch (e: any) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Send to customer" footer={<Button title="Send" loading={busy} onPress={go} disabled={!ready.length} style={{ flex: 1 }} />}>
      <View style={{ paddingHorizontal: GUTTER, gap: space.m }}>
        {pre.isPending ? <Spinner /> : !ready.length ? (
          <T variant="subhead" color="secondary">Email and WhatsApp aren't set up for your account yet. Use “Share PDF” to send it from your phone instead.</T>
        ) : (
          <>
            <T variant="subhead" color="secondary">The PDF goes to {pre.data?.to.name}.</T>
            {ready.includes('email') ? (
              <FormSection>
                <ToggleField label="Email" value={useEmail} onChange={setUseEmail} />
                {useEmail ? <TextField label="Email address" kind="email" value={email} onChange={setEmail} /> : null}
              </FormSection>
            ) : null}
            {ready.includes('whatsapp') ? (
              <FormSection>
                <ToggleField label="WhatsApp" value={useWa} onChange={setUseWa} />
                {useWa ? <TextField label="Mobile" kind="phone" value={phone} onChange={setPhone} /> : null}
              </FormSection>
            ) : null}
          </>
        )}
      </View>
    </Sheet>
  );
}
