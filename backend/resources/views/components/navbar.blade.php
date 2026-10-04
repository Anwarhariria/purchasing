@props([
    'title' => 'SPAKE',
    'userName' => auth()->user()->name ?? 'Pengguna',
    'userRole' => auth()->user()->role ?? 'Staf / Asdos',
    'unreadNotifCount' => 0,
    'logoutRoute' => route('logout') ?? '/logout',
])

<header class="sticky top-0 z-30 flex h-16 sm:h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur px-3 sm:px-6 xl:px-8 w-full dark:bg-slate-900/95 dark:border-slate-800">
    <!-- Brand / Mobile Toggle -->
    <div class="flex items-center gap-3 min-w-0">
        <button type="button" class="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Buka navigasi">
            <svg xmlns="http://www.w3.org/2000/svg" class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="4" x2="20" y1="12" y2="12"/>
                <line x1="4" x2="20" y1="6" y2="6"/>
                <line x1="4" x2="20" y1="18" y2="18"/>
            </svg>
        </button>
        <div class="font-black text-blue-600 sm:hidden text-base tracking-tight truncate">
            {{ $title }}
        </div>
    </div>

    <!-- Right Actions -->
    <div class="flex items-center gap-2 sm:gap-3 shrink-0">
        <!-- Notifikasi -->
        <button type="button" class="relative p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors" aria-label="Lihat Notifikasi">
            <svg xmlns="http://www.w3.org/2000/svg" class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            </svg>
            @if($unreadNotifCount > 0)
                <span class="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white ring-2 ring-white">
                    {{ $unreadNotifCount }}
                </span>
            @endif
        </button>

        <!-- Tombol Logout Statis & Netral (Bebas dari Class Aktif Biru / Focus Highlight) -->
        <form method="POST" action="{{ $logoutRoute }}" class="inline-block m-0 p-0">
            @csrf
            <button
                type="submit"
                class="inline-flex items-center justify-center h-8.5 sm:h-9 px-3 gap-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 shadow-xs focus:outline-none focus:ring-0 focus-visible:ring-0 active:scale-95 transition-colors cursor-pointer shrink-0 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-red-950/20 dark:hover:text-red-400 dark:hover:border-red-800"
                title="Keluar dari Sistem"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" x2="9" y1="12" y2="12"/>
                </svg>
                <span class="hidden sm:inline">Keluar</span>
            </button>
        </form>
    </div>
</header>
