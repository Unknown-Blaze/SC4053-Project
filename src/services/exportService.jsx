// src/services/exportService.js
import { getAllOrders } from './orderService'; // Assuming this fetches all orders
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import Papa from 'papaparse'; // If you installed papaparse
import { getAppSettings } from './settingsService'; // Import getAppSettings

// Function to trigger CSV download in the browser
const downloadCSV = (csvString, filename) => {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  if (link.download !== undefined) { // feature detection
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

// --- 1. Export Orders ---
export const exportOrdersToCSV = async () => {
  try {
    const [orders, appSettings] = await Promise.all([
      getAllOrders(),
      getAppSettings() // Fetch app settings to get all mango types
    ]);

    if (!orders || orders.length === 0) {
      alert("No orders to export.");
      return;
    }
    if (!appSettings || !appSettings.mangoTypes || appSettings.mangoTypes.length === 0) {
        alert("Mango types settings not found. Cannot generate item columns.");
        return;
    }

    const allMangoTypeIds = appSettings.mangoTypes.map(mango => mango.id);
    const allMangoTypeNames = appSettings.mangoTypes.map(mango => mango.name); // For headers

    // Define the data to be exported for each order
    const dataToExport = orders.map(order => {
      const row = {
        'Order ID': order.appOrderId,
        'Date': order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('en-CA') : '',
        'Customer Name': order.customerDetails?.name,
        'Phone': order.customerDetails?.phone,
        'Unit No': order.customerDetails?.unitNo,
        'Address': order.customerDetails?.address,
        'Area': order.customerDetails?.area,
        // Initialize mango quantity columns
      };

      // Populate quantities for each mango type
      allMangoTypeIds.forEach(mangoId => {
        const mangoName = appSettings.mangoTypes.find(m => m.id === mangoId)?.name || mangoId;
        const orderedItem = (order.orderedItems || []).find(item => item.id === mangoId);
        row[`Qty ${mangoName}`] = orderedItem ? orderedItem.quantity : 0; // Or '' for empty
      });

      // Add other order details after mango quantities
      row['Total Mango Boxes'] = (order.orderedItems || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
      row['Mango Amount (RM)'] = order.mangoAmount?.toFixed(2);
      row['Discount Applied (RM)'] = order.discountApplied?.amountDeducted?.toFixed(2) || '0.00';
      row['Subtotal After Discount (RM)'] = order.subtotalAfterUserDiscount?.toFixed(2) || order.mangoAmount?.toFixed(2);
      row['Delivery Type'] = order.deliveryDetails?.optionName;
      row['Delivery Cost (RM)'] = order.deliveryDetails?.cost?.toFixed(2);
      row['Order Total (RM)'] = order.totalOrderAmount?.toFixed(2);
      row['Payment Method'] = order.preferredPaymentMethod?.name;
      row['Payment Cash (RM)'] = order.paymentStatus?.cash?.toFixed(2);
      row['Payment Online (RM)'] = order.paymentStatus?.onlineTransfer?.toFixed(2);
      row['Balance (RM)'] = order.paymentStatus?.balance?.toFixed(2);
      row['Payment Status'] = order.paymentStatus?.isPaid ? 'Paid' : 'Pending';
      row['Order Status'] = order.orderStatus;
      row['Notes'] = order.orderNotes;
      row['User ID'] = order.userId || '';

      return row;
    });

    // Ensure headers are in a consistent order, including dynamic mango types
    const commonHeaders = [
        'Order ID', 'Date', 'Customer Name', 'Phone', 'Unit No', 'Address', 'Area'
    ];
    const mangoHeaders = allMangoTypeNames.map(name => `Qty ${name}`);
    const trailingHeaders = [
        'Total Mango Boxes', 'Mango Amount (RM)', 'Discount Applied (RM)', 'Subtotal After Discount (RM)',
        'Delivery Type', 'Delivery Cost (RM)', 'Order Total (RM)',
        'Payment Method', 'Payment Cash (RM)', 'Payment Online (RM)', 'Balance (RM)',
        'Payment Status', 'Order Status', 'Notes', 'User ID'
    ];
    const allHeaders = [...commonHeaders, ...mangoHeaders, ...trailingHeaders];


    // Convert JSON to CSV string using Papaparse, explicitly providing headers for order
    const csvString = Papa.unparse(dataToExport, {
        columns: allHeaders // This ensures the column order
    });
    downloadCSV(csvString, `mango_orders_${new Date().toISOString().split('T')[0]}.csv`);

  } catch (error) {
    console.error("Error exporting orders:", error);
    alert("Failed to export orders. See console for details.");
  }
};


// --- 2. Export Users (if you have a 'users' collection) ---
export const exportUsersToCSV = async () => {
  try {
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);
    const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (!users || users.length === 0) {
      alert("No users to export.");
      return;
    }

    const dataToExport = users.map(user => ({
      'User UID': user.uid,
      'Display Name': user.displayName,
      'Email': user.email,
      'Phone': user.phone || '',
      'Default Unit No': user.defaultAddress?.unitNo || '',
      'Default Address': user.defaultAddress?.address || '',
      'Default Area': user.defaultAddress?.area || '',
      'Preferred Payment ID': user.preferredPaymentMethodId || '',
      'Preferred Delivery ID': user.preferredDeliveryTypeId || '',
      'Profile Created At': user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString('en-CA') : '',
    }));

    const csvString = Papa.unparse(dataToExport);
    downloadCSV(csvString, `mango_users_${new Date().toISOString().split('T')[0]}.csv`);

  } catch (error) {
    console.error("Error exporting users:", error);
    alert("Failed to export users. See console for details.");
  }
};