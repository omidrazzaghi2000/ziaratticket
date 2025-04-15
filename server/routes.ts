import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookingSchema, insertContactSchema, insertNewsletterSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all caravans
  app.get("/api/caravans", async (req, res) => {
    try {
      const caravans = await storage.getCaravans();
      
      // Apply filters if provided
      let filteredCaravans = [...caravans];
      
      if (req.query.departureDate) {
        filteredCaravans = filteredCaravans.filter(
          caravan => caravan.departureDate === req.query.departureDate
        );
      }
      
      if (req.query.duration) {
        filteredCaravans = filteredCaravans.filter(
          caravan => caravan.duration === parseInt(req.query.duration as string)
        );
      }
      
      if (req.query.transportationType) {
        filteredCaravans = filteredCaravans.filter(
          caravan => caravan.transportationType === req.query.transportationType
        );
      }
      
      if (req.query.priceRange) {
        const range = req.query.priceRange as string;
        
        switch(range) {
          case "1": // تا ۱۰ میلیون
            filteredCaravans = filteredCaravans.filter(
              caravan => caravan.price <= 10000000
            );
            break;
          case "2": // ۱۰ تا ۱۵ میلیون
            filteredCaravans = filteredCaravans.filter(
              caravan => caravan.price > 10000000 && caravan.price <= 15000000
            );
            break;
          case "3": // ۱۵ تا ۲۰ میلیون
            filteredCaravans = filteredCaravans.filter(
              caravan => caravan.price > 15000000 && caravan.price <= 20000000
            );
            break;
          case "4": // بالای ۲۰ میلیون
            filteredCaravans = filteredCaravans.filter(
              caravan => caravan.price > 20000000
            );
            break;
        }
      }
      
      res.json(filteredCaravans);
    } catch (error) {
      res.status(500).json({ message: "خطایی در دریافت اطلاعات کاروان‌ها رخ داده است." });
    }
  });
  
  // Get a specific caravan by ID
  app.get("/api/caravans/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const caravan = await storage.getCaravan(id);
      
      if (!caravan) {
        return res.status(404).json({ message: "کاروان مورد نظر یافت نشد." });
      }
      
      res.json(caravan);
    } catch (error) {
      res.status(500).json({ message: "خطایی در دریافت اطلاعات کاروان رخ داده است." });
    }
  });
  
  // Create a booking
  app.post("/api/bookings", async (req, res) => {
    try {
      // Validate the request body
      const bookingData = insertBookingSchema.parse(req.body);
      
      // Check if caravan exists and has capacity
      const caravan = await storage.getCaravan(bookingData.caravanId);
      if (!caravan) {
        return res.status(404).json({ message: "کاروان مورد نظر یافت نشد." });
      }
      
      const companionCount = bookingData.companions?.length || 0;
      const totalPeople = companionCount + 1; // Main passenger + companions
      
      if (caravan.remainingCapacity < totalPeople) {
        return res.status(400).json({ 
          message: "ظرفیت کاروان برای تعداد مسافران درخواستی کافی نیست." 
        });
      }
      
      // Create the booking
      const booking = await storage.createBooking(bookingData);
      
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      res.status(500).json({ message: "خطایی در ثبت رزرو رخ داده است." });
    }
  });
  
  // Submit contact form
  app.post("/api/contacts", async (req, res) => {
    try {
      // Validate the request body
      const contactData = insertContactSchema.parse(req.body);
      
      // Create the contact
      const contact = await storage.createContact(contactData);
      
      res.status(201).json({ message: "پیام شما با موفقیت ارسال شد." });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      res.status(500).json({ message: "خطایی در ارسال پیام رخ داده است." });
    }
  });
  
  // Subscribe to newsletter
  app.post("/api/newsletters", async (req, res) => {
    try {
      // Validate the request body
      const newsletterData = insertNewsletterSchema.parse(req.body);
      
      // Create the newsletter subscription
      const newsletter = await storage.createNewsletter(newsletterData);
      
      res.status(201).json({ message: "عضویت شما در خبرنامه با موفقیت انجام شد." });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      res.status(500).json({ message: "خطایی در ثبت عضویت در خبرنامه رخ داده است." });
    }
  });
  
  // Get prayer times (for demo purposes, using static data)
  app.get("/api/prayer-times", (req, res) => {
    const prayerTimes = {
      fajr: "۴:۳۰",
      sunrise: "۵:۵۳",
      dhuhr: "۱۲:۰۵",
      asr: "۱۵:۴۵",
      maghrib: "۱۸:۱۷",
      isha: "۱۹:۴۷",
      midnight: "۲۳:۰۹"
    };
    
    res.json(prayerTimes);
  });

  const httpServer = createServer(app);

  return httpServer;
}
