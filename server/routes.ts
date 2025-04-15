import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, verifyUserSchema,
  bookingStep1Schema, bookingStep2Schema, bookingStep3Schema,
  insertBookingSchema, insertContactSchema, insertNewsletterSchema 
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

// ضمیمه کردن تعریف مدل با نوع Request
declare module 'express-serve-static-core' {
  interface Request {
    session: {
      userId?: number;
      destroy: (callback: (err?: any) => void) => void;
    }
  }
}

// Middleware for checking if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "لطفا ابتدا وارد شوید." });
  }
  next();
};

// Function to generate a random verification code
function generateVerificationCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Mock function for Kavenegar SMS service - Replace with actual API call when ready
async function sendSms(phone: string, message: string) {
  // In production, replace with actual Kavenegar API call
  console.log(`Sending SMS to ${phone}: ${message}`);
  return true;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ===== مسیرهای مربوط به احراز هویت =====
  
  // ارسال کد تایید به شماره موبایل
  app.post("/api/auth/send-code", async (req, res) => {
    try {
      const { phone } = insertUserSchema.pick({ phone: true }).parse(req.body);
      
      // چک کردن وجود کاربر با این شماره موبایل
      let user = await storage.getUserByPhone(phone);
      
      // اگر کاربر وجود نداشت، ایجاد میکنیم
      if (!user) {
        user = await storage.createUser({ phone, fullName: null });
      }
      
      // تولید کد تایید و ذخیره آن
      const verificationCode = generateVerificationCode();
      await storage.setVerificationCode(phone, verificationCode);
      
      // ارسال پیامک حاوی کد تایید
      const message = `کد تایید سامانه رزرو کاروان: ${verificationCode}`;
      await sendSms(phone, message);
      
      res.json({ 
        message: "کد تایید به شماره موبایل شما ارسال شد.",
        phone
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      res.status(500).json({ 
        message: "خطایی در ارسال کد تایید رخ داده است. لطفا دوباره تلاش کنید." 
      });
    }
  });
  
  // تایید کد ارسال شده و ورود کاربر
  app.post("/api/auth/verify", async (req, res) => {
    try {
      const verifyData = verifyUserSchema.parse(req.body);
      
      // بررسی کد تایید
      const user = await storage.verifyUser(verifyData);
      
      if (!user) {
        return res.status(404).json({ 
          message: "کاربری با این شماره موبایل یافت نشد." 
        });
      }
      
      // ذخیره شناسه کاربر در سشن
      req.session.userId = user.id;
      
      res.json({ 
        message: "ورود با موفقیت انجام شد.", 
        user: {
          id: user.id,
          phone: user.phone,
          fullName: user.fullName
        }
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ 
        message: "خطایی در تایید کد رخ داده است. لطفا دوباره تلاش کنید." 
      });
    }
  });
  
  // بررسی وضعیت ورود کاربر
  app.get("/api/auth/status", (req, res) => {
    if (req.session.userId) {
      return res.json({ 
        isAuthenticated: true, 
        userId: req.session.userId 
      });
    }
    
    res.json({ isAuthenticated: false });
  });
  
  // خروج کاربر
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ 
          message: "خطایی در خروج رخ داده است. لطفا دوباره تلاش کنید." 
        });
      }
      
      res.json({ message: "خروج با موفقیت انجام شد." });
    });
  });
  
  // دریافت اطلاعات کاربر
  app.get("/api/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "کاربر یافت نشد." });
      }
      
      res.json({
        id: user.id,
        phone: user.phone,
        fullName: user.fullName
      });
    } catch (error) {
      res.status(500).json({ 
        message: "خطایی در دریافت اطلاعات کاربر رخ داده است." 
      });
    }
  });
  
  // ===== مسیرهای مربوط به مراحل رزرو =====
  
  // مرحله اول رزرو: اطلاعات مسافر اصلی
  app.post("/api/bookings/step1", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId as number;
      const step1Data = bookingStep1Schema.parse(req.body);
      
      // بررسی موجود بودن کاروان
      const caravan = await storage.getCaravan(step1Data.caravanId);
      if (!caravan) {
        return res.status(404).json({ message: "کاروان مورد نظر یافت نشد." });
      }
      
      // ذخیره مرحله اول رزرو
      const booking = await storage.saveBookingStep1(userId, step1Data);
      
      res.status(201).json({ 
        message: "مرحله اول رزرو با موفقیت ثبت شد.",
        bookingId: booking.id,
        step: 1
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      res.status(500).json({ 
        message: "خطایی در ثبت مرحله اول رزرو رخ داده است." 
      });
    }
  });
  
  // مرحله دوم رزرو: اطلاعات همراهان
  app.post("/api/bookings/:id/step2", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const step2Data = bookingStep2Schema.parse(req.body);
      
      // بررسی اینکه رزرو متعلق به کاربر جاری باشد
      const booking = await storage.getBooking(bookingId);
      if (!booking || booking.userId !== req.session.userId) {
        return res.status(404).json({ message: "رزرو مورد نظر یافت نشد." });
      }
      
      // ذخیره مرحله دوم رزرو
      const updatedBooking = await storage.saveBookingStep2(bookingId, step2Data);
      
      res.json({ 
        message: "مرحله دوم رزرو با موفقیت ثبت شد.",
        bookingId,
        step: 2
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      res.status(500).json({ 
        message: "خطایی در ثبت مرحله دوم رزرو رخ داده است." 
      });
    }
  });
  
  // مرحله سوم رزرو: اطلاعات تکمیلی
  app.post("/api/bookings/:id/step3", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const step3Data = bookingStep3Schema.parse(req.body);
      
      // بررسی اینکه رزرو متعلق به کاربر جاری باشد
      const booking = await storage.getBooking(bookingId);
      if (!booking || booking.userId !== req.session.userId) {
        return res.status(404).json({ message: "رزرو مورد نظر یافت نشد." });
      }
      
      // ذخیره مرحله سوم رزرو
      const updatedBooking = await storage.saveBookingStep3(bookingId, step3Data);
      
      res.json({ 
        message: "مرحله سوم رزرو با موفقیت ثبت شد.",
        bookingId,
        step: 3,
        totalPrice: updatedBooking.totalPrice
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      res.status(500).json({ 
        message: "خطایی در ثبت مرحله سوم رزرو رخ داده است." 
      });
    }
  });
  
  // تکمیل رزرو
  app.post("/api/bookings/:id/complete", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      
      // بررسی اینکه رزرو متعلق به کاربر جاری باشد
      const booking = await storage.getBooking(bookingId);
      if (!booking || booking.userId !== req.session.userId) {
        return res.status(404).json({ message: "رزرو مورد نظر یافت نشد." });
      }
      
      if (booking.currentStep < 3) {
        return res.status(400).json({ 
          message: "لطفا ابتدا تمام مراحل رزرو را تکمیل کنید." 
        });
      }
      
      // تکمیل رزرو
      const completedBooking = await storage.completeBooking(bookingId);
      
      res.json({ 
        message: "رزرو شما با موفقیت تکمیل شد.",
        booking: completedBooking
      });
    } catch (error) {
      res.status(500).json({ 
        message: "خطایی در تکمیل رزرو رخ داده است." 
      });
    }
  });
  
  // دریافت رزروهای کاربر
  app.get("/api/bookings/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      const bookings = await storage.getBookingsByUserId(userId);
      
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ 
        message: "خطایی در دریافت اطلاعات رزروها رخ داده است." 
      });
    }
  });
  
  // دریافت جزئیات یک رزرو
  app.get("/api/bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const booking = await storage.getBooking(bookingId);
      
      if (!booking || booking.userId !== req.session.userId) {
        return res.status(404).json({ message: "رزرو مورد نظر یافت نشد." });
      }
      
      res.json(booking);
    } catch (error) {
      res.status(500).json({ 
        message: "خطایی در دریافت اطلاعات رزرو رخ داده است." 
      });
    }
  });
  
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
  
  // Create a booking (روش قدیمی - فقط برای سازگاری با نسخه قبلی)
  app.post("/api/bookings", isAuthenticated, async (req, res) => {
    try {
      // Validate the request body
      const bookingData = insertBookingSchema.parse(req.body);
      const userId = req.session.userId as number;
      
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
      const booking = await storage.createBooking(userId, bookingData);
      
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
