import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLocale, localizedPath } from '@/lib/locales';
import { descriptions, publicMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return publicMetadata(locale, '/about', locale === 'en' ? 'About Melody Island' : '關於 Melody Island');
}

export default async function About({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const en = locale === 'en';
  return (
    <main id="main-content" className="public-about">
      <h1>{en ? 'Listen together on Melody Island' : '在 Melody Island 同步共聽'}</h1>
      <p>{descriptions[locale]}</p>
      <h2>{en ? 'How do I create an island?' : '如何開闢島嶼？'}</h2>
      <p>{en ? 'Sign in with Google, name your island, and set a password. Share the invite link and password with your friends.' : '使用 Google 登入，設定島嶼名稱與密碼，再把邀請連結和密碼分享給朋友。'}</p>
      <h2>{en ? 'Can friends join without an account?' : '朋友需要帳號才能加入嗎？'}</h2>
      <p>{en ? 'Guests can open an invite link or enter the island ID and password. They do not need a Google account.' : '朋友可以開啟邀請連結，或輸入島嶼 ID 與密碼加入，無須 Google 帳號。'}</p>
      <h2>{en ? 'How does shared playback work?' : '共聽如何同步？'}</h2>
      <p>{en ? 'Everyone in the room follows the same song and playback position. If your browser requires a gesture, select Start listening to enable sound.' : '同一座島嶼的聽友會跟隨同一首歌與播放進度。如果瀏覽器需要手動啟用聲音，按「開始聆聽」即可。'}</p>
      <Link href={localizedPath(locale, '/')}>{en ? 'Back to Melody Island' : '回到 Melody Island'}</Link>
    </main>
  );
}
