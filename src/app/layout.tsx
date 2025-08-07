export const metadata = {
  title: 'My App',
  description: 'Simple signup page with HTML & CSS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
