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
  admin: {
    dashboardTitle: "Dasbor",
    signedInAs: "Masuk sebagai",
  },
  common: {
    loading: "Memuat...",
  },
} as const;

export type Id = typeof id;
