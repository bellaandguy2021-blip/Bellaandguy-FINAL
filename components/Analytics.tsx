import Script from "next/script";
import { getPublicSettings } from "@/lib/settings";

/**
 * Analytics integration points — GA4, GTM, Microsoft Clarity, Meta Pixel.
 * Each activates only when its ID is set in the admin panel's SEO tab
 * (settings table), so the app ships zero third-party JS until the client
 * actually configures a tracker. Google Search Console verification is a
 * plain meta tag handled in layout metadata (`seo_google_verification`).
 *
 * All scripts load `afterInteractive` so they never block LCP/FCP.
 */
export default async function Analytics() {
  const s = await getPublicSettings();

  const ga4 = s.seo_ga4_id?.trim();          // e.g. G-XXXXXXXXXX
  const gtm = s.seo_gtm_id?.trim();          // e.g. GTM-XXXXXXX
  const clarity = s.seo_clarity_id?.trim();  // e.g. abcdefghij
  const metaPixel = s.seo_meta_pixel_id?.trim();

  if (!ga4 && !gtm && !clarity && !metaPixel) return null;

  return (
    <>
      {gtm && (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}
        </Script>
      )}
      {ga4 && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4}');`}
          </Script>
        </>
      )}
      {clarity && (
        <Script id="clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarity}");`}
        </Script>
      )}
      {metaPixel && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixel}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
