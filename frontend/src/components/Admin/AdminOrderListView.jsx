// src/components/Admin/AdminOrderListView.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import classes from './AdminOrderListView.module.css';
import { FaRegEdit, FaRegListAlt, FaUndo, FaTags, FaTrashAlt } from 'react-icons/fa'; // Added FaTags
import { deleteOrderInFirestore } from '../../services/orderService'; // Adjust path if needed

const orderStatuses = ["Ordered", "Collected", "Paid"]; // Match AdminEditOrderPage

const getStatusBadgeStyle = (status) => {
    let backgroundColor = '#6c757d';
    let color = 'white';
    switch (status) {
        case 'Ordered': backgroundColor = '#ffc107'; color = '#212529'; break;
        case 'Confirmed': backgroundColor = '#17a2b8'; color = 'white'; break;
        case 'Preparing': backgroundColor = '#fd7e14'; color = 'white'; break;
        case 'Out for Delivery': backgroundColor = '#6610f2'; color = 'white'; break;
        case 'Collected': backgroundColor = '#007bff'; color = 'white'; break;
        case 'Cancelled': backgroundColor = '#6c757d'; color = 'white'; break;
        default: backgroundColor = '#6c757d'; color = 'white'; break;
    }
    return { backgroundColor, color };
};

const AdminOrderListView = ({ title, orders, onUpdateOrder, loading, onOrderDeleted }) => {
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState({});

  const toggleItems = (orderId, e) => {
    e.stopPropagation();
    setExpandedItems(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const handleStatusChange = async (orderId, newStatus, currentOrder, e) => {
    e.stopPropagation();
    if (newStatus === "Cancelled") { // Check if the intent is to cancel
        if (window.confirm(`Are you sure you want to CANCEL and DELETE order ${currentOrder.appOrderId}? This action is permanent.`)) {
            const result = await deleteOrderInFirestore(orderId);
            if (result.success) {
                alert(`Order ${currentOrder.appOrderId} cancelled and deleted successfully.`);
                if (onOrderDeleted) {
                    onOrderDeleted(orderId); // Notify parent to refetch/update list
                }
                // Potentially, revert promo code usage here if the order had one
                if (currentOrder.discountApplied && currentOrder.discountApplied.code) {
                    // TODO: Implement revertPromoCodeUsage(currentOrder.discountApplied.code, currentOrder.userId)
                    console.warn(`Order ${currentOrder.appOrderId} with promo ${currentOrder.discountApplied.code} was deleted. Promo usage should be reverted if applicable.`);
                }
            } else {
                alert(`Failed to delete order ${currentOrder.appOrderId}: ${result.error?.message || 'Unknown error'}`);
            }
        }
    } else {
        onUpdateOrder(orderId, { orderStatus: newStatus });
    }
  };

  const handleCardClick = (orderId) => {
    navigate(`/admin/order/${orderId}`);
  };

  const handlePaymentToggle = (order, markAsPaid, e) => {
    e.stopPropagation();
    let paymentData;
    if (markAsPaid) {
      paymentData = {
        cash: order.preferredPaymentMethod?.id === 'cod' ? order.totalOrderAmount : (order.paymentStatus?.cash || 0),
        onlineTransfer: order.preferredPaymentMethod?.id !== 'cod' ? order.totalOrderAmount : (order.paymentStatus?.onlineTransfer || 0),
        balance: 0,
        isPaid: true,
      };
       // If totalOrderAmount is 0, ensure cash/online are also 0
      if (order.totalOrderAmount === 0) {
        paymentData.cash = 0;
        paymentData.onlineTransfer = 0;
      }
    } else {
      paymentData = {
        cash: 0,
        onlineTransfer: 0,
        balance: order.totalOrderAmount,
        isPaid: false,
      };
    }
    onUpdateOrder(order.id, { paymentStatus: paymentData });
  };

  if (loading) return <p style={{textAlign: 'center', padding: '20px'}}>Loading orders...</p>;
  if (!orders || orders.length === 0) return <p style={{textAlign: 'center', padding: '20px'}}>No orders found for "{title}".</p>;

  return (
    <div>
      <h2 className={classes.title}>{title} ({orders.length})</h2>
      {orders.map(order => (
        <div
          key={order.id}
          className={classes.container}
        >
          <div className={classes.header} onClick={() => handleCardClick(order.id)}>
            <span className={classes.customerName}>
              {order.customerDetails?.name} <span className={classes.appOrderId}>({order.appOrderId})</span>
            </span>
            <div className={classes.headerBadges}>
              <span className={classes.statusBadge} style={getStatusBadgeStyle(order.orderStatus)}>
                {order.orderStatus}
              </span>
              <span
                className={classes.statusBadge}
                style={{
                  marginLeft: '8px',
                  backgroundColor: order.paymentStatus?.isPaid ? '#28a745' : '#dc3545',
                  color: 'white'
                }}
              >
                {order.paymentStatus?.isPaid ? "Paid" : "Payment Pending"}
              </span>
            </div>
          </div>

          <div className={classes.summaryLine}><span>Date:</span> <span>{order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('en-GB') : 'N/A'}</span></div>
          
          {/* --- DISPLAY DISCOUNT INFO --- */}
          {order.discountApplied && order.discountApplied.amountDeducted > 0 && (
            <div className={`${classes.summaryLine} ${classes.discountInfo}`}>
              <span><FaTags style={{ marginRight: '4px', color: '#28a745' }} />Discount ({order.discountApplied.code}):</span>
              <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                - RM {order.discountApplied.amountDeducted.toFixed(2)}
              </span>
            </div>
          )}
          {/* ----------------------------- */}

          <div className={classes.summaryLine}><span>Total:</span> <span>RM {order.totalOrderAmount?.toFixed(2)}</span></div>
          <div className={classes.summaryLine}>
            <span>Balance:</span>
            <span style={{ color: order.paymentStatus?.isPaid ? '#28a745' : (order.paymentStatus?.balance > 0 ? '#dc3545' : '#6c757d'), fontWeight: 'bold' }}>
              RM {order.paymentStatus?.balance?.toFixed(2)}
            </span>
          </div>


          <div style={{ marginTop: '8px' }}>
            <span onClick={(e) => toggleItems(order.id, e)} className={classes.itemsToggle}>
              {expandedItems[order.id] ? 'Hide Items' : 'Show Items'} <FaRegListAlt style={{ marginLeft: '4px' }}/>
            </span>
            {expandedItems[order.id] && (
              <div className={classes.itemsListContainer}>
                <ul className={classes.itemsList}>
                  {(order.orderedItems || []).map((item, index) => ( // Added index for key fallback
                    <li key={item.id || `item-${index}`} className={classes.itemsListItem}>
                      {item.name} - {item.quantity} x RM {item.pricePerBoxApplied?.toFixed(2) || item.price?.toFixed(2) || item.originalPricePerBox?.toFixed(2)}
                      {item.isDiscountedByPromo && <span className={classes.itemDiscountTag}>(Promo)</span>}
                      = RM {item.itemTotal?.toFixed(2)}
                    </li>
                  ))}
                </ul>
                {/* Displaying subtotal details if available */}
                {typeof order.subtotalBeforeDiscount === 'number' && (
                    <p className={classes.subtotalDetail}>Original Subtotal: RM {order.subtotalBeforeDiscount.toFixed(2)}</p>
                )}
                 {/* {order.discountApplied && typeof order.discountApplied.amountDeducted === 'number' && order.discountApplied.amountDeducted > 0 && (
                    <p className={classes.subtotalDetail}>Discount ({order.discountApplied.code}): -RM {order.discountApplied.amountDeducted.toFixed(2)}</p>
                )} */}
                {typeof order.subtotalAfterDiscount === 'number' && (
                    <p className={classes.subtotalDetail}>Subtotal After Discount: RM {order.subtotalAfterDiscount.toFixed(2)}</p>
                )}
              </div>
            )}
          </div>

          <div className={classes.actions}>
            <div className={classes.actionGroup}>
              <label htmlFor={`status-summary-${order.id}`} className={classes.actionLabel}>Status:</label>
              <select
                id={`status-summary-${order.id}`}
                value={order.orderStatus}
                // Pass the current order object to handleStatusChange
                onChange={(e) => handleStatusChange(order.id, e.target.value, order, e)}
                className={classes.select}
                onClick={(e) => e.stopPropagation()}
                disabled={order.orderStatus === 'Cancelled'} // Disable if already "Cancelled" (though it would be deleted)
              >
                {/* Dynamically add "Cancelled" if the current status is not yet cancelled,
                    or adjust `orderStatuses` array at the top */}
                {orderStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
                {/* Add Cancelled as an option that triggers deletion */}
                <option value="Cancelled">Cancel & Delete</option>
              </select>
            </div>
             <button
                onClick={(e) => { e.stopPropagation(); handleCardClick(order.id); }}
                className={`${classes.button} ${classes.editButton}`}
             >
                <FaRegEdit style={{marginRight: '4px'}} /> Details / Edit
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
export default AdminOrderListView;