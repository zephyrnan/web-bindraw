import { Room } from '../models/Room.js';
import { Operation } from '../models/Operation.js';

export class RoomService {
  static async createRoom(roomId, name = 'Untitled Room') {
    const room = new Room({ roomId, name });
    await room.save();
    return room;
  }

  static async getRoom(roomId) {
    let room = await Room.findOne({ roomId });
    if (!room) {
      room = await this.createRoom(roomId);
    }
    return room;
  }

  static async updateRoom(roomId, updates) {
    const room = await Room.findOneAndUpdate(
      { roomId },
      { ...updates, updatedAt: Date.now(), $inc: { version: 1 } },
      { new: true, upsert: true }
    );
    return room;
  }

  static async addShape(roomId, shapeData) {
    const room = await Room.findOneAndUpdate(
      { roomId },
      { 
        $push: { 
          shapes: {
            id: shapeData.id,
            type: shapeData.type,
            data: shapeData.data
          }
        },
        updatedAt: Date.now(),
        $inc: { version: 1 }
      },
      { new: true, upsert: true }
    );
    console.log(`[RoomService] Shape added to room ${roomId}, total shapes: ${room.shapes.length}`);
    return room;
  }

  static async updateShape(roomId, shapeId, updates) {
    const room = await Room.findOneAndUpdate(
      { roomId, 'shapes.id': shapeId },
      { 
        $set: { 'shapes.$.data': updates },
        updatedAt: Date.now(),
        $inc: { version: 1 }
      },
      { new: true }
    );
    return room;
  }

  static async deleteShape(roomId, shapeId) {
    const room = await Room.findOneAndUpdate(
      { roomId },
      { 
        $pull: { shapes: { id: shapeId } },
        updatedAt: Date.now(),
        $inc: { version: 1 }
      },
      { new: true }
    );
    return room;
  }

  static async addUser(roomId, user) {
    const room = await Room.findOneAndUpdate(
      { roomId },
      { 
        $addToSet: { users: { ...user, joinedAt: new Date() } },
        updatedAt: Date.now()
      },
      { new: true, upsert: true }
    );
    return room;
  }

  static async removeUser(roomId, userId) {
    const room = await Room.findOneAndUpdate(
      { roomId },
      { 
        $pull: { users: { userId } },
        updatedAt: Date.now()
      },
      { new: true }
    );
    return room;
  }

  static async saveOperation(roomId, userId, type, data) {
    const operation = new Operation({ roomId, userId, type, data });
    await operation.save();
    return operation;
  }

  static async getOperations(roomId, limit = 100) {
    return await Operation.find({ roomId })
      .sort({ timestamp: -1 })
      .limit(limit);
  }
}
