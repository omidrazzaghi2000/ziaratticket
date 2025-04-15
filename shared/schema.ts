import { pgTable, text, serial, integer, boolean, date, timestamp } from "drizzle-orm/pg-core";
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
});

export const insertCaravanSchema = createInsertSchema(caravans).omit({
  id: true,
});

export type InsertCaravan = z.infer<typeof insertCaravanSchema>;
export type Caravan = typeof caravans.$inferSelect;

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  caravanId: integer("caravan_id").notNull(),
  
  // مرحله اول - اطلاعات مسافر اصلی
  mainPassengerName: text("main_passenger_name").notNull(),
  mainPassengerId: text("main_passenger_id").notNull(),
  mainPassengerPhone: text("main_passenger_phone").notNull(),
  mainPassengerBirthdate: text("main_passenger_birthdate").notNull(),
  
  // مرحله دوم - اطلاعات همراهان
  companions: text("companions").array(),
  
  // مرحله سوم - اطلاعات تکمیلی
  address: text("address").notNull(),
  specialRequests: text("special_requests"),
  
  // اطلاعات پرداخت
  totalPrice: integer("total_price").notNull(),
  isPaid: boolean("is_paid").default(false),
  paymentDate: timestamp("payment_date"),
  paymentReference: text("payment_reference"),
  
  // وضعیت رزرو
  status: text("status").default("pending").notNull(), // pending, confirmed, cancelled, completed
  currentStep: integer("current_step").default(1).notNull(),
  isCompleted: boolean("is_completed").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// اسکیمای مرحله اول رزرو
export const bookingStep1Schema = createInsertSchema(bookings).pick({
  caravanId: true,
  mainPassengerName: true,
  mainPassengerId: true,
  mainPassengerPhone: true,
  mainPassengerBirthdate: true,
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
export const bookingStep3Schema = createInsertSchema(bookings).pick({
  address: true,
  specialRequests: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isPaid: true,
  paymentDate: true,
  paymentReference: true,
  status: true,
  currentStep: true,
  isCompleted: true,
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
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
