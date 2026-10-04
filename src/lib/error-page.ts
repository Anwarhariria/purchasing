export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <title>Kendala Memuat Halaman - SPAKE ASAINDO</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/logo-asaindo.png" type="image/png" />
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        background: #f8fafc;
        color: #1e293b;
        display: grid;
        place-items: center;
        min-height: 100vh;
        margin: 0;
        padding: 1.5rem;
        box-sizing: border-box;
      }
      .card {
        max-width: 28rem;
        width: 100%;
        text-align: center;
        padding: 2.5rem 2rem;
        background: #ffffff;
        border-radius: 1rem;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      }
      .logo {
        width: 60px;
        height: 60px;
        object-fit: contain;
        margin-bottom: 1rem;
      }
      .badge {
        display: inline-block;
        font-size: 0.75rem;
        font-weight: 600;
        background: #fef2f2;
        color: #991b1b;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        margin-bottom: 1rem;
      }
      h1 {
        font-size: 1.25rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 0.5rem;
      }
      p {
        color: #64748b;
        font-size: 0.925rem;
        line-height: 1.5;
        margin: 0 0 1.75rem;
      }
      .actions {
        display: flex;
        gap: 0.75rem;
        justify-content: center;
        flex-wrap: wrap;
      }
      a, button {
        padding: 0.625rem 1.25rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        border: 1px solid transparent;
        transition: all 0.2s;
      }
      .primary {
        background: #1e3a8a;
        color: #ffffff;
      }
      .primary:hover {
        background: #172554;
      }
      .secondary {
        background: #ffffff;
        color: #334155;
        border-color: #cbd5e1;
      }
      .secondary:hover {
        background: #f1f5f9;
      }
      .footer {
        margin-top: 2rem;
        font-size: 0.75rem;
        color: #94a3b8;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <img src="/logo-asaindo.png" alt="Logo ASAINDO" class="logo" />
      <div>
        <span class="badge">SPAKE • Universitas Asa Indonesia</span>
      </div>
      <h1>Terjadi Kendala Memuat Halaman</h1>
      <p>Sistem Pengadaan Kampus ASAINDO mendeteksi adanya kendala saat memproses halaman ini. Silakan muat ulang atau kembali ke beranda.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Muat Ulang Halaman</button>
        <a class="secondary" href="/">Kembali ke Beranda</a>
      </div>
      <div class="footer">
        Universitas Asa Indonesia • D3 Perhotelan &copy; 2026
      </div>
    </div>
  </body>
</html>`;
}
