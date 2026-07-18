"use client";

export default function AboutPage() {
  const terms = [
    "Appointments are subject to availability and confirmation.",
    "Please be available at the scheduled time.",
    "A 10-minute grace period is allowed. After that, a ₹10 per minute waiting charge will apply.",
    "Delays exceeding 30 minutes may result in cancellation without a refund.",
    "Last-minute cancellations or no-shows may incur up to 100% cancellation charges.",
    "Additional services requested during the appointment will be charged separately.",
    "Clients must inform us of any allergies, skin conditions, or medical concerns before the service.",
    "Please provide a clean, safe, and suitable space for the service.",
    "Parking, society entry, or valet charges (if applicable) are payable by the client.",
    "Full payment must be made immediately after the service unless prepaid.",
    "Misconduct, abusive behaviour, or an unsafe environment may lead to immediate termination of the service without a refund.",
    "By booking our services, you agree to these Terms & Conditions.",
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap');

        .ab-page {
          min-height: 100vh;
          background: #fafaf8;
          font-family: 'Inter', sans-serif;
        }

        .ab-header {
          background: #080808;
          padding: 64px 24px 56px;
          text-align: center;
          border-bottom: 1px solid rgba(201,168,76,0.15);
        }

        .ab-brand {
          font-family: 'Cormorant Garamond', serif;
          font-size: 15px;
          font-weight: 400;
          color: rgba(201,168,76,0.7);
          letter-spacing: 0.25em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }

        .ab-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(32px, 5vw, 52px);
          font-weight: 300;
          color: #fff;
          letter-spacing: 0.01em;
          line-height: 1.15;
          margin-bottom: 14px;
        }

        .ab-title span { color: #C9A84C; font-style: italic; }

        .ab-subtitle {
          font-size: 13.5px;
          color: rgba(255,255,255,0.35);
          letter-spacing: 0.04em;
        }

        .ab-body {
          max-width: 760px;
          margin: 0 auto;
          padding: 56px 24px 80px;
        }

        .ab-section-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #C9A84C;
          margin-bottom: 28px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ab-section-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(201,168,76,0.2);
        }

        .ab-prose { font-size: 15px; color: #3a3a3a; line-height: 1.85; margin-bottom: 22px; }
        .ab-prose strong { color: #080808; font-weight: 700; }

        .ab-promise {
          margin-top: 40px;
          padding: 26px 28px;
          background: linear-gradient(135deg, rgba(201,168,76,0.08), rgba(201,168,76,0.03));
          border: 1px solid rgba(201,168,76,0.25);
          border-radius: 12px;
          text-align: center;
        }

        .ab-promise-label {
          font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;
          color: #C9A84C; margin-bottom: 10px;
        }

        .ab-promise-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; font-weight: 500; color: #080808; line-height: 1.4;
        }

        .ab-divider {
          margin: 64px 0 48px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent);
        }

        .ab-list { display: flex; flex-direction: column; gap: 0; }

        .ab-item {
          display: flex; gap: 16px; padding: 18px 0;
          border-bottom: 1px solid rgba(0,0,0,0.06); align-items: flex-start;
        }
        .ab-item:last-child { border-bottom: none; }

        .ab-num {
          width: 26px; height: 26px; border-radius: 50%;
          background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 700; color: #C9A84C; flex-shrink: 0; margin-top: 1px;
        }

        .ab-text { font-size: 14.5px; color: #3a3a3a; line-height: 1.7; }

        .ab-footer-note {
          margin-top: 48px; padding: 20px 24px;
          background: rgba(201,168,76,0.05); border: 1px solid rgba(201,168,76,0.18);
          border-radius: 10px; font-size: 13px; color: #666; line-height: 1.65; text-align: center;
        }

        .ab-back {
          display: inline-flex; align-items: center; gap: 8px; margin-top: 36px;
          color: #C9A84C; font-size: 13px; font-weight: 600; letter-spacing: 0.05em;
          text-decoration: none; transition: opacity 0.2s;
        }
        .ab-back:hover { opacity: 0.7; }

        @media (max-width: 480px) {
          .ab-header { padding: 48px 16px 40px; }
          .ab-body { padding: 36px 16px 56px; }
          .ab-text, .ab-prose { font-size: 13.5px; }
          .ab-promise-text { font-size: 19px; }
        }
      `}</style>

      <div className="ab-page">
        {/* Header */}
        <div className="ab-header">
          <div className="ab-brand">Bella &amp; Guy · Home Beauty Service</div>
          <h1 className="ab-title">About <span>Us</span></h1>
          <p className="ab-subtitle">Home Salon Services · Wave City, Ghaziabad</p>
        </div>

        {/* Body */}
        <div className="ab-body">
          <div className="ab-section-label">Our Story</div>

          <p className="ab-prose">
            Founded in <strong>2020</strong>, <strong>Bella &amp; Guy Unisex Salon</strong> was created with a vision
            to redefine the salon experience by offering <strong>premium luxury services at affordable prices</strong>.
            We believe that exceptional beauty and grooming should be accessible without compromising on quality.
          </p>

          <p className="ab-prose">
            What truly sets us apart is our unwavering commitment to <strong>authenticity and transparency</strong>.
            We use only <strong>100% genuine, original products</strong> from trusted brands, and we welcome our
            clients to verify the products we use. Your trust is our greatest priority, and we believe complete
            transparency is the foundation of every lasting relationship.
          </p>

          <p className="ab-prose">
            Our team of skilled professionals is dedicated to delivering personalized services in a comfortable,
            hygienic, and luxurious environment. Whether it&apos;s a haircut, hair color, skincare, grooming, or
            beauty treatment, every service is performed with precision, care, and attention to detail.
          </p>

          <p className="ab-prose">
            At Bella &amp; Guy, we don&apos;t just help you look your best — we strive to make every visit a
            relaxing, memorable experience built on quality, honesty, and customer satisfaction.
          </p>

          <div className="ab-promise">
            <div className="ab-promise-label">Our Promise</div>
            <div className="ab-promise-text">Luxury. Authenticity. Affordability.<br />Trusted by every client, every visit.</div>
          </div>

          <div className="ab-divider" />

          {/* Terms & Conditions */}
          <div id="terms">
            <div className="ab-section-label">Terms &amp; Conditions</div>

            <div className="ab-list">
              {terms.map((term, i) => (
                <div key={i} className="ab-item">
                  <div className="ab-num">{i + 1}</div>
                  <p className="ab-text">{term}</p>
                </div>
              ))}
            </div>

            <div className="ab-footer-note">
              For any questions or concerns, contact us on WhatsApp at{" "}
              <a href="https://wa.me/919625928495" style={{ color: "#C9A84C", fontWeight: 600, textDecoration: "none" }}>
                +91 96259 28495
              </a>
              {" "}· Mon–Sun, 9:00 AM – 8:00 PM
            </div>
          </div>

          <a href="/" className="ab-back">← Back to Home</a>
        </div>
      </div>
    </>
  );
}
