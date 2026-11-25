function escapeHtml(value) {
  return String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateID(dateInput) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function printMedicalRecordPDF(record, fallback = {}) {
  if (typeof window === 'undefined' || !record) return;

  const logoUrl = `${window.location.origin}/guseocare-logo.png`;
  const patientName = record.patient_name || fallback.patientName || '-';
  const doctorName = record.doctor_name || fallback.doctorName || '-';
  const poliName = record.poli_name || fallback.poliName || '-';
  const visitDate = formatDateID(
    record.booking_date || record.apt_date || record.created_at
  );
  const printDate = formatDateID(new Date());
  const items = Array.isArray(record.prescription_items)
    ? record.prescription_items
    : Array.isArray(record.items)
    ? record.items
    : [];

  const prescriptionSection =
    record.prs_id && items.length > 0
      ? `
        <div class="section">
          <div class="section-title">
            Rincian Resep Obat (No. Resep #${escapeHtml(record.prs_id)})
            ${
              record.prescription_status
                ? `<span class="badge">${escapeHtml(record.prescription_status)}</span>`
                : ''
            }
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 8%;">No</th>
                <th style="width: 47%;">Nama Obat</th>
                <th style="width: 25%;">Kategori</th>
                <th style="width: 20%;">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${escapeHtml(item.medicine_name || item.name)}</strong></td>
                  <td style="text-transform: capitalize;">${escapeHtml(item.medicine_type || item.type || '-')}</td>
                  <td>${escapeHtml(item.quantity)} unit</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
      : `
        <div class="section">
          <div class="section-title">Rincian Resep Obat</div>
          <p class="empty-note">Tidak ada resep obat yang diterbitkan pada kunjungan ini.</p>
        </div>
      `;

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Rekam Medis #${escapeHtml(record.mr_id || record.apt_id)} - GuseoCare</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 32px 40px;
      font-size: 13px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2.5px solid #042f36;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand img {
      width: 52px;
      height: 52px;
      object-fit: contain;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.3px;
    }
    .brand-title .guseo { color: #042f36; }
    .brand-title .care { color: #00b08b; }
    .brand-sub {
      font-size: 11px;
      color: #475569;
      margin-top: 2px;
    }
    .doc-meta {
      text-align: right;
      font-size: 11px;
      color: #475569;
    }
    .doc-meta strong {
      display: block;
      font-size: 13px;
      color: #042f36;
      margin-bottom: 2px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 24px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }
    .info-item span {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #64748b;
      font-weight: 600;
    }
    .info-item strong {
      font-size: 13px;
      color: #0f172a;
    }
    .section {
      margin-bottom: 18px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #0f766e;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 5px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .badge {
      background: #f0fdfa;
      color: #0f766e;
      border: 1px solid #99f6e4;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 10px;
      text-transform: capitalize;
    }
    .clinical-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 10px;
    }
    .clinical-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 3px;
    }
    .clinical-value {
      font-size: 13px;
      color: #0f172a;
      white-space: pre-wrap;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 8px 10px;
      text-align: left;
      font-size: 12px;
    }
    th {
      background: #f1f5f9;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      font-size: 11px;
    }
    .empty-note {
      font-size: 12px;
      color: #64748b;
      font-style: italic;
    }
    .footer {
      margin-top: 36px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .disclaimer {
      font-size: 10px;
      color: #64748b;
      max-width: 58%;
    }
    .signature {
      text-align: center;
      min-width: 200px;
    }
    .signature .date {
      font-size: 11px;
      color: #475569;
      margin-bottom: 48px;
    }
    .signature .name {
      font-weight: 700;
      border-top: 1px solid #0f172a;
      padding-top: 4px;
      font-size: 12px;
    }
    @media print {
      body { padding: 0; }
      @page { margin: 16mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <img src="${logoUrl}" alt="Logo GuseoCare" />
      <div>
        <div class="brand-title"><span class="guseo">Guseo</span><span class="care">Care</span></div>
        <div class="brand-sub">RS Pendidikan Universitas Guseo • Sistem Informasi Manajemen Rumah Sakit</div>
      </div>
    </div>
    <div class="doc-meta">
      <strong>LEMBAR REKAM MEDIS &amp; RESEP</strong>
      <div>No. Rekam Medis: #${escapeHtml(record.mr_id || '-')}</div>
      <div>No. Janji Temu: #${escapeHtml(record.apt_id || '-')}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-item">
      <span>Nama Pasien</span>
      <strong>${escapeHtml(patientName)}</strong>
    </div>
    <div class="info-item">
      <span>Tanggal Kunjungan</span>
      <strong>${escapeHtml(visitDate)}</strong>
    </div>
    <div class="info-item">
      <span>Dokter Pemeriksa</span>
      <strong>${escapeHtml(doctorName)}</strong>
    </div>
    <div class="info-item">
      <span>Unit Poliklinik</span>
      <strong>${escapeHtml(poliName)}</strong>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Hasil Pemeriksaan Klinis</div>
    <div class="clinical-box">
      <div class="clinical-label">Diagnosis Medis</div>
      <div class="clinical-value"><strong>${escapeHtml(record.diagnosis)}</strong></div>
    </div>
    <div class="clinical-box">
      <div class="clinical-label">Tindakan Klinis</div>
      <div class="clinical-value">${escapeHtml(record.action || '-')}</div>
    </div>
    <div class="clinical-box">
      <div class="clinical-label">Catatan &amp; Anjuran Dokter</div>
      <div class="clinical-value">${escapeHtml(record.notes || '-')}</div>
    </div>
  </div>

  ${prescriptionSection}

  <div class="footer">
    <div class="disclaimer">
      Dokumen ini diterbitkan secara elektronik melalui sistem GuseoCare RS Pendidikan Universitas Guseo
      sebagai bukti sah hasil konsultasi medis dan penebusan resep farmasi.
    </div>
    <div class="signature">
      <div class="date">Makassar, ${escapeHtml(printDate)}</div>
      <div class="name">${escapeHtml(doctorName)}</div>
    </div>
  </div>

  <script>
    window.onload = function () {
      setTimeout(function () {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;

  const printWin = window.open('', '_blank', 'width=900,height=700');
  if (!printWin) {
    alert('Pop-up diblokir oleh browser. Izinkan pop-up untuk mencetak PDF.');
    return;
  }
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
}