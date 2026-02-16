import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query,
  orderBy,
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { WatchListItem } from '../types/WatchList';

class WatchListService {
  private getCollectionRef(userId: string) {
    return collection(db, 'users', userId, 'watchlist');
  }

  async addSymbol(userId: string, symbol: string): Promise<void> {
    try {
      const collectionRef = this.getCollectionRef(userId);
      const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      await addDoc(collectionRef, {
        symbol: symbol.toUpperCase(),
        addedAt: now,
      });
    } catch (error) {
      console.error('Error adding symbol to watchlist:', error);
      throw error;
    }
  }

  async removeSymbol(userId: string, itemId: string): Promise<void> {
    try {
      const docRef = doc(db, 'users', userId, 'watchlist', itemId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error removing symbol from watchlist:', error);
      throw error;
    }
  }

  subscribeToWatchList(
    userId: string,
    callback: (items: WatchListItem[]) => void
  ): Unsubscribe {
    const collectionRef = this.getCollectionRef(userId);
    const q = query(collectionRef, orderBy('addedAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const items: WatchListItem[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as WatchListItem));
      callback(items);
    });
  }
}

export default new WatchListService();
