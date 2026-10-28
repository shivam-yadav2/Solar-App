import React from 'react';
import { AccountScreen } from '../../src/features/account/AccountScreen';

/** Older menu link: password, two-factor and devices now live on the Account screen. */
export default function AccountSecurityRoute() {
  return <AccountScreen />;
}
