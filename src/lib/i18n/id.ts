/**
 * Indonesian UI dictionary. Keep every UI label here instead of inlining
 * strings in components, so wording stays easy to change (or to translate:
 * add a sibling `en.ts` with the same shape). Grouped by area.
 */
export const id = {
  nav: {
    home: "Beranda",
    dashboard: "Dasbor",
  },
  auth: {
    loginTitle: "Masuk",
    loginDescription: "Masuk untuk melanjutkan.",
    email: "Email",
    emailPlaceholder: "admin@example.com",
    password: "Kata Sandi",
    passwordPlaceholder: "Kata sandi Anda",
    submit: "Masuk",
    submitting: "Sedang masuk...",
    signOut: "Keluar",
    invalidCredentials: "Email atau kata sandi salah.",
    genericError: "Terjadi kesalahan. Coba lagi.",
    emailRequired: "Email wajib diisi.",
    emailInvalid: "Format email tidak valid.",
    passwordRequired: "Kata sandi wajib diisi.",
    passwordMinLength: "Kata sandi minimal 8 karakter.",
  },
  app: {
    title: "Device Mapper",
    description:
      "Pemetaan dan progres instalasi perangkat jaringan di atas peta satelit.",
  },
  status: {
    not_installed: "Belum terinstall",
    partial: "Terinstall sebagian",
    installed_untested: "Terinstall, belum diuji",
    tested: "Sudah diuji",
  },
  partialComponent: {
    power: "Power",
    fo: "FO",
    ethernet: "Ethernet",
  },
  role: {
    admin: "Admin",
    guest: "Tamu",
  },
  admin: {
    dashboardTitle: "Dasbor",
    signedInAs: "Masuk sebagai",
    role: "Peran",
  },
  common: {
    loading: "Memuat...",
    save: "Simpan",
    saving: "Menyimpan...",
    cancel: "Batal",
    edit: "Edit",
    delete: "Hapus",
    back: "Kembali",
    genericError: "Terjadi kesalahan. Coba lagi.",
    forbidden: "Anda tidak memiliki izin untuk tindakan ini.",
    unauthorized: "Sesi berakhir. Silakan masuk kembali.",
  },
  dashboard: {
    title: "Zona",
    newZone: "Zona baru",
    empty: "Belum ada zona.",
    emptyAdmin: "Belum ada zona. Buat zona pertama Anda.",
    totalDevices: "Total titik",
    routers: "Router",
    testedPercent: "Sudah diuji",
    noDescription: "Tanpa deskripsi",
    progressLabel: "Progres instalasi",
  },
  zone: {
    newTitle: "Zona baru",
    editTitle: "Edit zona",
    name: "Nama zona",
    namePlaceholder: "Pusri 2B",
    description: "Deskripsi",
    descriptionPlaceholder: "Deskripsi singkat zona",
    nameRequired: "Nama zona wajib diisi.",
    nameTooLong: "Nama zona maksimal 100 karakter.",
    descriptionTooLong: "Deskripsi maksimal 1000 karakter.",
    nameTaken: "Nama zona sudah dipakai.",
    notFound: "Zona tidak ditemukan.",
    created: "Zona dibuat.",
    updated: "Zona disimpan.",
    deleted: "Zona dihapus.",
    staleWrite:
      "Data zona diubah oleh pengguna lain. Perubahan Anda tetap disimpan.",
    boundary: "Batas zona",
    boundaryHint:
      "Gambar polygon batas zona di peta. Boleh dikosongkan dan digambar kemudian.",
    boundaryInvalid: "Batas zona tidak valid.",
    noBoundary: "Batas zona belum digambar.",
    drawBoundary: "Gambar batas",
    editBoundary: "Ubah bentuk",
    removeBoundary: "Hapus batas",
    dangerTitle: "Hapus zona",
    dangerDescription:
      "Menghapus zona juga menghapus seluruh perangkat di dalamnya. Tindakan ini tidak dapat dibatalkan.",
    deleteConfirmTitle: "Hapus zona ini?",
    deleteConfirmPrompt: "Ketik nama zona untuk mengonfirmasi:",
    deleteConfirmMismatch: "Nama zona tidak cocok.",
    deleteConfirmAction: "Hapus zona",
    mapPlaceholder: "Perangkat akan ditampilkan di sini pada tahap berikutnya.",
  },
  map: {
    loading: "Memuat peta...",
  },
} as const;

export type Id = typeof id;
