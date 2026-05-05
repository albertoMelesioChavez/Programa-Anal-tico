import './globals.css';

export const metadata = {
    metadataBase: new URL('https://programa-anal-tico.vercel.app'),
    title: 'Programa Analítico de Artes 2025',
    description: 'Plataforma inteligente para la gestión, edición y creación de planeaciones analíticas de primaria (NEM).',
    openGraph: {
        title: 'Programa Analítico de Artes 2025',
        description: 'Generador inteligente de planeaciones analíticas NEM.',
        url: 'https://programa-anal-tico.vercel.app/',
        siteName: 'Programa Analítico de Artes',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 1200,
                alt: 'Programa Analítico de Artes 2025',
            },
        ],
        locale: 'es_MX',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Programa Analítico de Artes 2025',
        description: 'Generador inteligente de planeaciones analíticas NEM.',
        images: ['/og-image.png'],
    },
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
