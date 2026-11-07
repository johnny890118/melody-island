import type { Metadata } from 'next';
import Proposal from '@/design/proposals/2026-11-07/Proposal';
export const metadata: Metadata = { title: 'Melody Island · 設計提案', robots: { index: false, follow: false } };
export default function DesignReview() { return <Proposal />; }
