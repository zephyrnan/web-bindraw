export const validateRoomId = (req, res, next) => {
  const { roomId } = req.params;
  
  if (!roomId || roomId.length < 3) {
    return res.status(400).json({
      success: false,
      error: 'Room ID must be at least 3 characters long'
    });
  }
  
  next();
};

export const validateCreateRoom = (req, res, next) => {
  const { name } = req.body;
  
  if (name && typeof name !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Room name must be a string'
    });
  }
  
  next();
};