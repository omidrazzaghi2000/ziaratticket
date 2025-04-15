import { 
  users, type User, type InsertUser, type VerifyUser,
  caravans, type Caravan, type InsertCaravan,
  bookings, type Booking, type InsertBooking, type BookingStep1, type BookingStep2, type BookingStep3,
  contacts, type Contact, type InsertContact,
  newsletters, type Newsletter, type InsertNewsletter
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  setVerificationCode(phone: string, code: string): Promise<User | undefined>;
  verifyUser(verifyData: VerifyUser): Promise<User | undefined>;
  
  // Caravan methods
  getCaravans(): Promise<Caravan[]>;
  getCaravan(id: number): Promise<Caravan | undefined>;
  createCaravan(caravan: InsertCaravan): Promise<Caravan>;
  updateCaravanCapacity(id: number, capacity: number): Promise<Caravan | undefined>;
  
  // Booking methods
  createBooking(userId: number, booking: InsertBooking): Promise<Booking>;
  saveBookingStep1(userId: number, step1Data: BookingStep1): Promise<Booking>;
  saveBookingStep2(bookingId: number, step2Data: BookingStep2): Promise<Booking | undefined>;
  saveBookingStep3(bookingId: number, step3Data: BookingStep3): Promise<Booking | undefined>;
  completeBooking(bookingId: number): Promise<Booking | undefined>;
  getBookings(): Promise<Booking[]>;
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByUserId(userId: number): Promise<Booking[]>;
  getBookingsByCaravanId(caravanId: number): Promise<Booking[]>;
  
  // Contact methods
  createContact(contact: InsertContact): Promise<Contact>;
  
  // Newsletter methods
  createNewsletter(newsletter: InsertNewsletter): Promise<Newsletter>;
}

export class MemStorage implements IStorage {
  // Storage maps
  private users: Map<number, User>;
  private caravans: Map<number, Caravan>;
  private bookings: Map<number, Booking>;
  private contacts: Map<number, Contact>;
  private newsletters: Map<number, Newsletter>;
  
  // Current IDs
  private currentUserId: number;
  private currentCaravanId: number;
  private currentBookingId: number;
  private currentContactId: number;
  private currentNewsletterId: number;

  constructor() {
    // Initialize maps
    this.users = new Map();
    this.caravans = new Map();
    this.bookings = new Map();
    this.contacts = new Map();
    this.newsletters = new Map();
    
    // Initialize IDs
    this.currentUserId = 1;
    this.currentCaravanId = 1;
    this.currentBookingId = 1;
    this.currentContactId = 1;
    this.currentNewsletterId = 1;
    
    // Initialize sample caravans
    this.initSampleCaravans();
  }

  // Initialize with sample caravan data
  private initSampleCaravans() {
    const sampleCaravans: InsertCaravan[] = [
      {
        name: "کاروان نور ولایت",
        departureDate: "۱۴۰۲/۰۶/۱۵",
        duration: 10,
        transportationType: "هوایی",
        price: 12500000,
        capacity: 15,
        remainingCapacity: 15,
        accommodationType: "هتل ۴ ستاره",
        accommodationDistance: 200,
        manager: "حاج آقای محمدی",
        description: "کاروان ویژه با امکانات کامل و راهنمایان مجرب",
        popular: true,
        imageUrl: "https://images.unsplash.com/photo-1570263849386-860e4667f841?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
      },
      {
        name: "کاروان وارثین حسینی",
        departureDate: "۱۴۰۲/۰۷/۰۵",
        duration: 14,
        transportationType: "زمینی",
        price: 8900000,
        capacity: 10,
        remainingCapacity: 10,
        accommodationType: "هتل ۳ ستاره",
        accommodationDistance: 500,
        manager: "حاج آقای رضوی",
        description: "کاروان زمینی با قیمت مناسب",
        popular: false,
        imageUrl: "https://images.unsplash.com/photo-1576482293142-462512b42e91?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
      },
      {
        name: "کاروان منتظران نور",
        departureDate: "۱۴۰۲/۰۸/۱۲",
        duration: 21,
        transportationType: "ترکیبی",
        price: 18700000,
        capacity: 20,
        remainingCapacity: 20,
        accommodationType: "هتل ۵ ستاره",
        accommodationDistance: 100,
        manager: "حاج آقای موسوی",
        description: "کاروان لوکس با اقامت در بهترین هتل‌های کربلا",
        popular: false,
        specialTag: "ویژه خانواده‌ها",
        imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
      },
    ];
    
    sampleCaravans.forEach(caravan => {
      this.createCaravan(caravan);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.phone === phone
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const createdAt = new Date();
    const user: User = { 
      id, 
      phone: insertUser.phone,
      fullName: insertUser.fullName || null,
      verificationCode: null, 
      codeExpiry: null, 
      isVerified: false,
      createdAt 
    };
    this.users.set(id, user);
    return user;
  }
  
  async setVerificationCode(phone: string, code: string): Promise<User | undefined> {
    const user = await this.getUserByPhone(phone);
    if (!user) return undefined;
    
    // Set verification code with expiry time (5 minutes from now)
    const codeExpiry = new Date();
    codeExpiry.setMinutes(codeExpiry.getMinutes() + 5);
    
    const updatedUser = { 
      ...user, 
      verificationCode: code, 
      codeExpiry 
    };
    this.users.set(user.id, updatedUser);
    
    return updatedUser;
  }
  
  async verifyUser(verifyData: VerifyUser): Promise<User | undefined> {
    const user = await this.getUserByPhone(verifyData.phone);
    if (!user) return undefined;
    
    // Check if the code matches and hasn't expired
    if (user.verificationCode !== verifyData.code) {
      throw new Error("کد تایید نامعتبر است");
    }
    
    if (user.codeExpiry && user.codeExpiry < new Date()) {
      throw new Error("کد تایید منقضی شده است. لطفا دوباره تلاش کنید");
    }
    
    // Verify the user
    const updatedUser = { 
      ...user, 
      isVerified: true,
      verificationCode: null,
      codeExpiry: null
    };
    this.users.set(user.id, updatedUser);
    
    return updatedUser;
  }
  
  // Caravan methods
  async getCaravans(): Promise<Caravan[]> {
    return Array.from(this.caravans.values());
  }
  
  async getCaravan(id: number): Promise<Caravan | undefined> {
    return this.caravans.get(id);
  }
  
  async createCaravan(insertCaravan: InsertCaravan): Promise<Caravan> {
    const id = this.currentCaravanId++;
    const caravan: Caravan = { ...insertCaravan, id };
    this.caravans.set(id, caravan);
    return caravan;
  }
  
  async updateCaravanCapacity(id: number, capacity: number): Promise<Caravan | undefined> {
    const caravan = this.caravans.get(id);
    if (!caravan) return undefined;
    
    const updatedCaravan = { ...caravan, remainingCapacity: capacity };
    this.caravans.set(id, updatedCaravan);
    
    return updatedCaravan;
  }
  
  // Booking methods
  async createBooking(userId: number, bookingData: InsertBooking): Promise<Booking> {
    const id = this.currentBookingId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    
    const booking: Booking = {
      id,
      userId,
      caravanId: bookingData.caravanId,
      mainPassengerName: bookingData.mainPassengerName,
      mainPassengerId: bookingData.mainPassengerId,
      mainPassengerPhone: bookingData.mainPassengerPhone,
      mainPassengerBirthdate: bookingData.mainPassengerBirthdate,
      companions: bookingData.companions || [],
      address: bookingData.address,
      specialRequests: bookingData.specialRequests || null,
      totalPrice: bookingData.totalPrice,
      isPaid: false,
      paymentDate: null,
      paymentReference: null,
      status: "pending",
      currentStep: 1,
      isCompleted: false,
      createdAt,
      updatedAt
    };
    
    this.bookings.set(id, booking);
    
    // Update caravan capacity
    const caravan = await this.getCaravan(bookingData.caravanId);
    if (caravan) {
      const companions = bookingData.companions || [];
      const totalPeople = companions.length + 1; // Main passenger + companions
      const newCapacity = Math.max(0, caravan.remainingCapacity - totalPeople);
      await this.updateCaravanCapacity(caravan.id, newCapacity);
    }
    
    return booking;
  }
  
  async saveBookingStep1(userId: number, step1Data: BookingStep1): Promise<Booking> {
    const id = this.currentBookingId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    
    // Create a new booking with step 1 data
    const booking: Booking = {
      id,
      userId,
      caravanId: step1Data.caravanId,
      mainPassengerName: step1Data.mainPassengerName,
      mainPassengerId: step1Data.mainPassengerId,
      mainPassengerPhone: step1Data.mainPassengerPhone,
      mainPassengerBirthdate: step1Data.mainPassengerBirthdate,
      companions: [],
      address: '',
      specialRequests: null,
      totalPrice: 0, // Will be calculated later
      isPaid: false,
      paymentDate: null,
      paymentReference: null,
      status: "pending",
      currentStep: 1,
      isCompleted: false,
      createdAt,
      updatedAt
    };
    
    this.bookings.set(id, booking);
    return booking;
  }
  
  async saveBookingStep2(bookingId: number, step2Data: BookingStep2): Promise<Booking | undefined> {
    const booking = await this.getBooking(bookingId);
    if (!booking) return undefined;
    
    // Update booking with step 2 data
    const updatedAt = new Date();
    const updatedBooking: Booking = {
      ...booking,
      companions: step2Data.companions.map(c => JSON.stringify(c)),
      currentStep: 2,
      updatedAt
    };
    
    this.bookings.set(bookingId, updatedBooking);
    return updatedBooking;
  }
  
  async saveBookingStep3(bookingId: number, step3Data: BookingStep3): Promise<Booking | undefined> {
    const booking = await this.getBooking(bookingId);
    if (!booking) return undefined;
    
    // Get caravan details for price calculation
    const caravan = await this.getCaravan(booking.caravanId);
    if (!caravan) return undefined;
    
    // Calculate total price based on number of passengers
    const companions = booking.companions || [];
    const totalPeople = companions.length + 1; // Main passenger + companions
    const totalPrice = caravan.price * totalPeople;
    
    // Update booking with step 3 data
    const updatedAt = new Date();
    const updatedBooking: Booking = {
      ...booking,
      address: step3Data.address,
      specialRequests: step3Data.specialRequests || null,
      totalPrice,
      currentStep: 3,
      updatedAt
    };
    
    this.bookings.set(bookingId, updatedBooking);
    return updatedBooking;
  }
  
  async completeBooking(bookingId: number): Promise<Booking | undefined> {
    const booking = await this.getBooking(bookingId);
    if (!booking) return undefined;
    
    // Set booking as completed
    const updatedAt = new Date();
    const updatedBooking: Booking = {
      ...booking,
      status: "confirmed",
      isCompleted: true,
      updatedAt
    };
    
    this.bookings.set(bookingId, updatedBooking);
    
    // Update caravan capacity
    const caravan = await this.getCaravan(booking.caravanId);
    if (caravan) {
      const companions = booking.companions || [];
      const totalPeople = companions.length + 1; // Main passenger + companions
      const newCapacity = Math.max(0, caravan.remainingCapacity - totalPeople);
      await this.updateCaravanCapacity(caravan.id, newCapacity);
    }
    
    return updatedBooking;
  }
  
  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }
  
  async getBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values());
  }
  
  async getBookingsByUserId(userId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      booking => booking.userId === userId
    );
  }
  
  async getBookingsByCaravanId(caravanId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      booking => booking.caravanId === caravanId
    );
  }
  
  // Contact methods
  async createContact(insertContact: InsertContact): Promise<Contact> {
    const id = this.currentContactId++;
    const createdAt = new Date();
    const contact: Contact = {
      id,
      name: insertContact.name,
      phone: insertContact.phone,
      email: insertContact.email || null,
      subject: insertContact.subject,
      message: insertContact.message,
      createdAt
    };
    this.contacts.set(id, contact);
    return contact;
  }
  
  // Newsletter methods
  async createNewsletter(insertNewsletter: InsertNewsletter): Promise<Newsletter> {
    // Check for duplicate email
    const existingNewsletter = Array.from(this.newsletters.values()).find(
      newsletter => newsletter.email === insertNewsletter.email
    );
    
    if (existingNewsletter) {
      return existingNewsletter;
    }
    
    const id = this.currentNewsletterId++;
    const createdAt = new Date();
    const newsletter: Newsletter = {
      id,
      email: insertNewsletter.email,
      createdAt
    };
    this.newsletters.set(id, newsletter);
    return newsletter;
  }
}

export const storage = new MemStorage();
