<template>
  <div v-if="!currentRoom" class="room-manager-overlay">
    <div class="room-manager-modal">
      <h2>🎨 Web 协同画板</h2>
      <p class="subtitle">选择加入方式开始协作</p>

      <div class="room-actions">
        <!-- 创建新房间 -->
        <div class="action-card">
          <h3>创建新房间</h3>
          <p>创建一个新的协作空间</p>
          <button class="btn btn-primary" @click="createRoom">
            ➕ 创建房间
          </button>
        </div>

        <!-- 加入现有房间 -->
        <div class="action-card">
          <h3>加入现有房间</h3>
          <p>输入房间号加入协作</p>
          <input
            v-model="joinRoomId"
            type="text"
            placeholder="输入房间号 (例如: ABC123)"
            class="room-input"
            @keyup.enter="joinRoom"
          />
          <button 
            class="btn btn-secondary" 
            @click="joinRoom"
            :disabled="!joinRoomId.trim()"
          >
            🚪 加入房间
          </button>
        </div>
      </div>

      <!-- 最近的房间 -->
      <div v-if="recentRooms.length > 0" class="recent-rooms">
        <h4>最近使用的房间</h4>
        <div class="recent-room-list">
          <button
            v-for="room in recentRooms"
            :key="room"
            class="recent-room-btn"
            @click="joinRoomById(room)"
          >
            📁 {{ room }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- 房间信息栏 -->
  <div v-else class="room-info-bar">
    <div class="room-info">
      <span class="room-label">当前房间:</span>
      <span class="room-id">{{ currentRoom }}</span>
      <button class="btn-copy" @click="copyRoomId" title="复制房间号">
        📋
      </button>
      <button class="btn-leave" @click="leaveRoom">
        🚪 离开
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const emit = defineEmits<{
  (e: 'roomSelected', roomId: string): void;
  (e: 'roomLeft'): void;
}>();

const currentRoom = ref<string>('');
const joinRoomId = ref('');
const recentRooms = ref<string[]>([]);

// 生成随机房间号
const generateRoomId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// 创建房间
const createRoom = () => {
  const roomId = generateRoomId();
  joinRoomById(roomId);
};

// 加入房间
const joinRoom = () => {
  if (joinRoomId.value.trim()) {
    joinRoomById(joinRoomId.value.trim().toUpperCase());
  }
};

// 通过 ID 加入房间
const joinRoomById = (roomId: string) => {
  currentRoom.value = roomId;
  saveToRecent(roomId);
  emit('roomSelected', roomId);
};

// 离开房间
const leaveRoom = () => {
  if (confirm('确定要离开当前房间吗？未保存的更改将丢失。')) {
    currentRoom.value = '';
    joinRoomId.value = '';
    emit('roomLeft');
  }
};

// 复制房间号
const copyRoomId = () => {
  navigator.clipboard.writeText(currentRoom.value).then(() => {
    alert(`房间号已复制: ${currentRoom.value}\n分享给其他人即可协作！`);
  });
};

// 保存到最近使用
const saveToRecent = (roomId: string) => {
  const recent = JSON.parse(localStorage.getItem('recentRooms') || '[]');
  const filtered = recent.filter((id: string) => id !== roomId);
  filtered.unshift(roomId);
  const updated = filtered.slice(0, 5); // 只保留最近 5 个
  localStorage.setItem('recentRooms', JSON.stringify(updated));
  recentRooms.value = updated;
};

// 加载最近使用的房间
onMounted(() => {
  const recent = JSON.parse(localStorage.getItem('recentRooms') || '[]');
  recentRooms.value = recent;
});
</script>

<style scoped>
.room-manager-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.room-manager-modal {
  background: white;
  border-radius: 16px;
  padding: 40px;
  max-width: 600px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

h2 {
  margin: 0 0 8px 0;
  font-size: 32px;
  text-align: center;
  color: #1f2937;
}

.subtitle {
  text-align: center;
  color: #6b7280;
  margin: 0 0 32px 0;
}

.room-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 32px;
}

.action-card {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
}

.action-card h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #1f2937;
}

.action-card p {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #6b7280;
}

.room-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 12px;
  text-align: center;
  text-transform: uppercase;
  font-weight: 600;
}

.room-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.btn {
  width: 100%;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-secondary {
  background: #10b981;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
}

.btn-secondary:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.recent-rooms {
  border-top: 1px solid #e5e7eb;
  padding-top: 24px;
}

.recent-rooms h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.recent-room-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.recent-room-btn {
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.recent-room-btn:hover {
  background: #f3f4f6;
  border-color: #3b82f6;
  color: #3b82f6;
}

.room-info-bar {
  padding: 12px 16px;
  background: #f0f9ff;
  border-bottom: 2px solid #3b82f6;
  position: relative;
  z-index: 100;
}

.room-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.room-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.room-id {
  font-size: 16px;
  font-weight: 700;
  color: #3b82f6;
  font-family: monospace;
  background: white;
  padding: 4px 12px;
  border-radius: 6px;
}

.btn-copy {
  padding: 4px 8px;
  border: 1px solid #3b82f6;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-copy:hover {
  background: #3b82f6;
  transform: scale(1.1);
}

.btn-leave {
  padding: 6px 12px;
  border: 1px solid #ef4444;
  border-radius: 4px;
  background: white;
  color: #ef4444;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-leave:hover {
  background: #ef4444;
  color: white;
}
</style>
