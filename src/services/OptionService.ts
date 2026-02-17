import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  onSnapshot,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Option } from '../types/Option';

/**
 * Firestore service for Options
 * Stores options in Firestore under users/{userId}/options
 * Stores closing prices separately under users/{userId}/optionClosingPrices
 */
export class OptionService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Get collection reference for user's options
   */
  private getCollectionRef() {
    return collection(db, 'users', this.userId, 'options');
  }

  /**
   * Get collection reference for closing prices
   */
  private getClosingPricesRef() {
    return collection(db, 'users', this.userId, 'optionClosingPrices');
  }

  /**
   * Convert Firestore Timestamp to Date string (ISO format)
   */
  private convertTimestampToDate(timestamp: any): string {
    if (!timestamp) return '';
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toISOString();
    }
    if (typeof timestamp === 'string') {
      return timestamp;
    }
    return '';
  }

  /**
   * Convert Firestore document to Option object
   */
  private docToOption(docSnapshot: any): Option {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      userId: data.userId,
      symbol: data.symbol,
      optionType: data.optionType,
      quantity: data.quantity,
      optionPrice: data.optionPrice,
      strikePrice: data.strikePrice,
      expirationDate: data.expirationDate, // Already stored as YYYY-MM-DD string
      createdAt: this.convertTimestampToDate(data.createdAt)
    };
  }

  /**
   * Get all options for the user
   */
  async getAll(): Promise<Option[]> {
    try {
      const q = query(this.getCollectionRef(), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.docToOption(doc));
    } catch (error) {
      console.error('Error getting options from Firestore:', error);
      throw error;
    }
  }

  /**
   * Add a new option
   */
  async add(option: Omit<Option, 'id' | 'userId' | 'createdAt'>): Promise<Option> {
    try {
      const docData = {
        userId: this.userId,
        symbol: option.symbol,
        optionType: option.optionType,
        quantity: option.quantity,
        optionPrice: option.optionPrice,
        strikePrice: option.strikePrice,
        expirationDate: option.expirationDate, // Store as YYYY-MM-DD string
        createdAt: Timestamp.now()
      };

      const docRef = await addDoc(this.getCollectionRef(), docData);
      
      return {
        id: docRef.id,
        userId: this.userId,
        createdAt: new Date().toISOString(),
        ...option
      };
    } catch (error) {
      console.error('Error adding option to Firestore:', error);
      throw error;
    }
  }

  /**
   * Delete an option
   */
  async delete(optionId: string): Promise<void> {
    try {
      const docRef = doc(this.getCollectionRef(), optionId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting option from Firestore:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates for options
   */
  subscribeToChanges(callback: (options: Option[]) => void): () => void {
    const q = query(this.getCollectionRef(), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const options = querySnapshot.docs.map(doc => this.docToOption(doc));
        console.log('OptionService: snapshot received,', options.length, 'options');
        callback(options);
      },
      (error) => {
        console.error('Error in options subscription:', error);
      }
    );

    return unsubscribe;
  }

  /**
   * Store closing price for an option symbol
   */
  async saveClosingPrice(optionSymbol: string, closingPrice: number): Promise<void> {
    try {
      const docRef = doc(this.getClosingPricesRef(), optionSymbol);
      await setDoc(docRef, {
        symbol: optionSymbol,
        closingPrice,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error saving closing price:', error);
      throw error;
    }
  }

  /**
   * Get closing price for an option symbol
   */
  async getClosingPrice(optionSymbol: string): Promise<number | null> {
    try {
      const docRef = doc(this.getClosingPricesRef(), optionSymbol);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data().closingPrice;
      }
      return null;
    } catch (error) {
      console.error('Error getting closing price:', error);
      return null;
    }
  }

  /**
   * Get all closing prices
   */
  async getAllClosingPrices(): Promise<Map<string, number>> {
    try {
      const querySnapshot = await getDocs(this.getClosingPricesRef());
      const prices = new Map<string, number>();
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        prices.set(data.symbol, data.closingPrice);
      });
      
      return prices;
    } catch (error) {
      console.error('Error getting all closing prices:', error);
      return new Map();
    }
  }
}
