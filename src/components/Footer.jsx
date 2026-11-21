import Link from 'next/link';

export default function Footer() {
  return (
    <footer id="kontak" className="bg-teal-600 text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Kolom 1: Logo & Alamat */}
          <div className="space-y-4">
            <Link href="/#beranda" className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
                <img
                  src="/guseocare-logo.ico"
                  alt="Logo GuseoCare"
                  className="h-full w-full scale-125 object-contain"
                />
              </div>
              <div>
                <span className="block text-lg font-bold tracking-tight text-white">
                  GuseoCare
                </span>
                <span className="block text-[11px] font-medium uppercase tracking-wider text-teal-100">
                  RS Pendidikan Universitas Guseo
                </span>
              </div>
            </Link>

            <p className="text-sm font-medium leading-relaxed text-teal-50">
              Jl. Perintis Kemerdekaan Km. 10,
              <br />
              Tamalanrea, Makassar,
              <br />
              Sulawesi Selatan 90245
            </p>
          </div>

          {/* Kolom 2: Navigasi (Sama dengan Navbar) */}
          <div>
            <h3 className="text-base font-bold tracking-tight text-white">
              Navigasi
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-teal-50">
              <li>
                <Link
                  href="/#beranda"
                  className="transition hover:text-white hover:underline"
                >
                  Beranda
                </Link>
              </li>
              <li>
                <Link
                  href="/#layanan"
                  className="transition hover:text-white hover:underline"
                >
                  Layanan Poli
                </Link>
              </li>
              <li>
                <Link
                  href="/#dokter"
                  className="transition hover:text-white hover:underline"
                >
                  Direktori Dokter
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="transition hover:text-white hover:underline"
                >
                  Portal Pasien / Masuk
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolom 3: Hubungi Kami (Contact Person) */}
          <div>
            <h3 className="text-base font-bold tracking-tight text-white">
              Hubungi Kami
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-teal-50">
              <li>
                <span className="block text-xs text-teal-200">Email Resmi</span>
                <a
                  href="mailto:info@guseocare.ac.id"
                  className="font-medium hover:text-white hover:underline"
                >
                  info@guseocare.ac.id
                </a>
              </li>
              <li>
                <span className="block text-xs text-teal-200">
                  Call Center &amp; IGD (24 Jam)
                </span>
                <span className="font-medium">(0411) 583-333 / 582-888</span>
              </li>
              <li>
                <span className="block text-xs text-teal-200">
                  WhatsApp Layanan Pasien
                </span>
                <span className="font-medium">0811-5092-222</span>
              </li>
            </ul>
          </div>

          {/* Kolom 4: Jam Besuk */}
          <div>
            <h3 className="text-base font-bold tracking-tight text-white">
              Jam Besuk
            </h3>
            <div className="mt-4 space-y-3 text-sm text-teal-50">
              <p className="font-medium">Senin - Minggu</p>
              <p className="font-semibold text-white">16:00 - 20:00 WITA</p>
              <p className="text-xs leading-relaxed text-white">
                Anak berusia di bawah 10 tahun tidak diperkenankan masuk ke area
                rawat inap.
              </p>
            </div>
          </div>
        </div>

        {/* Garis Pemisah & Copyright */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-teal-700 pt-6 text-xs text-teal-100 sm:flex-row">
          <p>
            Copyright &copy; {new Date().getFullYear()} GuseoCare - RS
            Pendidikan Universitas Guseo.
          </p>
          <p>Syarat & Ketentuan | Kebijakan Privasi</p>
        </div>
      </div>
    </footer>
  );
}