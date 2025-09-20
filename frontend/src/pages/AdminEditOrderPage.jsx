// src/pages/AdminEditOrderPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getAppSettings } from '../services/settingsService';
import classes from './AdminEditOrderPage.module.css';
import { FaTrashAlt, FaPlusCircle, FaTags } from 'react-icons/fa'; // Added FaTags

// --- SIMPLIFIED STATUSES ---
const orderStatusesList = ["Ordered", "Collected", "Paid", "Cancelled"]; // Added Cancelled for completeness

const AdminEditOrderPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [appSettings, setAppSettings] = useState(null);
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    const loadInitialSettings = async () => {
      try {
        const settings = await getAppSettings();
        if (settings) {
          setAppSettings(settings);
        } else {
          setError("Failed to load application settings.");
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching app settings:", err);
        setError("Error loading app settings.");
        setLoading(false);
      }
    };
    loadInitialSettings();
  }, []);

  const fetchOrderData = useCallback(async () => {
    if (!orderId || !appSettings) {
      if (!appSettings) setLoading(true);
      else setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);

      if (orderSnap.exists()) {
        const orderData = { id: orderSnap.id, ...orderSnap.data() };
        setOrder(orderData);

        setFormData({
          customerName: orderData.customerDetails?.name || '',
          customerPhone: orderData.customerDetails?.phone || '',
          customerUnitNo: orderData.customerDetails?.unitNo || '',
          customerAddress: orderData.customerDetails?.address || '',
          customerArea: orderData.customerDetails?.area || '',
          deliveryType: orderData.deliveryDetails?.typeId || '',
          deliveryCost: typeof orderData.deliveryDetails?.cost === 'number' ? orderData.deliveryDetails.cost : 0,
          paymentMethod: orderData.preferredPaymentMethod?.id || '',
          orderStatus: orderData.orderStatus || '',
          notes: orderData.orderNotes || '',
          paymentCash: typeof orderData.paymentStatus?.cash === 'number' ? orderData.paymentStatus.cash : 0,
          paymentOnline: typeof orderData.paymentStatus?.onlineTransfer === 'number' ? orderData.paymentStatus.onlineTransfer : 0,
          orderedItems: (orderData.orderedItems || []).map(item => ({
            id: item.id || `temp-${Math.random().toString(36).substr(2, 9)}`,
            name: item.name || 'Unknown Item',
            quantity: typeof item.quantity === 'number' ? item.quantity : 0,
            price: typeof item.pricePerBoxApplied === 'number' ? item.pricePerBoxApplied :
                   (typeof item.originalPricePerBox === 'number' ? item.originalPricePerBox :
                   (typeof item.price === 'number' ? item.price : 0)),
            originalPricePerBox: typeof item.originalPricePerBox === 'number' ? item.originalPricePerBox : (typeof item.price === 'number' ? item.price : 0),
            discountAppliedPerBox: typeof item.discountAppliedPerBox === 'number' ? item.discountAppliedPerBox : 0,
            isDiscountedByPromo: item.isDiscountedByPromo || false,
            itemTotal: typeof item.itemTotal === 'number' ? item.itemTotal : 0,
            kgPerBox: typeof item.kgPerBox === 'number' ? item.kgPerBox : ((appSettings.mangoTypes || []).find(mt => mt.id === item.id)?.kg || 0),
          })),
          // --- STORE THE ORIGINAL DISCOUNT OBJECT FROM THE ORDER ---
          discountApplied: orderData.discountApplied || null,
        });
      } else {
        setError("Order not found.");
        setFormData(null);
      }
    } catch (err) {
      console.error("Error fetching order:", err);
      setError("Failed to load order details.");
      setFormData(null);
    }
    setLoading(false);
  }, [orderId, appSettings]);

  useEffect(() => {
    fetchOrderData();
  }, [fetchOrderData]);

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? parseFloat(value) : value;
    setFormData(prev => {
      if (!prev) return null;
      const newFormData = { ...prev, [name]: isNaN(val) && type === 'number' ? 0 : val };

      // --- If order status is changed to "Paid", also update paymentStatus.isPaid ---
      if (name === 'orderStatus' && val === 'Paid') {
        newFormData.paymentStatus = {
            ...(prev.paymentStatus || {}), // Preserve existing payment amounts
            isPaid: true,
            // Optionally, ensure balance is 0 if marking as Paid via status dropdown
            // balance: 0 
        };
        // if you want to auto-fill payment amounts when "Paid" is selected:
        const { totalOrderAmount } = recalculatedValues; // get current total
        // newFormData.paymentCash = (prev.paymentMethod === 'cod' || !prev.paymentMethod) ? totalOrderAmount : 0;
        // newFormData.paymentOnline = (prev.paymentMethod !== 'cod' && prev.paymentMethod) ? totalOrderAmount : 0;

      } else if (name === 'orderStatus' && val !== 'Paid' && prev.orderStatus === 'Paid') {
        // If changing from "Paid" to something else, mark as not paid
         newFormData.paymentStatus = {
            ...(prev.paymentStatus || {}),
            isPaid: false,
        };
      }
      return newFormData;
    });
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
        if (!prev || !prev.orderedItems) return prev;
        const updatedItems = prev.orderedItems.map((item, i) => {
            if (i === index) {
                const newItem = { ...item, [field]: value };
                if (field === 'quantity' || field === 'price') {
                    const qty = parseFloat(newItem.quantity) || 0;
                    const price = parseFloat(newItem.price) || 0;
                    newItem.itemTotal = qty * price;
                }
                if (field === 'id') {
                    const selectedMangoType = (appSettings.mangoTypes || []).find(m => m.id === value);
                    if (selectedMangoType) {
                        newItem.name = selectedMangoType.name;
                        newItem.price = selectedMangoType.price;
                        newItem.originalPricePerBox = selectedMangoType.price;
                        newItem.kgPerBox = selectedMangoType.kg || 0;
                        newItem.discountAppliedPerBox = 0;
                        newItem.isDiscountedByPromo = false;
                        const qty = parseFloat(newItem.quantity) || 0;
                        newItem.itemTotal = qty * selectedMangoType.price;
                    } else { // Handle if selected mango not found (e.g. "Select Mango")
                        newItem.name = 'Select Mango';
                        newItem.price = 0;
                        newItem.originalPricePerBox = 0;
                        newItem.kgPerBox = 0;
                        newItem.itemTotal = 0;
                    }
                }
                return newItem;
            }
            return item;
        });
        return { ...prev, orderedItems: updatedItems };
    });
};

  const handleRemoveItem = (itemIndexToRemove) => {
    if (window.confirm("Are you sure you want to remove this item?")) {
      setFormData(prev => ({
        ...prev,
        orderedItems: prev.orderedItems.filter((_, index) => index !== itemIndexToRemove)
      }));
    }
  };

  const handleAddItem = () => {
    setFormData(prev => {
      const defaultMango = (appSettings?.mangoTypes || [])[0];
      return {
        ...prev,
        orderedItems: [
          ...(prev.orderedItems || []),
          {
            id: defaultMango?.id || `new-${Date.now()}`,
            name: defaultMango?.name || 'New Item',
            quantity: 1,
            price: defaultMango?.price || 0,
            originalPricePerBox: defaultMango?.price || 0,
            itemTotal: defaultMango?.price || 0,
            kgPerBox: defaultMango?.kg || 0,
            isDiscountedByPromo: false,
            discountAppliedPerBox: 0,
          }
        ]
      };
    });
  };

  const recalculatedValues = useMemo(() => {
    if (!formData || !formData.orderedItems) {
      return { subtotalBeforeDiscount: 0, mangoAmount: 0, totalOrderAmount: 0, balance: 0, isPaid: false, totalDiscountAmount: 0, subtotalAfterDiscount: 0 };
    }

    let currentSubtotalBeforeDiscount = 0;
    let currentMangoAmountAfterPerBoxDiscounts = 0;
    let currentTotalDiscountFromPerBoxItems = 0;

    formData.orderedItems.forEach(item => {
        const quantity = parseFloat(item.quantity) || 0;
        const originalPrice = typeof item.originalPricePerBox === 'number' ? item.originalPricePerBox : (parseFloat(item.price) || 0);
        const currentItemPrice = parseFloat(item.price) || 0; // The price currently set for the item (potentially edited)

        currentSubtotalBeforeDiscount += quantity * originalPrice;
        currentMangoAmountAfterPerBoxDiscounts += quantity * currentItemPrice; // Sum of current item line totals

        // If the item itself says it's discounted by a promo, and has a per-box discount value
        if (item.isDiscountedByPromo && typeof item.discountAppliedPerBox === 'number' && item.discountAppliedPerBox > 0) {
            // This implies item.price already reflects this discount.
            // The discount amount is originalPrice - currentItemPrice
            currentTotalDiscountFromPerBoxItems += quantity * (originalPrice - currentItemPrice);
        }
    });
    
    let effectiveTotalDiscount = 0;
    let finalSubtotalAfterAllDiscounts = currentMangoAmountAfterPerBoxDiscounts; // Start with sum of current item totals

    if (formData.discountApplied) { // If there was an order-level promo
        const promo = formData.discountApplied;
        if (promo.type === "fixed_discount_per_box") {
            effectiveTotalDiscount = currentTotalDiscountFromPerBoxItems;
            // finalSubtotalAfterAllDiscounts is already correct as it's sum of item.itemTotal where item.price is discounted
        } else if (promo.type === "percentage_total") {
            // Apply percentage to the subtotal *before* this specific type of discount.
            // If per-box discounts were also present (unlikely for same promo), this gets complex.
            // Assuming percentage_total applies to the sum of original prices if no per-box discount,
            // or to sum of (already per-box-discounted prices) if they co-exist.
            // For simplicity, let's assume it applies to currentSubtotalBeforeDiscount if no per-box discount,
            // or to currentMangoAmountAfterPerBoxDiscounts if per-box was there.
            // The promo.amountDeducted *should* be the guide from original order.
            // Let's use the stored amountDeducted for non-per-box types.
            effectiveTotalDiscount = parseFloat(promo.amountDeducted) || 0;
            finalSubtotalAfterAllDiscounts = currentSubtotalBeforeDiscount - effectiveTotalDiscount;

        } else if (promo.type === "fixed_amount_total") {
            effectiveTotalDiscount = parseFloat(promo.amountDeducted) || 0;
            finalSubtotalAfterAllDiscounts = currentSubtotalBeforeDiscount - effectiveTotalDiscount;
        }
    }


    const deliveryCost = parseFloat(formData.deliveryCost) || 0;
    const finalTotalOrderAmount = Math.max(0, finalSubtotalAfterAllDiscounts + deliveryCost); // Ensure total is not negative

    const cashPaid = parseFloat(formData.paymentCash) || 0;
    const onlinePaid = parseFloat(formData.paymentOnline) || 0;
    const totalCurrentlyPaid = cashPaid + onlinePaid;
    
    // Balance can be negative if overpaid
    const finalBalance = finalTotalOrderAmount - totalCurrentlyPaid;
    
    // isPaid logic: if status is 'Paid' OR balance is zero or less (and total > 0)
    const finalIsPaid = formData.orderStatus === 'Paid' || (finalBalance <= 0.009 && finalTotalOrderAmount > 0);


    return {
        subtotalBeforeDiscount: currentSubtotalBeforeDiscount,
        totalDiscountAmount: effectiveTotalDiscount,
        subtotalAfterDiscount: finalSubtotalAfterAllDiscounts,
        mangoAmount: finalSubtotalAfterAllDiscounts, // Final amount for mangoes
        totalOrderAmount: finalTotalOrderAmount,
        balance: finalBalance,
        isPaid: finalIsPaid,
    };
  }, [formData]);


  const handleSaveChanges = async () => {
    if (!formData || !order || !appSettings) {
        alert("Order data or settings not loaded. Cannot save.");
        return;
    }
    setLoading(true);
    try {
      const { mangoAmount, totalOrderAmount, balance, isPaid, subtotalBeforeDiscount, totalDiscountAmount, subtotalAfterDiscount } = recalculatedValues;

      if ( (formData.orderedItems || []).some(item => (parseFloat(item.quantity) || 0) < 0 || (parseFloat(item.price) || 0) < 0) ) {
          alert("Item quantity or price cannot be negative.");
          setLoading(false);
          return;
      }

      let finalOrderStatus = formData.orderStatus;
      let finalIsPaidStatus = isPaid;

      // If status is "Paid", ensure isPaid is true.
      // If status is not "Paid" but balance is <=0, it's effectively paid, but keep the chosen status unless it was 'Paid'.
      if (finalOrderStatus === 'Paid') {
          finalIsPaidStatus = true;
      } else if (balance <= 0.009 && totalOrderAmount > 0 && finalOrderStatus !== 'Cancelled') {
          // If balance is paid off, but status isn't 'Paid', consider it 'Collected' if not already.
          // Or, you might decide to automatically set status to 'Paid' here.
          // For now, we'll let `isPaid` reflect payment state, and `orderStatus` be manual unless it's "Paid".
          finalIsPaidStatus = true; // Payment is complete
          // if(finalOrderStatus === "Ordered") finalOrderStatus = "Collected"; // Example: auto-move to collected if paid off
      }


      const updatedData = {
        'customerDetails.name': formData.customerName,
        'customerDetails.phone': formData.customerPhone,
        'customerDetails.unitNo': formData.customerUnitNo,
        'customerDetails.address': formData.customerAddress,
        'customerDetails.area': formData.customerArea,
        'deliveryDetails.typeId': formData.deliveryType,
        'deliveryDetails.optionName': (appSettings.deliveryOptions || []).find(opt => opt.id === formData.deliveryType)?.name || formData.deliveryType,
        'deliveryDetails.cost': parseFloat(formData.deliveryCost) || 0,
        'preferredPaymentMethod.id': formData.paymentMethod,
        'preferredPaymentMethod.name': (appSettings.paymentMethods || []).find(pm => pm.id === formData.paymentMethod)?.name || formData.paymentMethod,
        orderStatus: finalOrderStatus, // Use the potentially adjusted status
        orderNotes: formData.notes,
        orderedItems: formData.orderedItems.map(item => ({
            id: item.id,
            name: item.name,
            quantity: parseFloat(item.quantity) || 0,
            price: parseFloat(item.price) || 0, // This is the current price per box for this item
            originalPricePerBox: parseFloat(item.originalPricePerBox) || 0,
            discountAppliedPerBox: parseFloat(item.discountAppliedPerBox) || 0,
            isDiscountedByPromo: item.isDiscountedByPromo || false,
            // Recalculate itemTotal based on current quantity and price for saving
            itemTotal: (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
            kgPerBox: parseFloat(item.kgPerBox) || 0,
        })),
        subtotalBeforeDiscount: subtotalBeforeDiscount,
        discountApplied: formData.discountApplied ? {
            ...formData.discountApplied,
            amountDeducted: totalDiscountAmount // Use the recalculated total discount
        } : null,
        subtotalAfterDiscount: subtotalAfterDiscount,
        mangoAmount: mangoAmount,
        totalOrderAmount: totalOrderAmount,
        'paymentStatus.cash': parseFloat(formData.paymentCash) || 0,
        'paymentStatus.onlineTransfer': parseFloat(formData.paymentOnline) || 0,
        'paymentStatus.balance': balance,
        'paymentStatus.isPaid': finalIsPaidStatus, // Use the potentially adjusted payment status
      };

      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, updatedData);
      alert("Order updated successfully!");
      fetchOrderData();
    } catch (err) {
      console.error("Error updating order:", err);
      alert("Failed to update order: " + err.message);
    }
    setLoading(false);
  };

  if (loading || !appSettings) return <p className={classes.loadingText}>Loading page data...</p>;
  if (error) return <p className={classes.errorText}>{error}</p>;
  if (!order || !formData) return <p className={classes.loadingText}>Preparing order details...</p>;

  return (
    <div className={classes.pageContainer}>
      <button onClick={() => navigate(-1)} className={`${classes.button} ${classes.backButton}`}>
        ← Back to Orders
      </button>
      <h2 className={classes.pageTitle}>Edit Order: {order.appOrderId}</h2>

      <div className={classes.formGrid}>
        <div className={classes.formSection}> {/* Customer Details */}
          <h3 className={classes.sectionTitle}>Customer Details</h3>
          {/* ... customer input fields ... */}
            <div className={classes.formGroup}><label className={classes.label} htmlFor="customerName">Name:</label><input className={classes.input} type="text" name="customerName" id="customerName" value={formData.customerName} onChange={handleInputChange} /></div>
            <div className={classes.formGroup}><label className={classes.label} htmlFor="customerPhone">Phone:</label><input className={classes.input} type="tel" name="customerPhone" id="customerPhone" value={formData.customerPhone} onChange={handleInputChange} /></div>
            <div className={classes.formGroup}><label className={classes.label} htmlFor="customerUnitNo">Unit No:</label><input className={classes.input} type="text" name="customerUnitNo" id="customerUnitNo" value={formData.customerUnitNo} onChange={handleInputChange} /></div>
            <div className={classes.formGroup}><label className={classes.label} htmlFor="customerAddress">Address:</label><input className={classes.input} type="text" name="customerAddress" id="customerAddress" value={formData.customerAddress} onChange={handleInputChange} /></div>
            <div className={classes.formGroup}><label className={classes.label} htmlFor="customerArea">Area:</label><input className={classes.input} type="text" name="customerArea" id="customerArea" value={formData.customerArea} onChange={handleInputChange} /></div>
        </div>

        <div className={classes.formSection}> {/* Order & Delivery */}
          <h3 className={classes.sectionTitle}>Order & Delivery</h3>
          <div className={classes.formGroup}>
              <label className={classes.label} htmlFor="orderStatus">Order Status:</label>
              <select className={classes.select} name="orderStatus" id="orderStatus" value={formData.orderStatus} onChange={handleInputChange}>
                  {orderStatusesList.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
          </div>
          {/* ... delivery type and cost input fields ... */}
            <div className={classes.formGroup}>
                <label className={classes.label} htmlFor="deliveryType">Delivery Type:</label>
                <select className={classes.select} name="deliveryType" id="deliveryType" value={formData.deliveryType} onChange={handleInputChange}>
                    <option value="">Select Delivery</option>
                    {(appSettings?.deliveryOptions || []).map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                </select>
            </div>
            <div className={classes.formGroup}>
                <label className={classes.label} htmlFor="deliveryCost">Delivery Cost (RM):</label>
                <input className={classes.input} type="number" name="deliveryCost" id="deliveryCost" value={formData.deliveryCost} onChange={handleInputChange} step="0.01" min="0" />
            </div>
        </div>
      </div>

      <div className={`${classes.formSection} ${classes.fullWidthSection}`}> {/* Items */}
        <h3 className={classes.sectionTitle}>Items</h3>
        <div className={classes.itemsTableHeader}>
            <div className={classes.headerItemName}>Mango Type</div>
            <div className={classes.headerItemQty}>Qty</div>
            <div className={classes.headerItemPrice}>Price/Box (RM)</div>
            <div className={classes.headerItemTotal}>Total (RM)</div>
            <div className={classes.headerItemActions}>Action</div>
        </div>
        {(formData.orderedItems || []).map((item, index) => (
          <div key={item.id || `item-${index}`} className={classes.itemEditRow}>
            <div className={classes.itemDetailName}>
                <select
                    value={item.id}
                    onChange={(e) => handleItemChange(index, 'id', e.target.value)}
                    className={classes.itemSelectMango}
                >
                    <option value="">Select Mango</option>
                    {(appSettings.mangoTypes || []).map(mango => (
                        <option key={mango.id} value={mango.id}>{mango.name}</option>
                    ))}
                </select>
                {item.isDiscountedByPromo && <span className={classes.itemDiscountBadge}><FaTags /> Promo</span>}
            </div>
            <div className={classes.itemDetailQty}><input type="number" className={classes.itemQuantityInput} value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)} min="0"/></div>
            <div className={classes.itemDetailPrice}>
                <input type="number" className={classes.itemPriceInput} value={item.price} onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)} step="0.01" min="0"/>
                {item.originalPricePerBox !== item.price && typeof item.originalPricePerBox === 'number' && item.originalPricePerBox > 0 &&
                    <span className={classes.originalPriceSmall}>(Orig: RM {item.originalPricePerBox.toFixed(2)})</span>
                }
            </div>
            <div className={classes.itemDetailTotal}>RM {(item.itemTotal || 0).toFixed(2)}</div>
            <div className={classes.itemDetailActions}><button type="button" onClick={() => handleRemoveItem(index)} className={classes.removeItemButton}><FaTrashAlt /></button></div>
          </div>
        ))}
        <button type="button" onClick={handleAddItem} className={`${classes.button} ${classes.addItemButton}`}><FaPlusCircle style={{marginRight: '5px'}} /> Add Item</button>
        
        <div className={classes.totalsSummary}>
            <p><strong>Subtotal Before Discount:</strong> <span>RM {recalculatedValues.subtotalBeforeDiscount.toFixed(2)}</span></p>
            {/* --- DISPLAY APPLIED DISCOUNT DETAILS --- */}
            {formData.discountApplied && recalculatedValues.totalDiscountAmount > 0 && (
                <p style={{color: '#28a745'}}>
                    <strong>Discount ({formData.discountApplied.code}):</strong> 
                    <span>- RM {recalculatedValues.totalDiscountAmount.toFixed(2)}</span>
                </p>
            )}
            <p><strong>Subtotal After Discount:</strong> <span>RM {recalculatedValues.subtotalAfterDiscount.toFixed(2)}</span></p>
        </div>
      </div>

      <div className={classes.formGrid}>
        <div className={classes.formSection}> {/* Payment */}
          <h3 className={classes.sectionTitle}>Payment</h3>
          {/* ... payment method, cash, online input fields ... */}
           <div className={classes.formGroup}>
                <label className={classes.label} htmlFor="paymentMethod">Payment Method:</label>
                <select className={classes.select} name="paymentMethod" id="paymentMethod" value={formData.paymentMethod} onChange={handleInputChange}>
                    <option value="">Select Method</option>
                    {(appSettings?.paymentMethods || []).map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
                </select>
            </div>
            <div className={classes.formGroup}>
                <label className={classes.label} htmlFor="paymentCash">Cash Paid (RM):</label>
                <input className={classes.input} type="number" name="paymentCash" id="paymentCash" value={formData.paymentCash} onChange={handleInputChange} step="0.01" min="0" />
            </div>
            <div className={classes.formGroup}>
                <label className={classes.label} htmlFor="paymentOnline">Online Paid (RM):</label>
                <input className={classes.input} type="number" name="paymentOnline" id="paymentOnline" value={formData.paymentOnline} onChange={handleInputChange} step="0.01" min="0"/>
            </div>
          <div className={classes.paymentInfo}>
            <p><strong>Balance Due:</strong> <span style={{color: recalculatedValues.balance > 0 ? 'red': 'green'}}>RM {recalculatedValues.balance.toFixed(2)}</span></p>
            <p><strong>Payment Status:</strong> <span style={{color: recalculatedValues.isPaid ? 'green' : 'red'}}>{recalculatedValues.isPaid ? "Paid" : "Pending"}</span></p>
          </div>
        </div>
        <div className={classes.formSection}> {/* Notes */}
          <h3 className={classes.sectionTitle}>Order Notes</h3>
          <textarea className={classes.textarea} name="notes" id="notes" value={formData.notes} onChange={handleInputChange} />
        </div>
      </div>

      <p className={classes.grandTotalText}>
          Recalculated Grand Total: RM {recalculatedValues.totalOrderAmount.toFixed(2)}
      </p>
      <button onClick={handleSaveChanges} disabled={loading} className={`${classes.button} ${classes.saveButton}`}>
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
};

export default AdminEditOrderPage;