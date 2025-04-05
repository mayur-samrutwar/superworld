import { Server } from 'socket.io';

// Track connected clients with their user IDs
const clients = new Map();

// Store verification results by userId - persists across socket connections
const verificationResults = new Map();

// Map Self Protocol status to our app status
const mapSelfStatusToAppStatus = (selfStatus) => {
  switch (selfStatus) {
    case 'proof_verified':
      return {
        status: 'verified',
        data: { verifiedAt: new Date().toISOString() }
      };
    case 'proof_generation_failed':
      return {
        status: 'rejected',
        error: 'Verification failed'
      };
    case 'proof_generation_started':
    case 'proof_generated':
      return {
        status: 'pending',
        message: 'Verification is in progress'
      };
    default:
      return {
        status: 'pending',
        message: 'Waiting for verification'
      };
  }
};

const SocketHandler = (req, res) => {
  if (res.socket.server.io) {
    console.log('Socket is already running');
    res.end();
    return;
  }

  console.log('Setting up socket.io server...');
  const io = new Server(res.socket.server);
  res.socket.server.io = io;
  
  // Store io instance in global for access from other API routes
  global.io = io;

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle client registration with userId
    socket.on('register', (userId) => {
      console.log(`User ${userId} registered with socket ${socket.id}`);
      
      // Store the client connection
      clients.set(userId, socket.id);
      
      // Check if we already have results for this user
      if (verificationResults.has(userId)) {
        const result = verificationResults.get(userId);
        console.log(`Sending stored verification result to user ${userId}:`, result);
        socket.emit('verification_status', result);
      }
    });

    // Handle Self Protocol compatible mobile_status events
    socket.on('mobile_status', (data) => {
      console.log('Received mobile_status event:', data);
      if (data.sessionId) {
        // Find the userId associated with this sessionId
        // In a real implementation, you would look this up in your database
        // For now, we're treating sessionId as userId for simplicity
        const userId = data.sessionId;
        const mappedStatus = mapSelfStatusToAppStatus(data.status);
        
        // Store the result
        verificationResults.set(userId, mappedStatus);
        
        // Try to notify any connected clients
        const socketId = clients.get(userId);
        if (socketId) {
          io.to(socketId).emit('verification_status', mappedStatus);
        }
      }
    });

    // Handle client disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      // Remove client from tracking
      for (const [userId, socketId] of clients.entries()) {
        if (socketId === socket.id) {
          clients.delete(userId);
          console.log(`Removed user ${userId} from tracking`);
          break;
        }
      }
    });
  });

  console.log('Socket.io server started');
  res.end();
};

export default SocketHandler;

// Export helper functions that can be imported by other API routes
export const notifyClient = (userId, result) => {
  // Store result regardless of socket connection status
  console.log(`Storing verification result for userId ${userId}:`, result);
  verificationResults.set(userId, result);
  
  // Check if io is available either from global or socket server
  const io = global.io;
  if (!io) {
    console.log(`Socket.io not initialized, result stored for later delivery`);
    return false;
  }
  
  const socketId = clients.get(userId);
  if (!socketId) {
    console.log(`Client with userId ${userId} not connected, result stored for later delivery`);
    return false;
  }
  
  console.log(`Notifying client ${userId} about verification:`, result);
  io.to(socketId).emit('verification_status', result);
  return true;
};

// Add a function to retrieve stored verification results
export const getStoredVerificationResult = (userId) => {
  if (verificationResults.has(userId)) {
    return verificationResults.get(userId);
  }
  return null;
}; 