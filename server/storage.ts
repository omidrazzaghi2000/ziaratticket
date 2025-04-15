import { 
  users, type User, type InsertUser,
  caravans, type Caravan, type InsertCaravan,
  bookings, type Booking, type InsertBooking,
  contacts, type Contact, type InsertContact,
  newsletters, type Newsletter, type InsertNewsletter
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Caravan methods
  getCaravans(): Promise<Caravan[]>;
  getCaravan(id: number): Promise<Caravan | undefined>;
  createCaravan(caravan: InsertCaravan): Promise<Caravan>;
  updateCaravanCapacity(id: number, capacity: number): Promise<Caravan | undefined>;
  
  // Booking methods
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookings(): Promise<Booking[]>;
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

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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
  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = this.currentBookingId++;
    const createdAt = new Date();
    const booking: Booking = { ...insertBooking, id, createdAt };
    this.bookings.set(id, booking);
    
    // Update caravan capacity
    const caravan = await this.getCaravan(insertBooking.caravanId);
    if (caravan) {
      const companions = insertBooking.companions || [];
      const totalPeople = companions.length + 1; // Main passenger + companions
      const newCapacity = Math.max(0, caravan.remainingCapacity - totalPeople);
      await this.updateCaravanCapacity(caravan.id, newCapacity);
    }
    
    return booking;
  }
  
  async getBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values());
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
    const contact: Contact = { ...insertContact, id, createdAt };
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
    const newsletter: Newsletter = { ...insertNewsletter, id, createdAt };
    this.newsletters.set(id, newsletter);
    return newsletter;
  }
}

export const storage = new MemStorage();
