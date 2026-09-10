type AcademicRecord = { credits: number; currentGrade: number; progress: number };
export function summarizeAcademics(subjects: AcademicRecord[]) {
  const credits = subjects.reduce((total, subject) => total + subject.credits, 0);
  if (!credits) return { credits: 0, averageGrade: null, progress: 0 };
  const weightedGrade = subjects.reduce((total, subject) => total + subject.currentGrade * subject.credits, 0);
  const weightedProgress = subjects.reduce((total, subject) => total + subject.progress * subject.credits, 0);
  return { credits, averageGrade: Math.round(weightedGrade / credits), progress: Math.round(weightedProgress / credits) };
}
