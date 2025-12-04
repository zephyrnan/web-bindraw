import mongoose from 'mongoose';

const operationSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  userId: String,
  type: {
    type: String,
    enum: ['add-shape', 'update-shape', 'delete-shape', 'move-shape', 'resize-shape', 'rotate-shape'],
    required: true
  },
  data: mongoose.Schema.Types.Mixed,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

operationSchema.index({ roomId: 1, timestamp: -1 });

export const Operation = mongoose.model('Operation', operationSchema);
