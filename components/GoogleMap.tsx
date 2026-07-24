export default function GoogleMap() {
  return (
    <section aria-labelledby="find-us-heading" style={{ background: "#FAF7F0", padding: "80px 24px" }}>
      <div className="max-w-6xl mx-auto">

        <h2 id="find-us-heading" className="text-4xl font-bold text-center text-black mb-10">
          Find Us
        </h2>

        <div className="rounded-2xl overflow-hidden shadow-xl">

          <iframe
            src="https://www.google.com/maps?q=Wave+Galleria+Shopping+Complex+Wave+City+Ghaziabad&output=embed"
            title="Bella & Guy Salon location — Wave Galleria Shopping Complex, Wave City, Ghaziabad"
            width="100%"
            height="450"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            style={{ border: 0 }}
          />

        </div>

      </div>
    </section>
  );
}