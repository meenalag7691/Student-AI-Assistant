import mongoose from 'mongoose';

const StudySessionSchema = new mongoose.Schema({
  problem: { type: String, required: true },
  category: { type: String, default: 'General' },
  advice: { type: String, required: true },
  actionSteps: [{ type: String }],
  isLiveAi: { type: Boolean, default: false },
  model: { type: String, default: 'gemini-2.5-flash' },
  isFavorite: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const StudySession = mongoose.models.StudySession || mongoose.model('StudySession', StudySessionSchema);
