import { pgTable, text, serial, integer, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
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
  caravanId: integer("caravan_id").notNull(),
  mainPassengerName: text("main_passenger_name").notNull(),
  mainPassengerId: text("main_passenger_id").notNull(),
  mainPassengerPhone: text("main_passenger_phone").notNull(),
  mainPassengerBirthdate: text("main_passenger_birthdate").notNull(),
  address: text("address").notNull(),
  companions: text("companions").array(),
  totalPrice: integer("total_price").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
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
