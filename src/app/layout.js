import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: '네이처요양병원 교육관리시스템',
  description: '교육 참석 서명, 교육실시계획서, 교육결과보고서 원스톱 관리 시스템',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>
        <Navbar />
        <main style={{ flex: 1, paddingBottom: 40 }}>
          {children}
        </main>
      </body>
    </html>
  );
}
