import './globals.css';

export const metadata = {
  title: 'LexDesk',
  description: 'Attendance, leave, and team management with role-based access',
};

export default function RootLayout({ children }) {
  // suppressHydrationWarning: browser extensions (e.g. QuillBot, Grammarly,
  // ColorZilla) inject attributes into <html> AND <body> before React hydrates;
  // the theme toggle also sets the 'light' class on <html> from localStorage.
  // The flag only suppresses each element's OWN attribute/text mismatches — it
  // does not cascade, so real mismatches inside {children} are still reported.
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
