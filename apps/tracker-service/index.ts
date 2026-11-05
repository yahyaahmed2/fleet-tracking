import amqp from "amqplib";
import mongoose from "mongoose";
import { TelemetrySchema } from "@fleet/shared";

const RABBITMQ_URL = "amqp://localhost:5672";
const MONGO_URL = "mongodb://localhost:27017/fleet";
const QUEUE_NAME = "telemetry_queue";

const TelemetryDocSchema = new mongoose.Schema(
  {
    messageId: { type: String, required: true, unique: true },
    deviceId: { type: String, required: true, index: true },
    imei: { type: String, required: true },
    recordedAt: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    speed: { type: Number, required: true },
    heading: { type: Number, required: true },
    ignition: { type: Boolean, required: true },
    battery: { type: Number, required: true }
  },
  { timestamps: true }
);

const DeviceSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    imei: { type: String, required: true },
    lastSeenAt: { type: String, required: true },
    lastPosition: {
      type: { type: String, enum: ["Point"], required: true },
      coordinates: { type: [Number], required: true }
    },
    speed: { type: Number, required: true },
    heading: { type: Number, required: true },
    ignition: { type: Boolean, required: true }
  },
  { timestamps: true }
);

DeviceSchema.index({ lastPosition: "2dsphere" });

const TelemetryModel = mongoose.model("Telemetry", TelemetryDocSchema);
const DeviceModel = mongoose.model("Device", DeviceSchema);

async function startTracker() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("Connected to MongoDB Host:", mongoose.connection.host);
    console.log("Connected to Database Name:", mongoose.connection.name); console.log("Tracker Service connected to MongoDB.");

    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    channel.prefetch(1);

    console.log(`Waiting for telemetry messages in ${QUEUE_NAME}...`);

    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg === null) {
        return;
      }

      try {
        const rawData = JSON.parse(msg.content.toString());
        const validationResult = TelemetrySchema.safeParse(rawData);

        if (!validationResult.success) {
          console.error("Invalid telemetry payload:", validationResult.error.format());
          channel.ack(msg);
          return;
        }

        const telemetry = validationResult.data;

        await TelemetryModel.create(telemetry);

        const truckNumber = telemetry.deviceId.split("-").at(-1) ?? telemetry.deviceId;

        await DeviceModel.findByIdAndUpdate(
          telemetry.deviceId,
          {
            _id: telemetry.deviceId,
            name: `Truck ${truckNumber}`,
            imei: telemetry.imei,
            lastSeenAt: telemetry.recordedAt,
            lastPosition: {
              type: "Point",
              coordinates: [telemetry.lng, telemetry.lat]
            },
            speed: telemetry.speed,
            heading: telemetry.heading,
            ignition: telemetry.ignition
          },
          { upsert: true, new: true, runValidators: true }
        );

        console.log(`Saved telemetry and updated device state for ${telemetry.deviceId}`);
        channel.ack(msg);
      } catch (err) {
        console.error("Error processing message:", err);
        channel.nack(msg, false, true);
      }
    });
  } catch (error) {
    console.error("Tracker service error, retrying in 5s...", error);
    setTimeout(startTracker, 5000);
  }
}

startTracker();
