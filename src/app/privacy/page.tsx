import type { Metadata } from 'next';
import Link from 'next/link';
import { PrivacyPolicy } from '@/components/privacy-policy';

export const metadata: Metadata = { title: 'Privacy · Sudoclue' };

export default function Privacy() {
  return <main className="app privacy-page"><Link className="lesson-back" href="/"><span aria-hidden="true">‹ </span><span>Sudoclue</span></Link><h1>Privacy</h1><PrivacyPolicy headingLevel={2}/></main>;
}
