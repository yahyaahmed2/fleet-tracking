import amqp from 'amqplib';
import { randomUUID } from 'crypto';

const RABBITMQ_URL = 'amqp://localhost:5672';
const QUEUE_NAME = 'telemetry_queue';

// Define 5 simulated vehicles
const devices = [
  { id: 'TRK-0001', imei: '356938035643809', lat: 30.0444, lng: 31.2357, heading: 135 },
  { id: 'TRK-0002', imei: '356938035643810', lat: 30.0500, lng: 31.2400, heading: 90 },
  { id: 'TRK-0003', imei: '356938035643811', lat: 30.0350, lng: 31.2200, heading: 180 },
  { id: 'TRK-0004', imei: '356938035643812', lat: 30.0600, lng: 31.2500, heading: 45 },
  { id: 'TRK-0005', imei: '356938035643813', lat: 30.0200, lng: 31.2100, heading: 270 }
];

async function startSimulator() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createConfirmChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    console.log('Simulator connected to RabbitMQ. Publishing telemetry every 2s...');

    setInterval(() => {
      devices.forEach((device) => {
        // Simulate minor smooth movement
        device.lat += (Math.random() - 0.5) * 0.001;
        device.lng += (Math.random() - 0.5) * 0.001;

        const payload = {
          messageId: randomUUID(),
          deviceId: device.id,
          imei: device.imei,
          recordedAt: new Date().toISOString(),
          lat: Number(device.lat.toFixed(4)),
          lng: Number(device.lng.toFixed(4)),
          speed: Math.floor(Math.random() * 60) + 10,
          heading: device.heading,
          ignition: true,
          battery: 90
        };

        channel.sendToQueue(
          QUEUE_NAME,
          Buffer.from(JSON.stringify(payload)),
          { persistent: true },
          (err, ok) => {
            if (err) {
              console.error('Message rejected:', err);
            }
          }
        );
      });
    }, 2000);
  } catch (error) {
    console.error('Failed to connect to RabbitMQ, retrying in 5s...', error);
    setTimeout(startSimulator, 5000);
  }
}

startSimulator();