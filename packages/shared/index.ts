import { z } from 'zod';

export const TelemetrySchema = z.object({
  messageId: z.string().uuid(),
  deviceId: z.string().min(1),
  imei: z.string().regex(/^\d{15}$/, 'IMEI must be a 15-digit number'),
  recordedAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'recordedAt must be a valid ISO date string'
  }),
  lat: z.number().finite(),
  lng: z.number().finite(),
  speed: z.number().min(0).max(250).finite(),
  heading: z.number().min(0).max(360).finite(),
  ignition: z.boolean(),
  battery: z.number().min(0).max(100).finite()
});

export type Telemetry = z.infer<typeof TelemetrySchema>;

export const DeviceSchema = z.object({
  _id: z.string().min(1),
  name: z.string().min(1),
  imei: z.string().regex(/^\d{15}$/, 'IMEI must be a 15-digit number'),
  lastSeenAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'lastSeenAt must be a valid ISO date string'
  }),
  lastPosition: z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([z.number(), z.number()])
  }),
  speed: z.number().min(0).max(250).finite(),
  heading: z.number().min(0).max(360).finite(),
  ignition: z.boolean()
});

export type Device = z.infer<typeof DeviceSchema>;
