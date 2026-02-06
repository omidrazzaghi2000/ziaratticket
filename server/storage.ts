import { 
  users, type User, type InsertUser, type VerifyUser,
  caravans, type Caravan, type InsertCaravan,
  bookings, type Booking, type InsertBooking, type BookingStep1, type BookingStep2, type BookingStep3,
  contacts, type Contact, type InsertContact,
  newsletters, type Newsletter, type InsertNewsletter
} from "@shared/schema";

export interface IStorage {
  // User methods
  createUser(userData: InsertUser): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  updateUser(id: number, userData: UpdateUser): Promise<User | undefined>;
  setVerificationCode(phone: string, code: string): Promise<User | undefined>;
  verifyUser(verifyData: VerifyUser): Promise<User | undefined>;
  
  // Caravan methods
  createCaravan(caravanData: InsertCaravan): Promise<Caravan>;
  getCaravan(id: number): Promise<Caravan | undefined>;
  getCaravans(): Promise<Caravan[]>;
  updateCaravan(id: number, caravanData: UpdateCaravan): Promise<Caravan | undefined>;
  updateCaravanCapacity(id: number, newCapacity: number): Promise<Caravan | undefined>;
  
  // Booking methods
  createBooking(userId: number, bookingData: InsertBooking): Promise<Booking>;
  saveBookingStep1(userId: number, step1Data: BookingStep1): Promise<Booking>;
  saveBookingStep2(bookingId: number, step2Data: BookingStep2): Promise<Booking | undefined>;
  saveBookingStep3(bookingId: number, data: { address: string; specialRequests?: string; selectedSeats?: number[] }): Promise<Booking | undefined>;
  completeBooking(bookingId: number, selectedSeats?: number[]): Promise<Booking | undefined>;
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
        imageUrl: "/src/assets/images/lantern1.jpg",
        specialTag: "ویژه خانواده‌ها",
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
        imageUrl: "/src/assets/images/lantern2.jpg"
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
        imageUrl: "/src/assets/images/lantern3.jpg"
      },
    ];
    
    sampleCaravans.forEach(caravan => {
      this.createCaravan(caravan);
    });
  }

  // User methods
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

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.phone === phone
    );
  }

  async updateUser(id: number, userData: UpdateUser): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    
    return updatedUser;
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
  async createCaravan(caravanData: InsertCaravan): Promise<Caravan> {
    const id = this.currentCaravanId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    
    const caravan: Caravan = {
      id,
      name: caravanData.name,
      description: caravanData.description,
      price: caravanData.price,
      capacity: caravanData.capacity,
      remainingCapacity: caravanData.capacity,
      startDate: caravanData.startDate,
      endDate: caravanData.endDate,
      transportationType: caravanData.transportationType,
      createdAt,
      updatedAt
    };
    
    this.caravans.set(id, caravan);
    return caravan;
  }

  async getCaravan(id: number): Promise<Caravan | undefined> {
    return this.caravans.get(id);
  }

  async getCaravans(): Promise<Caravan[]> {
    return Array.from(this.caravans.values());
  }

  async updateCaravan(id: number, caravanData: UpdateCaravan): Promise<Caravan | undefined> {
    const caravan = await this.getCaravan(id);
    if (!caravan) return undefined;
    
    const updatedCaravan = { ...caravan, ...caravanData };
    this.caravans.set(id, updatedCaravan);
    
    return updatedCaravan;
  }

  async updateCaravanCapacity(id: number, newCapacity: number): Promise<Caravan | undefined> {
    const caravan = await this.getCaravan(id);
    if (!caravan) return undefined;
    
    const updatedCaravan = { ...caravan, remainingCapacity: newCapacity };
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
      passengerCount: bookingData.passengerCount || 1,
      companions: bookingData.companions || [],
      address: bookingData.address,
      specialRequests: bookingData.specialRequests || null,
      selectedSeats: [],
      totalPrice: bookingData.totalPrice,
      isPaid: false,
      paymentDate: null,
      paymentReference: null,
      status: "pending",
      currentStep: 1,
      isCompleted: false,
      transportationType: bookingData.transportationType,
      createdAt,
      updatedAt
    };
    
    this.bookings.set(id, booking);
    return booking;
  }
  
  async saveBookingStep1(userId: number, step1Data: BookingStep1,caravan:Caravan): Promise<Booking> {
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
      passengerCount: step1Data.passengerCount,
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
      transportationType: caravan.transportationType,
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
  
  async saveBookingStep3(bookingId: number, data: { address: string; specialRequests?: string; selectedSeats?: number[] }): Promise<Booking | undefined> {
    const booking = this.bookings.get(bookingId);
    if (!booking) return undefined;

    const updatedBooking: Booking = {
      ...booking,
      address: data.address,
      specialRequests: data.specialRequests || null,
      selectedSeats: data.selectedSeats || [],
      currentStep: 3,
      updatedAt: new Date()
    };

    this.bookings.set(bookingId, updatedBooking);
    return updatedBooking;
  }
  
  async completeBooking(bookingId: number, selectedSeats?: number[]): Promise<Booking | undefined> {
    const booking = await this.getBooking(bookingId);
    if (!booking) return undefined;
    
    const updatedAt = new Date();
    const updatedBooking: Booking = {
      ...booking,
      status: "completed",
      isCompleted: true,
      currentStep: 3,
      selectedSeats: selectedSeats || [],
      updatedAt
    };
    
    this.bookings.set(bookingId, updatedBooking);
    return updatedBooking;
  }
  
  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }
  
  async getBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values());
  }
  
  async getBookingsByUserId(userId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values())
      .filter(booking => booking.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getBookingsByCaravanId(caravanId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values())
      .filter(booking => booking.caravanId === caravanId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
