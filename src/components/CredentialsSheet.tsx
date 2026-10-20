import React from 'react';
import { View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button, GUTTER, InfoRow, Section, Sheet, space, T, useOverlay } from '../ds';
import { openWhatsApp } from './kit';
import { getApiBase } from '../lib/appConfig';

export interface Credentials { name: string; login: string; password: string; phone?: string; company?: string; notified?: string[] }

/** One-time temporary password: show, copy, or send on WhatsApp. */
export const CredentialsSheet: React.FC<{ creds: Credentials | null; onClose: () => void }> = ({ creds, onClose }) => {
  const { toast } = useOverlay();
  const site = getApiBase().replace(/\/api\/?$/, '');
  const message = creds ? `Hello ${creds.name},\n\nYour ${creds.company || 'solar'} customer portal login:\nLogin: ${creds.login}\nTemporary password: ${creds.password}\n\nSign in at ${site} or the SolarOS app — you'll be asked to set your own password.` : '';
  return (
    <Sheet visible={!!creds} onClose={onClose} title="Portal login ready"
      footer={<><Button title="Copy" kind="gray" style={{ flex: 1 }} onPress={async () => { await Clipboard.setStringAsync(message); toast('Copied'); }} /><Button title="WhatsApp" style={{ flex: 1 }} disabled={!creds?.phone} onPress={() => openWhatsApp(creds?.phone, message)} /></>}>
      <View style={{ paddingHorizontal: GUTTER, gap: space.m }}>
        <T variant="subhead" color="secondary">This password is shown once. The customer must change it at first sign-in.</T>
        <Section>
          <InfoRow label="Login" value={creds?.login} />
          <InfoRow label="Password" value={creds?.password} />
        </Section>
        {creds?.notified?.length ? <T variant="footnote" color="secondary">Also sent by {creds.notified.join(' and ')}.</T> : null}
      </View>
    </Sheet>
  );
};
