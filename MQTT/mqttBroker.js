import { Server } from 'mosca';

export function startMQTTBroker() {
  const settings = {
    port: 1883 // MQTT port
  };

  const server = new Server(settings);

  server.on('ready', function() {
    console.log('MQTT Broker is running');
  });

  server.on('clientConnected', function(client) {
    console.log('Client connected:', client.id);
  });

  server.on('published', function(packet, client) {
    if (packet.cmd === 'publish') {
      console.log('Message received:', packet.payload.toString());
    }
  });

  server.on('error', function(err) {
    console.error('MQTT Broker error:', err);
  });
}


