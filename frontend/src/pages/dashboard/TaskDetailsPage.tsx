import { useParams } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { TaskModal } from '@/components/modals/TaskModal';

export function TaskDetailsPage() {
  const { id } = useParams();
  const { tasks } = useData();
  const task = tasks.find(t => t.id === id);
  if (!task) return <div className="p-8 text-center text-gray-500">Tâche introuvable.</div>;
  return <TaskModal task={task} onClose={() => window.history.back()} />;
} 