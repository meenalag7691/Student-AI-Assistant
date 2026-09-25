import mongoose from 'mongoose';

const StudyGoalSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: String, default: 'General' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  completed: { type: Boolean, default: false },
  pomodorosTarget: { type: Number, default: 2 },
  pomodorosDone: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const StudyGoal = mongoose.models.StudyGoal || mongoose.model('StudyGoal', StudyGoalSchema);
