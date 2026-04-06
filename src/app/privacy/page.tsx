/**
 * Privacy Policy Page - Redirects to unified policy
 * This page redirects to /politica-privacidad for consistency
 */

import { redirect } from 'next/navigation';

export default function PrivacyPage() {
  redirect('/politica-privacidad');
}
