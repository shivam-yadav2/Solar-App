import React from 'react';
import { useAuth } from '../../src/context/AuthContext';
import { StaffHome } from '../../src/features/home/StaffHome';
import { CustomerHome } from '../../src/features/home/CustomerHome';
import { PlatformHome } from '../../src/features/home/PlatformHome';

/** First tab: the right home for who is signed in. */
export default function HomeTab() {
  const { user, tenant } = useAuth();
  if (user?.role === 'SUPER_ADMIN' && !tenant) return <PlatformHome />;
  if (user?.role === 'CUSTOMER') return <CustomerHome />;
  return <StaffHome />;
}
