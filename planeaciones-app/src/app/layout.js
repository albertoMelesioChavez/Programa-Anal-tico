import './globals.css';

export const metadata = {
    title: 'Planeaciones de Artes NEM 2025',
    description: 'Generador rápido de planeaciones analíticas para artes en educación primaria (Sinaloa).',
};

export default function RootLayout({ children }) {
    return (
        <html lang="es">
            <body className="antialiased">
                {children}
            </body>
        </html>
    );
}
