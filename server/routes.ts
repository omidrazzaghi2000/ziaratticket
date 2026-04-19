import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, verifyUserSchema,
  bookingStep1Schema, bookingStep2Schema, bookingStep3Schema,
  insertBookingSchema, insertContactSchema, insertNewsletterSchema,
  insertCaravanSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { apiRequest } from "@/lib/queryClient";

const DjangoBackendURL:string = "http://localhost:8000";

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
async function sendSms(phone: string, verificationCode: string) {
  // TODO: Implement Kavenegar API integration
  const apiKey = "376E74796B6A6D7862596C794A61534C374F4E6F494D6667323247416A67706B4A4130665176313575326B3D";
  console.error(verificationCode)
  const response = await fetch(`https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json`, {
    method: 'POST',
    
    body: new URLSearchParams({
      "receptor": phone,
      "template": "code",
      "token": verificationCode,

    }),
    
  });
  
  return response.status;
  // console.log(`Sending SMS to ${phone}: ${message}`);
  // return true;
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
      await sendSms(phone, verificationCode);
      
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
      const booking = await storage.saveBookingStep1(userId, step1Data,caravan);
      
      res.status(201).json({ 
        message: "مرحله اول رزرو با موفقیت ثبت شد.",
        bookingId: booking.id,
        step: 1
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message,stack_trace:error.stack?.toString() });
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
      const { address, specialRequests, selectedSeats } = req.body;

      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: "رزرو یافت نشد" });
      }

      if (booking.userId !== req.session.userId) {
        return res.status(403).json({ error: "شما دسترسی به این رزرو ندارید" });
      }

      const updatedBooking = await storage.saveBookingStep3(bookingId, {
        address,
        specialRequests,
        selectedSeats
      });

      if (!updatedBooking) {
        return res.status(404).json({ error: "رزرو یافت نشد" });
      }

      res.json(updatedBooking);
    } catch (error) {
      console.error("Error saving booking step 3:", error);
      res.status(500).json({ error: "خطا در ذخیره اطلاعات" });
    }
  });
  
  // تکمیل رزرو
  app.post("/api/bookings/:id/complete", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const { selectedSeats } = req.body;

      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: "رزرو یافت نشد" });
      }

      if (booking.userId !== req.session.userId) {
        return res.status(403).json({ error: "شما دسترسی به این رزرو ندارید" });
      }

      if (booking.transportationType === "زمینی" && (!selectedSeats || selectedSeats.length !== booking.passengerCount)) {
        return res.status(400).json({ error: "تعداد صندلی‌های انتخاب شده باید با تعداد مسافران برابر باشد" });
      }

      const completedBooking = await storage.completeBooking(bookingId, selectedSeats);
      if (!completedBooking) {
        return res.status(404).json({ error: "رزرو یافت نشد" });
      }

      res.json(completedBooking);
    } catch (error) {
      console.error("Error completing booking:", error);
      res.status(500).json({ error: "خطا در تکمیل رزرو" });
    }
  });
  
  // دریافت رزروهای کاربر
  app.get("/api/bookings/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId;
      
      if (typeof userId !== 'number') {
        return res.status(401).json({ message: "لطفا ابتدا وارد شوید." });
      }
      
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
  
  // دریافت وضعیت صندلی‌های یک رزرو
  app.get("/api/bookings/:id/seats", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      
      // بررسی اینکه رزرو متعلق به کاربر جاری باشد
      const booking = await storage.getBooking(bookingId);
      if (!booking || booking.userId !== req.session.userId) {
        return res.status(404).json({ message: "رزرو مورد نظر یافت نشد." });
      }

      // دریافت اطلاعات کاروان
      const caravan = await storage.getCaravan(booking.caravanId);
      if (!caravan) {
        return res.status(404).json({ message: "کاروان مورد نظر یافت نشد." });
      }

      // اگر نوع حمل و نقل زمینی نیست، صندلی‌ها را برنگردان
      if (caravan.transportationType !== "زمینی") {
        return res.json([]);
      }

      // دریافت تمام رزروهای مربوط به این کاروان
      const allBookings = await storage.getBookingsByCaravanId(caravan.id);
      
      // ایجاد آرایه‌ای از صندلی‌ها
      const seats: { number: number; isOccupied: boolean; isSelected: boolean; passengerName: string | null }[] = Array.from({ length: 50 }, (_, i) => ({
        number: i + 1,
        isOccupied: false,
        isSelected: false,
        passengerName: null
      }));

      // پر کردن اطلاعات صندلی‌های اشغال شده
      allBookings.forEach(booking => {
        if (booking.selectedSeats) {
          booking.selectedSeats.forEach(seatNumber => {
            const seat = seats.find(s => s.number === seatNumber);
            if (seat) {
              seat.isOccupied = true;
              seat.passengerName = booking.mainPassengerName;
            }
          });
        }
      });

      res.json(seats);
    } catch (error) {
      res.status(500).json({ 
        message: "خطایی در دریافت اطلاعات صندلی‌ها رخ داده است." 
      });
    }
  });
  
  // Get all caravans
  app.get("/api/caravans", async (req, res) => {
    try {

      const caravansRes = await fetch(DjangoBackendURL+"/api/caravans") 

      if(caravansRes.status != 200){
        throw("status : " + caravansRes.status+ " request : "+ DjangoBackendURL+"/api/caravans/");
      }
      const caravans = await caravansRes.json();

      

      // const caravans = await storage.getCaravans();
      
      // Apply filters if provided
      let filteredCaravans = [...caravans];
      console.log("-----------");
      console.log(req.query);
      console.log("-----------");
      if (req.query.departure_date && req.query.departure_date !== "all") {
        filteredCaravans = filteredCaravans.filter(
          caravan => caravan.departure_date === req.query.departure_date
        );
      }
      
      if (req.query.duration && req.query.duration !== "all") {
        filteredCaravans = filteredCaravans.filter(
          caravan => caravan.duration === parseInt(req.query.duration as string)
        );
      }
      
      if (req.query.transportation_type && req.query.transportation_type !== "all") {
        filteredCaravans = filteredCaravans.filter(
          caravan => caravan.transportation_type === req.query.transportation_type
        );
      }
      
      if (req.query.price_range && req.query.price_range !== "all") {
        const range = req.query.price_range as string;
        
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
    } catch (error:any) {
      res.status(500).json({ message: "خطایی در دریافت اطلاعات کاروان‌ها رخ داده است.",
        error:error.toString()
       });
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

      res.status(500).json({ message: "!خطایی در دریافت اطلاعات کاروان رخ داده است.",
        
      });
    }
  });
  
  // Create a booking (روش قدیمی - فقط برای سازگاری با نسخه قبلی)
  app.post("/api/bookings", isAuthenticated, async (req, res) => {
    try {
      const step1Data = bookingStep1Schema.parse(req.body);
      const caravan = await storage.getCaravan(step1Data.caravanId);
      
      if (!caravan) {
        return res.status(404).json({ error: "کاروان یافت نشد" });
      }

      if (caravan.remainingCapacity < step1Data.passengerCount) {
        return res.status(400).json({ error: "ظرفیت کاروان تکمیل شده است" });
      }

      const booking = await storage.createBooking(req.session.userId!, {
        ...step1Data,
        totalPrice: caravan.price * step1Data.passengerCount,
        transportationType: caravan.transportationType,
        userId: req.session.userId!,
        companions: [],
        address: null,
        specialRequests: null,
        selectedSeats: [],
        isPaid: false,
        paymentDate: null,
        paymentReference: null,
        status: "pending",
        currentStep: 1,
        isCompleted: false
      });

      res.json(booking);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      
      console.error("Error creating booking:", error);
      res.status(500).json({ error: "خطا در ایجاد رزرو" });
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
  
  // ===== مسیرهای مربوط به همراهان رزرو =====
  
  // دریافت همراهان یک رزرو
  app.get("/api/bookings/:id/companions", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      
      // بررسی اینکه رزرو متعلق به کاربر جاری باشد
      const booking = await storage.getBooking(bookingId);
      if (!booking || booking.userId !== req.session.userId) {
        return res.status(404).json({ message: "رزرو مورد نظر یافت نشد." });
      }
      
      // بازگرداندن لیست همراهان
      const companions = (booking.companions || []) as unknown as string[];
      
      // تبدیل رشته‌های JSON به آبجکت
      const parsedCompanions = companions.map(companion => {
        try {
          return JSON.parse(companion);
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
      
      res.json(parsedCompanions);
    } catch (error) {
      res.status(500).json({ 
        message: "خطایی در دریافت اطلاعات همراهان رخ داده است." 
      });
    }
  });
  
  // اضافه کردن همراه جدید
  app.post("/api/bookings/:id/companions", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      
      // اعتبارسنجی داده‌های همراه جدید
      const companionData = bookingStep2Schema.shape.companions.element.parse(req.body);
      
      // بررسی اینکه رزرو متعلق به کاربر جاری باشد
      const booking = await storage.getBooking(bookingId);
      if (!booking || booking.userId !== req.session.userId) {
        return res.status(404).json({ message: "رزرو مورد نظر یافت نشد." });
      }
      
      // اضافه کردن همراه جدید
      const companions = (booking.companions || []) as unknown as string[];
      const parsedCompanions = companions.map(companion => {
        try {
          return JSON.parse(companion);
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
      
      // اضافه کردن همراه جدید
      parsedCompanions.push(companionData);
      
      // بروزرسانی رزرو
      const updatedBooking = {
        ...booking,
        companions: parsedCompanions.map(companion => JSON.stringify(companion)),
        updatedAt: new Date()
      };
      
      await storage.saveBookingStep2(bookingId, { companions: parsedCompanions });
      
      res.status(201).json({ 
        message: "همراه جدید با موفقیت اضافه شد.",
        companion: companionData
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      res.status(500).json({ 
        message: "خطایی در اضافه کردن همراه جدید رخ داده است." 
      });
    }
  });
  
  // ویرایش اطلاعات همراه
  app.put("/api/bookings/:id/companions/:index", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const companionIndex = parseInt(req.params.index);
      
      // اعتبارسنجی داده‌های همراه
      const companionData = bookingStep2Schema.shape.companions.element.parse(req.body);
      
      // بررسی اینکه رزرو متعلق به کاربر جاری باشد
      const booking = await storage.getBooking(bookingId);
      if (!booking || booking.userId !== req.session.userId) {
        return res.status(404).json({ message: "رزرو مورد نظر یافت نشد." });
      }
      
      // دریافت لیست همراهان
      const companions = (booking.companions || []) as unknown as string[];
      const parsedCompanions = companions.map(companion => {
        try {
          return JSON.parse(companion);
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
      
      // بررسی وجود همراه با ایندکس مورد نظر
      if (companionIndex < 0 || companionIndex >= parsedCompanions.length) {
        return res.status(404).json({ message: "همراه مورد نظر یافت نشد." });
      }
      
      // بروزرسانی اطلاعات همراه
      parsedCompanions[companionIndex] = companionData;
      
      // بروزرسانی رزرو
      await storage.saveBookingStep2(bookingId, { companions: parsedCompanions });
      
      res.json({ 
        message: "اطلاعات همراه با موفقیت بروزرسانی شد.",
        companion: companionData
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      res.status(500).json({ 
        message: "خطایی در بروزرسانی اطلاعات همراه رخ داده است." 
      });
    }
  });
  
  // حذف همراه
  app.delete("/api/bookings/:id/companions/:index", isAuthenticated, async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const companionIndex = parseInt(req.params.index);
      
      // بررسی اینکه رزرو متعلق به کاربر جاری باشد
      const booking = await storage.getBooking(bookingId);
      if (!booking || booking.userId !== req.session.userId) {
        return res.status(404).json({ message: "رزرو مورد نظر یافت نشد." });
      }
      
      // دریافت لیست همراهان
      const companions = (booking.companions || []) as unknown as string[];
      const parsedCompanions = companions.map(companion => {
        try {
          return JSON.parse(companion);
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
      
      // بررسی وجود همراه با ایندکس مورد نظر
      if (companionIndex < 0 || companionIndex >= parsedCompanions.length) {
        return res.status(404).json({ message: "همراه مورد نظر یافت نشد." });
      }
      
      // حذف همراه
      const removedCompanion = parsedCompanions.splice(companionIndex, 1)[0];
      
      // بروزرسانی رزرو
      await storage.saveBookingStep2(bookingId, { companions: parsedCompanions });
      
      res.json({ 
        message: "همراه با موفقیت حذف شد.",
        companion: removedCompanion
      });
    } catch (error) {
      res.status(500).json({ 
        message: "خطایی در حذف همراه رخ داده است." 
      });
    }
  });
  
  // Create a new caravan
  app.post("/api/caravans", isAuthenticated, async (req, res) => {
    try {
      const caravanData = insertCaravanSchema.parse(req.body);
      const caravan = await storage.createCaravan(caravanData);
      res.status(201).json(caravan);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      
      console.error("Error creating caravan:", error);
      res.status(500).json({ error: "خطا در ایجاد کاروان" });
    }
  });

  app.put("/api/caravans/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const caravanData = insertCaravanSchema.partial().parse(req.body);
      const updatedCaravan = await storage.updateCaravan(id, caravanData);
      
      if (!updatedCaravan) {
        return res.status(404).json({ message: "کاروان مورد نظر یافت نشد." });
      }
      
      res.json(updatedCaravan);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ error: validationError.message });
      }
      
      console.error("Error updating caravan:", error);
      res.status(500).json({ error: "خطا در بروزرسانی کاروان" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
