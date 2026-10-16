<?php

namespace App\Enums;

enum StatusPengajuan: string
{
    case DIAJUKAN = 'DIAJUKAN';
    case DIVERIFIKASI_KOORD = 'DIVERIFIKASI_KOORD';
    case DITOLAK_KOORD = 'DITOLAK_KOORD';
    case DISETUJUI_KAPRODI = 'DISETUJUI_KAPRODI';
    case DITOLAK_KAPRODI = 'DITOLAK_KAPRODI';
    case DITOLAK_KEUANGAN = 'DITOLAK_KEUANGAN';
    case DANA_DICAIRKAN = 'DANA_DICAIRKAN';
    case SEDANG_DIBELANJAKAN = 'SEDANG_DIBELANJAKAN';
    case BARANG_DITERIMA = 'BARANG_DITERIMA';
    case LAPORAN_BELANJA_DIAJUKAN = 'LAPORAN_BELANJA_DIAJUKAN';
    case SELESAI = 'SELESAI';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::DIAJUKAN => 'Diajukan',
            self::DIVERIFIKASI_KOORD => 'Diverifikasi Koordinator',
            self::DITOLAK_KOORD => 'Ditolak Koordinator',
            self::DISETUJUI_KAPRODI => 'Disetujui Kaprodi',
            self::DITOLAK_KAPRODI => 'Ditolak Kaprodi',
            self::DITOLAK_KEUANGAN => 'Ditolak Keuangan',
            self::DANA_DICAIRKAN => 'Dana Dicairkan',
            self::SEDANG_DIBELANJAKAN => 'Sedang Dibelanjakan',
            self::BARANG_DITERIMA => 'Barang Diterima',
            self::LAPORAN_BELANJA_DIAJUKAN => 'Laporan Belanja Diajukan',
            self::SELESAI => 'Selesai',
        };
    }
}
