import './globals.css';

export const metadata = {
  title: 'Nguyễn Minh Danh — Neon Archive',
  description: 'Interactive portfolio of Nguyễn Minh Danh, IT student and developer.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
