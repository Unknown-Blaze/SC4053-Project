// src/components/Admin/AdminQuickOrderForm.jsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../../firebase/config'; // Your Firebase db instance
import LandingPage from '../LandingPage'; // Your existing customer-facing OrderForm
// You might want a simpler version of OrderForm for admin, or pass a prop to hide certain elements

const styles = { // Basic inline styles - move to AdminQuickOrderForm.module.css
  container: { padding: '20px', backgroundColor: '#fff', borderRadius: '5px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'},
  title: { fontSize: '1.5em', marginBottom: '20px', color: '#333'},
  searchSection: { marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #eee'},
  searchInput: { padding: '10px', marginRight: '10px', border: '1px solid #ccc', borderRadius: '4px', minWidth: '250px'},
  searchButton: { padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'},
  customerList: { listStyle: 'none', padding: 0, marginTop: '10px'},
  customerListItem: { padding: '8px', border: '1px solid #ddd', marginBottom: '5px', borderRadius: '4px', cursor: 'pointer'},
  customerListItemHover: { backgroundColor: '#f0f0f0' }, // For JS hover
  cancelButton: { padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px'},
};

const AdminQuickOrderForm = () => {
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [searchedCustomers, setSearchedCustomers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomerForOrder, setSelectedCustomerForOrder] = useState(null); // To pass to OrderForm
  const [searchError, setSearchError] = useState('');

  const handleCustomerSearch = async () => {
    const searchTermTrimmed = customerSearchTerm.trim();
    if (!searchTermTrimmed) {
      setSearchedCustomers([]);
      setSearchError('Please enter a name or phone to search.');
      return;
    }
    setIsSearching(true);
    setSearchError('');
    setSearchedCustomers([]);

    try {
      const usersRef = collection(db, "users");
      let users = [];

      // --- Search by Name (Starts With) ---
      // Firestore queries are case-sensitive by default.
      // To do a somewhat case-insensitive "starts-with", you query for a range.
      // For example, if searchTerm is "john", you query for >= "john" and < "joh\uf8ff"
      // And also >= "John" and < "Joh\uf8ff" if you want to catch different casings.
      // This gets complex quickly. A simpler approach for "starts-with" is:
      const nameQuery = query(usersRef,
                              where("displayName", ">=", searchTermTrimmed),
                              where("displayName", "<=", searchTermTrimmed + '\uf8ff'), // Matches anything starting with searchTermTrimmed
                              limit(10)); // Limit results for performance

      const nameSnapshot = await getDocs(nameQuery);
      nameSnapshot.forEach(doc => {
        // Add if not already added (in case phone search also finds them)
        if (!users.find(u => u.uid === doc.id)) {
            users.push({ uid: doc.id, ...doc.data() });
        }
      });

      // --- Optional: Search by Phone (Exact Match) ---
      // Phone numbers are usually good for exact matches.
      if (/^\d+$/.test(searchTermTrimmed)) { // Check if search term is numeric (could be a phone)
        const phoneQuery = query(usersRef, where("phone", "==", searchTermTrimmed), limit(5));
        const phoneSnapshot = await getDocs(phoneQuery);
        phoneSnapshot.forEach(doc => {
          if (!users.find(u => u.uid === doc.id)) { // Avoid duplicates if name also matched
            users.push({ uid: doc.id, ...doc.data() });
          }
        });
      }

      if (users.length === 0) {
        setSearchError('No customers found matching your search.');
      }
      setSearchedCustomers(users);

    } catch (error) {
      console.error("Error searching customers:", error);
      setSearchError('Failed to search customers.');
      setSearchedCustomers([]);
    }
    setIsSearching(false);
  };

  const handleSelectCustomer = (customer) => {
    console.log("Selected customer:", customer);
    setSelectedCustomerForOrder({
      userId: customer.uid, // Important for associating the order
      name: customer.displayName || '',
      phone: customer.phone || '',
      unitNo: customer.defaultAddress?.unitNo || '',
      address: customer.defaultAddress?.address || '',
      area: customer.defaultAddress?.area || '',
      paymentMethodId: customer.preferredPaymentMethodId || '',
      deliveryTypeId: customer.preferredDeliveryTypeId || '',
    });
    setCustomerSearchTerm(''); // Clear search input
    setSearchedCustomers([]); // Clear search results
  };

  // When the OrderForm component successfully submits an order,
  // we might want to clear the selectedCustomerForOrder to allow for a new quick order.
  const handleOrderFormSuccess = () => {
      console.log("Admin Quick Order successful, resetting selected customer.");
      setSelectedCustomerForOrder(null);
      // Optionally, navigate back to all orders view or show a success message here
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Create Quick Order</h2>

      {!selectedCustomerForOrder ? (
        <div style={styles.searchSection}>
          <h4>Find Existing Customer (Name or Phone) (CASE SENSITIVE)</h4>
          <input
            type="text"
            style={styles.searchInput}
            placeholder="Search by customer name..."
            value={customerSearchTerm}
            onChange={(e) => setCustomerSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCustomerSearch()}
          />
          <button onClick={handleCustomerSearch} disabled={isSearching} style={styles.searchButton}>
            {isSearching ? 'Searching...' : 'Search Customers'}
          </button>
          {searchError && <p style={{color: 'red', fontSize: '0.9em', marginTop: '5px'}}>{searchError}</p>}
          {searchedCustomers.length > 0 && (
            <ul style={styles.customerList}>
              <p style={{fontWeight: '500', marginTop:'10px'}}>Select a customer to pre-fill details:</p>
              {searchedCustomers.map(cust => (
                <li
                  key={cust.uid}
                  onClick={() => handleSelectCustomer(cust)}
                  style={styles.customerListItem}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = styles.customerListItemHover.backgroundColor}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {cust.displayName} ({cust.email || cust.phone || 'No contact info'})
                </li>
              ))}
            </ul>
          )}
          <p style={{fontSize: '0.9em', color: '#555', marginTop: '15px'}}>
            Or, proceed below to enter details manually for a new or guest customer.
          </p>
        </div>
      ) : (
        <div style={{marginBottom: '15px'}}>
          <h4>Placing Order For: {selectedCustomerForOrder.name} ({selectedCustomerForOrder.phone || 'No Phone'})</h4>
          <button onClick={() => setSelectedCustomerForOrder(null)} style={styles.cancelButton}>
            Clear Selected Customer / Enter Manually
          </button>
        </div>
      )}

      {/* Pass selectedCustomerForOrder and a success callback to LandingPage */}
      <LandingPage
        initialCustomerData={selectedCustomerForOrder}
        isAdminPlacingOrder={true} // New prop to indicate admin context
        onAdminOrderSuccess={handleOrderFormSuccess} // Callback after admin places order
      />
    </div>
  );
};

export default AdminQuickOrderForm;