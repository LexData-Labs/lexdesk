import './globals.css';

export const metadata = {
  title: 'LexDesk',
  description: 'Attendance, leave, and team management with role-based access',
};

export default function RootLayout({ children }) {
  // suppressHydrationWarning: browser extensions (e.g. QuillBot) inject
  // attributes into <html> before React hydrates; also the theme toggle sets
  // the 'light' class from localStorage. Applies to this tag only.
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
