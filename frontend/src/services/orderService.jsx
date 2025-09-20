// src/services/orderService.js
import { db } from '../firebase/config';
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";

/**
 * Adds a new order to Firestore.
 * @param {object} orderData - The data for the new order.
 * Expected structure for orderData:
 * {
 *   customer: { name, phone, unitNo, address, area },
 *   items: [ { id, name, quantity, price, itemTotal } ], // price is price_at_time_of_order
 *   delivery: {
 *     typeId: 'grab', // ID of the delivery option from settings
 *     optionName: 'Grab Delivery', // Name of the delivery option
 *     cost: 7.00
 *   },
 *   notes: "Optional customer notes",
 *   mangoSubtotal: 345.00, // Sum of all itemTotals
 *   totalAmount: 352.00 // mangoSubtotal + delivery.cost
 * }
 */
export const addOrderToFirestore = async (orderData) => { // orderData IS orderDetailsToSave
  try {
    // console.log("orderService: Received orderData:", JSON.parse(JSON.stringify(orderData)));

    const datePrefix = new Date().toLocaleDateString('en-CA').replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const generatedAppOrderId = `ORD-${datePrefix}-${randomSuffix}`;

    const orderToSaveToFirestore = {
      appOrderId: generatedAppOrderId,
      customerDetails: orderData.customer, // Renamed from 'customer' in form to 'customerDetails' in DB
      orderedItems: orderData.items,
      deliveryDetails: orderData.delivery,
      orderNotes: orderData.notes || "",

      // Financials
      subtotalBeforeDiscount: orderData.subtotalBeforeDiscount, // Add this
      discountApplied: orderData.discountApplied,             // Add this (will be null if no discount)
      subtotalAfterDiscount: orderData.subtotalAfterDiscount,   // Add this
      mangoAmount: orderData.mangoAmount, // CORRECTED: This is the final amount for mangoes after discount
      deliveryCost: orderData.delivery.cost, // Keep this as is, or use deliveryDetails.cost
      totalOrderAmount: orderData.totalAmount, // This is the grand total

      userId: orderData.userId || null,
      preferredPaymentMethod: {
        id: orderData.paymentMethodId,
        name: orderData.paymentMethodName,
      },
      paymentStatus: {
        onlineTransfer: 0,
        cash: 0,
        balance: orderData.totalAmount, // Correct: balance is initially the full totalAmount
        isPaid: false,
      },
      orderStatus: orderData.orderStatus || "Ordered", // Use status from form or default
      createdAt: serverTimestamp(),
      // Optional: include placedByAdmin if you need it in the DB directly
      // placedByAdmin: orderData.placedByAdmin 
    };

    // console.log("orderService: Object being saved to Firestore (orderToSaveToFirestore):", JSON.parse(JSON.stringify(orderToSaveToFirestore)));

    const docRef = await addDoc(collection(db, "orders"), orderToSaveToFirestore);
    console.log("Order written to Firestore with ID: ", docRef.id, "and App Order ID:", generatedAppOrderId);
    return { success: true, firestoreId: docRef.id, appOrderId: generatedAppOrderId }; // ensure appOrderId is returned if needed by caller
  } catch (e) {
    console.error("Error adding order to Firestore: ", e);
    console.error("Data that caused error in addDoc (orderToSaveToFirestore was):", JSON.parse(JSON.stringify(orderToSaveToFirestore))); // Log the object being sent
    console.error("Original data received by function (orderData was):", JSON.parse(JSON.stringify(orderData)));
    return { success: false, error: e.message }; // Return e.message for better error propagation
  }
};

// --- Functions for Admin Panel (you'll need these later) ---

export const getAllOrders = async () => {
  try {
    const ordersCol = collection(db, "orders");
    // Order by 'createdAt' in descending order to get newest orders first
    const q = query(ordersCol, orderBy("createdAt", "desc"));
    const orderSnapshot = await getDocs(q);
    const orderList = orderSnapshot.docs.map(doc => ({
      id: doc.id, // This is the Firestore document ID
      ...doc.data()
    }));
    return orderList;
  } catch (error) {
    console.error("Error fetching all orders:", error);
    return []; // Return empty array on error
  }
};


export const updateOrder = async (firestoreDocId, updatedData) => {
  try {
    const orderRef = doc(db, "orders", firestoreDocId);
    await updateDoc(orderRef, updatedData);
    console.log("Order updated successfully:", firestoreDocId);
    return { success: true };
  } catch (error) {
    console.error("Error updating order:", error);
    return { success: false, error };
  }
};
// Example usage for updating payment:
// updateOrder(order.id, {
//   'paymentStatus.onlineTransfer': newOnlineAmount,
//   'paymentStatus.cash': newCashAmount,
//   'paymentStatus.balance': newBalance,
//   'paymentStatus.isPaid': newIsPaid,
// });
// Example usage for updating status:
// updateOrder(order.id, { orderStatus: 'Confirmed' });


export const deleteOrderInFirestore = async (firestoreDocId) => {
  try {
    const orderRef = doc(db, "orders", firestoreDocId);
    await deleteDoc(orderRef);
    console.log("Order deleted successfully:", firestoreDocId);
    return { success: true };
  } catch (error) {
    console.error("Error deleting order:", error);
    return { success: false, error };
  }
};