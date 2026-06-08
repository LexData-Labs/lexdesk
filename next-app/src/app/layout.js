import './globals.css';

export const metadata = {
  title: 'LexDesk',
  description: 'Attendance, leave, and team management with role-based access',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
