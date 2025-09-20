// src/services/promoCodeService.js (or orderService.js if you prefer)
import { db } from '../firebase/config';
import { doc, runTransaction, serverTimestamp, arrayUnion, increment } from "firebase/firestore";

export const updatePromoCodeUsage = async (promoCodeId, userId) => {
  if (!promoCodeId) return;

  const promoRef = doc(db, "promoCodes", promoCodeId);

  try {
    await runTransaction(db, async (transaction) => {
      const promoDoc = await transaction.get(promoRef);
      if (!promoDoc.exists()) {
        // This case should ideally be caught before calling updatePromoCodeUsage
        console.error(`Promo document ${promoCodeId} does not exist! Cannot update usage.`);
        return; // Exit transaction if doc not found
      }

      const promoData = promoDoc.data();
      const updateData = { 
        timesUsed: increment(1) // Atomically increment timesUsed
      };

      // Check usage limit - this check is more for potentially deactivating the promo
      // The primary check if promo is usable should be in OrderForm before applying
      const newTimesUsed = (promoData.timesUsed || 0) + 1;
      if (promoData.usageLimit && promoData.usageLimit > 0 && newTimesUsed >= promoData.usageLimit) {
        updateData.isActive = false; // Deactivate if limit reached or exceeded
        console.log(`Promo code ${promoCodeId} reached usage limit (${newTimesUsed}/${promoData.usageLimit}) and is now inactive.`);
      }

      // Handle onePerCustomer
      if (promoData.onePerCustomer && userId) {
        // Add user to the array if not already present.
        // The check for *preventing* re-use by same user is in OrderForm.
        // This ensures the user ID is recorded.
        if (!promoData.usedByUsers || !promoData.usedByUsers.includes(userId)) {
            updateData.usedByUsers = arrayUnion(userId);
        }
      }
      transaction.update(promoRef, updateData);
    });
    console.log(`Promo code ${promoCodeId} usage updated successfully.`);
  } catch (e) {
    console.error(`Transaction failed for promo usage update on ${promoCodeId}: `, e);
    // Non-critical to order placement, log for monitoring.
  }
};