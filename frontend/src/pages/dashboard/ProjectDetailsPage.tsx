import { useParams } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { ProjectModal } from '@/components/modals/ProjectModal';

export function ProjectDetailsPage() {
  const { id } = useParams();
  const { projects } = useData();
  const project = projects.find(p => p.id === id);
  if (!project) return <div className="p-8 text-center text-gray-500">Projet introuvable.</div>;
  return <ProjectModal project={project} isOpen={true} onClose={() => window.history.back()} />;
} 