import mongoose, { Types } from "mongoose";

export type TicketStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "USED"
  | "CANCELLED"
  | "EXPIRED";

export interface ITicket {
  user: Types.ObjectId;
  ticketCodeHash: string;
  ticketCodeHint: string;
  route: Types.ObjectId;
  routeNumber: string;
  vehicle?: Types.ObjectId | null;
  vehicleRegNo?: string | null;
  trip?: Types.ObjectId | null;
  boardingStop?: Types.ObjectId | null;
  destinationStop?: Types.ObjectId | null;
  boardingStopName?: string | null;
  destinationStopName?: string | null;
  passengerCategory: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: TicketStatus;
  issuedBy?: Types.ObjectId | null;
  issuedByRole?: string | null;
  passId?: Types.ObjectId | null;
  passType?: string | null;
  expiresAt?: Date | null;
  usedAt?: Date | null;
  cancelledAt?: Date | null;
  cancelledReason?: string | null;
  paymentId?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const ticketSchema = new mongoose.Schema<ITicket>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ticketCodeHash: { type: String, required: true },
    ticketCodeHint: { type: String, required: true },
    route: { type: mongoose.Schema.Types.ObjectId, ref: "Route", required: true },
    routeNumber: { type: String, required: true, trim: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", default: null },
    vehicleRegNo: { type: String, default: null },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", default: null },
    boardingStop: { type: mongoose.Schema.Types.ObjectId, ref: "Stop", default: null },
    destinationStop: { type: mongoose.Schema.Types.ObjectId, ref: "Stop", default: null },
    boardingStopName: { type: String, default: null },
    destinationStopName: { type: String, default: null },
    passengerCategory: { type: String, default: "ADULT" },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    paymentMethod: { type: String, default: "CASH" },
    status: {
      type: String,
      enum: ["PENDING_PAYMENT", "CONFIRMED", "USED", "CANCELLED", "EXPIRED"],
      default: "PENDING_PAYMENT",
    },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    issuedByRole: { type: String, default: null },
    passId: { type: mongoose.Schema.Types.ObjectId, default: null },
    passType: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    usedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledReason: { type: String, default: null },
    paymentId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

ticketSchema.index({ user: 1, createdAt: -1 });
ticketSchema.index({ route: 1, status: 1 });
ticketSchema.index({ trip: 1 });
ticketSchema.index({ ticketCodeHash: 1 }, { unique: true });
ticketSchema.index({ status: 1, expiresAt: 1 });

export const Ticket = mongoose.model<ITicket>("Ticket", ticketSchema);
