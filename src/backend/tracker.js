const { Server } = require('socket.io');

let io;
let onlineUsers = 0;

function initializeTracker(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        onlineUsers++;
        console.log(`User connected. Online users: ${onlineUsers}`);

        // Broadcast updated count to all clients
        io.emit('online-count', onlineUsers);

        socket.on('disconnect', () => {
            onlineUsers--;
            console.log(`User disconnected. Online users: ${onlineUsers}`);
            io.emit('online-count', onlineUsers);
        });
    });

    return io;
}

function getOnlineCount() {
    return onlineUsers;
}

module.exports = {
    initializeTracker,
    getOnlineCount
};
