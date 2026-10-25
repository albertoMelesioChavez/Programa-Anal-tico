'use client';

import { useParams } from 'next/navigation';
import ProjectWizard from '@/components/ProjectWizard';

export default function EditarProyectoPage() {
    const { id } = useParams();
    return <ProjectWizard projectId={id} />;
}
