import './globals.css';

export const metadata = {
    metadataBase: new URL('https://programa-anal-tico.vercel.app'),
    title: 'Gestión del aula',
    description: 'Plataforma inteligente para la gestión, edición y creación de planeaciones analíticas de primaria (NEM).',
    openGraph: {
        title: 'Gestión del aula',
        description: 'Generador inteligente de planeaciones analíticas NEM.',
        url: 'https://programa-anal-tico.vercel.app/',
        siteName: 'Gestión del aula',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 1200,
                alt: 'Gestión del aula',
            },
        ],
        locale: 'es_MX',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Gestión del aula',
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
