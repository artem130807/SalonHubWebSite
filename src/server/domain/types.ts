export const UserRole = {
  Client: "Client",
  SalonAdmin: "SalonAdmin",
  Master: "Master",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const AppointmentStatus = {
  Confirmed: "Confirmed",
  Completed: "Completed",
  Cancelled: "Cancelled",
} as const;
export type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

export const TimeSlotStatus = {
  Available: "Available",
  Booked: "Booked",
  Cancelled: "Cancelled",
} as const;
export type TimeSlotStatus = (typeof TimeSlotStatus)[keyof typeof TimeSlotStatus];

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  emailVerified: boolean;
  city?: string | null;
  createdAt: Date;
};

export type RefreshTokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
  createdAt: Date;
};

export type Salon = {
  id: string;
  name: string;
  description: string | null;
  city: string;
  street: string;
  building: string;
  phone: string | null;
  openingTime: string | null;
  closingTime: string | null;
  isActive: boolean;
  rating: number;
  ratingCount: number;
  createdAt: Date;
};

export type MasterProfile = {
  id: string;
  userId: string;
  salonId: string;
  bio: string | null;
  specialization: string | null;
  avatarUrl?: string | null;
  rating: number;
  ratingCount: number;
  userName: string;
};

export type Service = {
  id: string;
  salonId: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  photoUrl?: string | null;
};

export type MasterTimeSlot = {
  id: string;
  masterId: string;
  scheduleDate: string;
  startTime: string;
  endTime: string;
  status: TimeSlotStatus;
  salonId?: string;
};

export type Appointment = {
  id: string;
  salonId: string;
  salonName: string;
  clientId: string | null;
  clientName: string;
  guestName?: string | null;
  masterId: string;
  masterName: string;
  serviceId: string;
  serviceName: string;
  timeSlotId: string;
  clientNotes: string | null;
  status: AppointmentStatus;
  startTime: string;
  endTime: string;
  appointmentDate: Date;
  price: number;
};

export type EmailVerification = {
  id: string;
  email: string;
  codeHash: string;
  createdAt: Date;
  expiresAt: Date;
  isUsed: boolean;
};

export type WorkingWindow = {
  id: string;
  masterId: string;
  scheduleDate: string;
  startTime: string;
  endTime: string;
};

export type BusyInterval = {
  startTime: string;
  endTime: string;
};

export type AvailableStart = {
  sourceWindowId: string;
  masterId: string;
  date: string;
  startTime: string;
  endTime: string;
};

export const InboxMessageType = {
  CreationAppointment: "CreationAppointment",
  CompletedAppointment: "CompletedAppointment",
  Reminder: "Reminder",
  Promotion: "Promotion",
  CancelledAppointment: "CancelledAppointment",
} as const;
export type InboxMessageType = (typeof InboxMessageType)[keyof typeof InboxMessageType];

export const MessageAudience = {
  User: "User",
  Admin: "Admin",
  Master: "Master",
} as const;
export type MessageAudience = (typeof MessageAudience)[keyof typeof MessageAudience];

export type InboxMessage = {
  id: string;
  userId: string;
  appointmentId: string | null;
  content: string;
  type: InboxMessageType;
  audience: MessageAudience;
  readAt: Date | null;
  createdAt: Date;
};

export type Review = {
  id: string;
  appointmentId: string;
  clientId: string;
  salonId: string;
  masterId: string;
  salonRating: number;
  masterRating: number;
  comment: string | null;
  createdAt: Date;
  salonName?: string;
  masterName?: string;
  clientName?: string;
};

export type WeeklyTemplate = {
  id: string;
  masterId: string;
  name: string;
  days: { id: string; weekday: number; startTime: string; endTime: string }[];
};

export type Conversation = {
  id: string;
  participant1Id: string;
  participant2Id: string;
  participant1Name: string;
  participant2Name: string;
  createdAt: Date;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
};

export type SalonPhoto = {
  id: string;
  salonId: string;
  url: string;
};

export type SalonPromotion = {
  id: string;
  salonId: string;
  title: string;
  description: string | null;
  discountPercent: number;
  serviceId: string | null;
  serviceName?: string | null;
  imageUrl: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  createdAt: Date;
};

export type PortfolioPhoto = {
  id: string;
  masterId: string;
  url: string;
  caption: string | null;
  sortOrder: number;
  createdAt: Date;
};

export type MasterSubscription = {
  id: string;
  clientId: string;
  masterId: string;
  masterName: string;
  salonName: string;
};

export const StatsJobStatus = {
  Running: "Running",
  Completed: "Completed",
  Failed: "Failed",
} as const;
export type StatsJobStatus = (typeof StatsJobStatus)[keyof typeof StatsJobStatus];

export type DailySalonStat = {
  id: string;
  salonId: string;
  statDate: string;
  totalCount: number;
  completedCount: number;
  cancelledCount: number;
  revenue: number;
};

export type DailyMasterStat = {
  id: string;
  masterId: string;
  statDate: string;
  totalCount: number;
  completedCount: number;
  cancelledCount: number;
  revenue: number;
};

export type StatsJobRun = {
  id: string;
  statDate: string;
  status: StatsJobStatus;
  attempt: number;
  leaseUntil: Date;
  workerId: string | null;
  error: string | null;
  startedAt: Date;
  completedAt: Date | null;
};
