@props([
    'action' => null,
    'resetUrl' => null,
    'startMonth' => request('start_month', 1),
    'startYear' => request('start_year', date('Y')),
    'endMonth' => request('end_month', date('n')),
    'endYear' => request('end_year', date('Y')),
    'years' => [date('Y') + 1, date('Y'), date('Y') - 1, date('Y') - 2],
])

@php
    $months = [
        1 => 'Januari',
        2 => 'Februari',
        3 => 'Maret',
        4 => 'April',
        5 => 'Mei',
        6 => 'Juni',
        7 => 'Juli',
        8 => 'Agustus',
        9 => 'September',
        10 => 'Oktober',
        11 => 'November',
        12 => 'Desember',
    ];
    $actionUrl = $action ?? url()->current();
    $resetTarget = $resetUrl ?? url()->current();
@endphp

<form method="GET" action="{{ $actionUrl }}" class="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-slate-200 bg-white/90 dark:bg-slate-900/90 dark:border-slate-800 shadow-sm text-xs">
    <!-- Label Periode -->
    <div class="flex items-center gap-1.5 px-2 text-xs font-bold text-slate-700 dark:text-slate-300">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
        </svg>
        <span>Rentang Periode:</span>
    </div>

    <!-- Dropdown Periode Awal: Bulan & Tahun -->
    <div class="flex items-center gap-1.5">
        <select name="start_month" aria-label="Bulan Awal" class="h-8.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
            @foreach($months as $num => $name)
                <option value="{{ $num }}" {{ (string)$startMonth === (string)$num ? 'selected' : '' }}>
                    {{ $name }}
                </option>
            @endforeach
        </select>

        <select name="start_year" aria-label="Tahun Awal" class="h-8.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
            @foreach($years as $yr)
                <option value="{{ $yr }}" {{ (string)$startYear === (string)$yr ? 'selected' : '' }}>
                    {{ $yr }}
                </option>
            @endforeach
        </select>
    </div>

    <!-- Teks Pemisah s/d -->
    <span class="px-1 text-xs font-bold text-slate-500 dark:text-slate-400">s/d</span>

    <!-- Dropdown Periode Akhir: Bulan & Tahun -->
    <div class="flex items-center gap-1.5">
        <select name="end_month" aria-label="Bulan Akhir" class="h-8.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
            @foreach($months as $num => $name)
                <option value="{{ $num }}" {{ (string)$endMonth === (string)$num ? 'selected' : '' }}>
                    {{ $name }}
                </option>
            @endforeach
        </select>

        <select name="end_year" aria-label="Tahun Akhir" class="h-8.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
            @foreach($years as $yr)
                <option value="{{ $yr }}" {{ (string)$endYear === (string)$yr ? 'selected' : '' }}>
                    {{ $yr }}
                </option>
            @endforeach
        </select>
    </div>

    <!-- Tombol Aksi: Terapkan & Reset -->
    <div class="flex items-center gap-1.5 ml-auto sm:ml-2">
        <button type="submit" class="inline-flex items-center justify-center h-8.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer">
            Terapkan
        </button>

        @if(request()->hasAny(['start_month', 'start_year', 'end_month', 'end_year']))
            <a href="{{ $resetTarget }}" class="inline-flex items-center justify-center h-8.5 px-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 cursor-pointer" title="Reset Filter Rentang">
                Reset
            </a>
        @endif
    </div>
</form>
