import { pgTable, text, serial, integer, boolean, date, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  fullName: text("full_name"),
  verificationCode: text("verification_code"),
  codeExpiry: timestamp("code_expiry"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  phone: true,
  fullName: true,
});

export const verifyUserSchema = z.object({
  phone: z.string().min(11, { message: "شماره موبایل معتبر نیست" }),
  code: z.string().min(4, { message: "کد تایید را وارد کنید" }),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type VerifyUser = z.infer<typeof verifyUserSchema>;
export type User = typeof users.$inferSelect;

export const caravans = pgTable("caravans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  departureDate: text("departure_date").notNull(),
  duration: integer("duration").notNull(),
  transportationType: text("transportation_type").notNull(),
  price: integer("price").notNull(),
  capacity: integer("capacity").notNull(),
  remainingCapacity: integer("remaining_capacity").notNull(),
  accommodationType: text("accommodation_type").notNull(),
  accommodationDistance: integer("accommodation_distance").notNull(),
  manager: text("manager").notNull(),
  description: text("description"),
  popular: boolean("popular").default(false),
  specialTag: text("special_tag"),
  imageUrl: text("image_url"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertCaravanSchema = createInsertSchema(caravans).omit({
  id: true,
});

export type InsertCaravan = z.infer<typeof insertCaravanSchema>;
export type Caravan = typeof caravans.$inferSelect;

export type Companion = {
  name: string;
  id: string;
  phone: string;
  birthdate: string;
};

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  caravanId: integer("caravan_id").notNull().references(() => caravans.id),
  
  // مرحله اول - اطلاعات مسافر اصلی
  mainPassengerName: text("main_passenger_name").notNull(),
  mainPassengerId: text("main_passenger_id").notNull(),
  mainPassengerPhone: text("main_passenger_phone").notNull(),
  mainPassengerBirthdate: text("main_passenger_birthdate").notNull(),
  passengerCount: integer("passenger_count").notNull().default(1),
  
  // مرحله دوم - اطلاعات همراهان
  companions: jsonb("companions").$type<Companion[]>().default([]),
  
  // مرحله سوم - اطلاعات تکمیلی
  address: text("address"),
  specialRequests: text("special_requests"),
  selectedSeats: integer("selected_seats").array().default([]),
  
  // اطلاعات پرداخت
  totalPrice: integer("total_price").notNull(),
  isPaid: boolean("is_paid").notNull().default(false),
  paymentDate: timestamp("payment_date"),
  paymentReference: text("payment_reference"),
  
  // وضعیت رزرو
  status: text("status").notNull().default("pending"), // pending, confirmed, cancelled, completed
  currentStep: integer("current_step").notNull().default(1),
  isCompleted: boolean("is_completed").notNull().default(false),
  
  transportationType: text("transportation_type").notNull(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// اسکیمای مرحله اول رزرو
export const bookingStep1Schema = z.object({
  caravanId: z.number(),
  mainPassengerName: z.string().min(1, "نام مسافر اصلی الزامی است"),
  mainPassengerId: z.string().min(1, "کد ملی مسافر اصلی الزامی است"),
  mainPassengerPhone: z.string().min(1, "شماره تماس مسافر اصلی الزامی است"),
  mainPassengerBirthdate: z.string().min(1, "تاریخ تولد مسافر اصلی الزامی است"),
  passengerCount: z.number().min(1, "تعداد مسافر باید حداقل 1 نفر باشد"),
});

// اسکیمای مرحله دوم رزرو
export const bookingStep2Schema = z.object({
  companions: z.array(
    z.object({
      name: z.string().min(3, { message: "نام و نام خانوادگی الزامی است" }),
      nationalId: z.string().min(10, { message: "کد ملی معتبر نیست" }),
      relationship: z.string().min(1, { message: "نسبت الزامی است" }),
      birthdate: z.string().min(5, { message: "تاریخ تولد الزامی است" }),
    })
  ),
});

// اسکیمای مرحله سوم رزرو
export const bookingStep3Schema = z.object({
  address: z.string().min(1, "آدرس الزامی است"),
  specialRequests: z.string().optional(),
  selectedSeats: z.array(z.number()).optional()
});

export const insertBookingSchema = createInsertSchema(bookings, {
  transportationType: z.string().min(1, "نوع حمل و نقل الزامی است")
});

export type InsertBooking = typeof insertBookingSchema._type;
export type BookingStep1 = z.infer<typeof bookingStep1Schema>;
export type BookingStep2 = z.infer<typeof bookingStep2Schema>;
export type BookingStep3 = z.infer<typeof bookingStep3Schema>;
export type Booking = typeof bookings.$inferSelect;

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
});

export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

export const newsletters = pgTable("newsletters", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNewsletterSchema = createInsertSchema(newsletters).omit({
  id: true,
  createdAt: true,
});

export type InsertNewsletter = z.infer<typeof insertNewsletterSchema>;
export type Newsletter = typeof newsletters.$inferSelect;

export type UpdateUser = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;
export type UpdateCaravan = Partial<Omit<Caravan, 'id' | 'createdAt' | 'updatedAt'>>;
