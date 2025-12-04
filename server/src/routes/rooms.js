import express from 'express';
import { RoomService } from '../services/RoomService.js';
import { validateRoomId, validateCreateRoom } from '../middleware/validation.js';

const router = express.Router();

// 获取房间信息
router.get('/:roomId', validateRoomId, async (req, res) => {
  try {
    const room = await RoomService.getRoom(req.params.roomId);
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建房间
router.post('/', validateCreateRoom, async (req, res) => {
  try {
    const { roomId, name } = req.body;
    const room = await RoomService.createRoom(roomId, name);
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取房间操作历史
router.get('/:roomId/operations', validateRoomId, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const operations = await RoomService.getOperations(req.params.roomId, limit);
    res.json({ success: true, data: operations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
