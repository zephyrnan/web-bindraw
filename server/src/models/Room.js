import mongoose from 'mongoose';

/**
 * Shape 存储结构
 * 对应 shared-types.ts 中的 ShapeWrapper
 * 
 * 结构: { id: string, type: string, data: ShapeData }
 * 其中 data 包含完整的图形数据（x, y, width, height 等）
 */
const shapeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true }
}, { _id: false });

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    default: 'Untitled Room'
  },
  shapes: [shapeSchema],
  users: [{
    userId: String,
    name: String,
    color: String,
    joinedAt: Date
  }],
  version: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 添加方法：验证 shape 数据格式
roomSchema.methods.validateShape = function(shape) {
  if (!shape.id || !shape.type || !shape.data) {
    throw new Error('Invalid shape format: must have id, type, and data');
  }
  if (!shape.data.type || !shape.data.id) {
    throw new Error('Invalid shape.data format: must have type and id');
  }
  return true;
};

roomSchema.index({ updatedAt: 1 });

export const Room = mongoose.model('Room', roomSchema);
