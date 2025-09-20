// src/services/settingsService.js
import { db } from '../firebase/config';
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

const SETTINGS_DOC_ID = "config";
const SETTINGS_COLLECTION = "appSettings";

// Define your comprehensive default settings here
const defaultSettings = {
  mangoTypes: [
    { id: 'alphonso', name: 'Alphonso', price: 115, kg: 3, available: true},
    { id: 'banganapalli', name: 'Banganapalli', price: 110, kg: 4, available: true},
    { id: 'immampasand', name: 'Immampasand', price: 125, kg: 4, available: true, },
    { id: 'kesar', name: 'Kesar', price: 115, kg: 3, available: true,},
    { id: 'malgova', name: 'Malgova', price: 115, kg: 3, available: false,},
    { id: 'dasheri', name: 'Dasheri', price: 115, kg: 3, available: true,},
    { id: 'senduram', name: 'Senduram', price: 110, kg: 3, available: true,},
    { id: 'rasalu', name: 'Rasalu', price: 110, kg: 3, available: false,},
  ],  
  deliveryOptions: [
    { id: 'grab', name: 'Grab Delivery', description: "Delivery via Grab Express", baseFee: 15 }, // Example base fee
    { id: 'pickup', name: 'Self Pickup / Own Delivery', baseFee: 0, description: "Customer picks up or arranges own delivery", isDefault: true },
    { id: 'lalamove', name: 'Lalamove', description: "Delivery via Lalamove", baseFee: 18 } // Example base fee
  ],
  momsPhoneNumber: "123456789", // IMPORTANT: Replace with actual number without '+' or spaces for wa.me
  paymentMethods: [
    { "id": "cod", "name": "Cash on Delivery", isDefault: true },
    { "id": "bank_transfer", "name": "Online Bank Transfer" },
    { "id": "e_wallet", "name": "E-Wallet (DuitNow QR)" },
  ],
  defaultGrabFee: 0,
};


export const getAllPromoCodes = async () => {
  try {
    const promoCol = collection(db, "promoCodes");
    const promoSnapshot = await getDocs(promoCol);
    const codes = promoSnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            id: doc.id, 
            ...data,
            // Convert Firestore Timestamps to Date objects if they exist
            validFrom: data.validFrom ? data.validFrom.toDate() : null,
            validUntil: data.validUntil ? data.validUntil.toDate() : null,
        };
    });
    // console.log("Fetched promo codes from 'promoCodes' collection:", codes);
    return codes;
  } catch (error) {
    console.error("Error fetching promo codes from collection:", error);
    return []; // Return empty array on error
  }
};

export const getAppSettings = async () => {
  const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
  try {
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
    //   console.log("Fetched settings from Firestore:", docSnap.data());
      return docSnap.data();
    } else {
      console.warn(`Settings document (${SETTINGS_COLLECTION}/${SETTINGS_DOC_ID}) not found! Creating it with default values.`);
      await setDoc(docRef, defaultSettings);
      console.log("Created default settings document in Firestore.");
      return defaultSettings; 
    }
  } catch (error) {
    console.error("Error in getAppSettings (fetching or creating settings):", error);
    console.warn("Falling back to in-memory default settings due to error.");
    return defaultSettings;
  }
};

export const updateAppSettings = async (newSettings) => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    await setDoc(docRef, newSettings, { merge: true }); 
    console.log("Settings updated successfully in Firestore.");
    return { success: true };
  } catch (e) {
    console.error("Error updating settings: ", e);
    return { success: false, error: e };
  }
};