import net from 'net';


const client = new net.Socket();
// const HEARTBEAT_INTERVAL = 5000; // 5 seconds
// const HEARTBEAT_TIMEOUT = 7000; // 7 seconds
// let heartbeatTimer;
// let heartbeatTimeout;
const KEEP_ALIVE_INTERVAL = 1000; // 1 second
client.setKeepAlive(true, KEEP_ALIVE_INTERVAL);
client.connect(8010, '192.168.132.20', () => {
    console.log('Connected to server');

    // client.setKeepAlive(true, 10000); // 10 seconds for TCP keep-alive
    // startHeartbeat();
});
client.on('data', (data) => {
    console.log('Received: ' + data);
});

client.on('close', () => {
    console.log('Connection closed');
});

client.on('error', (err) => {
    console.log('Error: ' + err.message);
    if (err.code === 'ECONNRESET' || err.code === 'ENETDOWN' || err.code === 'ENETUNREACH') {
        console.log('Network issue detected (e.g., Ethernet cable unplugged)');
    }
});
// client.on('data', (data) => {
//     console.log('Received: ' + data);
//     if (data.toString() === 'heartbeat') {
//         console.log('Heartbeat acknowledged');
//         resetHeartbeatTimeout();
//     }
// });

// client.on('close', () => {
//     console.log('Connection closed');
//     stopHeartbeat();
// });

// client.on('error', (err) => {
//     console.log('Error: ' + err.message);
//     if (err.code === 'ECONNRESET' || err.code === 'ENETDOWN' || err.code === 'ENETUNREACH') {
//         console.log('Network issue detected (e.g., Ethernet cable unplugged)');
//     }
//     stopHeartbeat();
// });

// function startHeartbeat() {
//     heartbeatTimer = setInterval(() => {
//         console.log('Sending heartbeat');
//         client.write('heartbeat');
//         startHeartbeatTimeout();
//     }, HEARTBEAT_INTERVAL);
// }

// function stopHeartbeat() {
//     clearInterval(heartbeatTimer);
//     clearTimeout(heartbeatTimeout);
// }

// function startHeartbeatTimeout() {
//     heartbeatTimeout = setTimeout(() => {
//         console.log('Heartbeat response not received, closing connection');
//         client.destroy(); // Forcefully close the socket
//     }, HEARTBEAT_TIMEOUT);
// }

// function resetHeartbeatTimeout() {
//     clearTimeout(heartbeatTimeout);
//     startHeartbeatTimeout();
// }