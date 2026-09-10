import { useLocalSearchParams } from "expo-router";
import { Screen } from "../../../components/layout/screen";
import { Copy } from "../../../components/ui/primitives";
import { TaskEditor } from "../../../features/tasks/task-editor";
import { useWorkspace } from "../../../services/storage/workspace-provider";
export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useWorkspace();
  const task = data.tasks.find(item => item.id === id);
  return task ? <TaskEditor key={task.id} task={task} /> : <Screen title="Tarea no disponible" back><Copy>La tarea pudo haber sido eliminada.</Copy></Screen>;
}
