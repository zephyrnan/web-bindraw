import mongoose from 'mongoose';

export async function connectDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    // 验证连接字符串格式
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      throw new Error('Invalid MongoDB connection string format');
    }

    // 检查是否是示例配置
    if (mongoUri.includes('username:password@cluster')) {
      console.warn('⚠️  Warning: MongoDB URI appears to be a template.');
      console.warn('⚠️  Please update server/.env with your actual MongoDB Atlas credentials.');
      console.warn('⚠️  Get your connection string from: https://cloud.mongodb.com/');
    }

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // 5秒超时
      socketTimeoutMS: 45000,
    });

    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('💡 Tip: Check your .env file and ensure MONGODB_URI is correctly set');
    console.error('💡 For MongoDB Atlas: https://cloud.mongodb.com/');

    // 不退出进程，允许应用继续运行（使用内存存储）
    console.warn('⚠️  Server will continue without database persistence');
  }
}

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err.message);
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});
