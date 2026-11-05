import React from 'react';
import { View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button, GUTTER, InfoRow, Section, Sheet, space, T, useOverlay } from '../ds';
import { openWhatsApp } from './kit';
import { getApiBase } from '../lib/appConfig';

export interface Credentials { name: string; login: string; password: string; phone?: string; company?: string; notified?: string[]; /** Company code: send its own login page (/c/<slug> for customers, /s/<slug> for staff) instead of the generic sign-in. */ slug?: string; /** 'staff' = a company admin/staff login (Super Admin creating a company). */ audience?: 'customer' | 'staff' }

/** One-time temporary password: show, copy, or send on WhatsApp. */
export const CredentialsSheet: React.FC<{ creds: Credentials | null; onClose: () => void }> = ({ creds, onClose }) => {
  const { toast } = useOverlay();
  const staff = creds?.audience === 'staff';
  // Always a login page — never the bare site root (that opens the marketing landing page).
  const site = `${getApiBase().replace(/\/api\/?$/, '')}${creds?.slug ? `/${staff ? 's' : 'c'}/${creds.slug}` : '/login'}`;
  const message = creds ? `Hello ${creds.name},\n\nYour ${creds.company || 'solar'} ${staff ? 'SolarOS' : 'customer portal'} login:\nLogin: ${creds.login}\nTemporary password: ${creds.password}\n\nSign in at ${site} or the SolarOS app — you'll be asked to set your own password.` : '';
  return (
    <Sheet visible={!!creds} onClose={onClose} title={staff ? 'Login ready' : 'Portal login ready'}
      footer={<><Button title="Copy" kind="gray" style={{ flex: 1 }} onPress={async () => { await Clipboard.setStringAsync(message); toast('Copied'); }} /><Button title="WhatsApp" style={{ flex: 1 }} disabled={!creds?.phone} onPress={() => openWhatsApp(creds?.phone, message)} /></>}>
      <View style={{ paddingHorizontal: GUTTER, gap: space.m }}>
        <T variant="subhead" color="secondary">This password is shown once. {staff ? 'They' : 'The customer'} must change it at first sign-in.</T>
        <Section>
          <InfoRow label="Login" value={creds?.login} />
          <InfoRow label="Password" value={creds?.password} />
        </Section>
        {creds?.notified?.length ? <T variant="footnote" color="secondary">Also sent by {creds.notified.join(' and ')}.</T> : null}
      </View>
    </Sheet>
  );
};
