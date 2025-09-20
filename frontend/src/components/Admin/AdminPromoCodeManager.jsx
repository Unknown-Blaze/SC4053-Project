// src/components/Admin/AdminPromoCodeManager.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore'; // Added getDoc
import classes from './AdminPromoCodeManager.module.css'; // Create this CSS module

const AdminPromoCodeManager = () => {
  const [promoCodes, setPromoCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Overall loading for promo codes list
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submission
  const [isEditing, setIsEditing] = useState(null);
  const [allMangoTypes, setAllMangoTypes] = useState([]); // For dropdown
  const [loadingMangoTypes, setLoadingMangoTypes] = useState(true);

  const initialFormData = {
    code: '', description: '', isActive: true, validFrom: '', validUntil: '',
    discountType: 'percentage_total',
    discountValue: 0,
    applicableItems: [], // Store as an array
    minOrderAmount: 0, loggedInOnly: false, usageLimit: 0, onePerCustomer: false,
  };
  const [formData, setFormData] = useState(initialFormData);

  const fetchMangoTypes = useCallback(async () => {
    setLoadingMangoTypes(true);
    try {
        const settingsDocRef = doc(db, "appSettings", "config"); // Create a reference
        const settingsDocSnap = await getDoc(settingsDocRef);   // Use getDoc to fetch the document

        if (settingsDocSnap.exists()) {
            const settingsData = settingsDocSnap.data();
            setAllMangoTypes(settingsData.mangoTypes || []);
        } else {
            console.warn("AdminPromoCodeManager: appSettings/config document not found. Cannot populate mango types for promo.");
            setAllMangoTypes([]);
        }
    } catch (error) {
        console.error("Error fetching mango types for promo manager:", error);
        setAllMangoTypes([]);
    }
    setLoadingMangoTypes(false);
  }, []);


  const fetchPromoCodes = useCallback(async () => {
    setIsLoading(true);
    try {
      const promoCol = collection(db, "promoCodes");
      const promoSnapshot = await getDocs(promoCol);
      const codes = promoSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          validFrom: data.validFrom ? data.validFrom.toDate() : null,
          validUntil: data.validUntil ? data.validUntil.toDate() : null,
          applicableItems: Array.isArray(data.applicableItems) ? data.applicableItems : [],
        };
      });
      setPromoCodes(codes);
    } catch (error) {
      console.error("Error fetching promo codes:", error);
      alert("Error fetching promo codes.");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchMangoTypes();
    fetchPromoCodes();
  }, [fetchMangoTypes, fetchPromoCodes]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'discountValue' || name === 'minOrderAmount' || name === 'usageLimit' ? parseFloat(value) || 0 : value)
    }));
  };

  const handleApplicableItemsChange = (selectedOptions) => {
    const values = Array.from(selectedOptions, option => option.value);
    setFormData(prev => ({ ...prev, applicableItems: values }));
  };

  const handleEdit = (promo) => {
    setIsEditing(promo);
    setFormData({
      ...initialFormData, // Start with defaults to clear out old state
      ...promo,
      validFrom: promo.validFrom ? promo.validFrom.toISOString().split('T')[0] : '',
      validUntil: promo.validUntil ? promo.validUntil.toISOString().split('T')[0] : '',
      applicableItems: Array.isArray(promo.applicableItems) ? promo.applicableItems : [],
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      alert("Promo code cannot be empty.");
      return;
    }
    if (formData.discountType === "fixed_discount_per_box" && formData.applicableItems.length === 0) {
        alert("For 'Fixed Discount per Specific Box', you must select at least one applicable mango type.");
        return;
    }
     if (formData.discountValue <= 0) {
        alert("Discount value must be greater than 0.");
        return;
    }

    setIsSubmitting(true);
    const codeId = formData.code.trim().toUpperCase();

    const dataToSave = {
      ...formData,
      code: codeId,
      validFrom: formData.validFrom ? Timestamp.fromDate(new Date(formData.validFrom)) : null,
      validUntil: formData.validUntil ? Timestamp.fromDate(new Date(formData.validUntil + 'T23:59:59')) : null,
      applicableItems: formData.discountType === "fixed_discount_per_box" ? formData.applicableItems : [], // Only save if relevant
    };

    if (!dataToSave.validFrom) delete dataToSave.validFrom;
    if (!dataToSave.validUntil) delete dataToSave.validUntil;

    try {
      const promoRef = doc(db, "promoCodes", codeId);
      if (isEditing && isEditing.id !== codeId) {
         await deleteDoc(doc(db, "promoCodes", isEditing.id));
         // If code changed, usage stats are for a new promo
         dataToSave.timesUsed = 0;
         dataToSave.usedByUsers = [];
      } else if (!isEditing) { // If new
        dataToSave.timesUsed = 0;
        dataToSave.usedByUsers = [];
      } else if (isEditing) { // If editing existing and code DID NOT change, retain usage stats
        dataToSave.timesUsed = isEditing.timesUsed || 0;
        dataToSave.usedByUsers = isEditing.usedByUsers || [];
      }


      await setDoc(promoRef, dataToSave, { merge: true });
      alert(`Promo code "${codeId}" ${isEditing ? 'updated' : 'added'} successfully!`);
      handleCancelEdit();
      fetchPromoCodes();
    } catch (error) {
      console.error("Error saving promo code:", error);
      alert("Error saving promo code: " + error.message);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (codeId) => {
    if (window.confirm(`Are you sure you want to delete promo code "${codeId}"? This action cannot be undone.`)) {
      setIsSubmitting(true); // Use isSubmitting to disable buttons during delete
      try {
        await deleteDoc(doc(db, "promoCodes", codeId));
        alert(`Promo code "${codeId}" deleted successfully.`);
        fetchPromoCodes();
        if (isEditing && isEditing.id === codeId) {
            handleCancelEdit();
        }
      } catch (error) {
        console.error("Error deleting promo code:", error);
        alert("Error deleting promo code.");
      }
      setIsSubmitting(false);
    }
  };

  const toggleActiveStatus = async (promo) => {
    setIsSubmitting(true); // Use isSubmitting to disable buttons
    try {
        const promoRef = doc(db, "promoCodes", promo.id);
        await updateDoc(promoRef, { isActive: !promo.isActive });
        fetchPromoCodes();
    } catch(error) {
        console.error("Error toggling promo status:", error);
        alert("Failed to toggle status.");
    }
    setIsSubmitting(false);
  };


  if (isLoading && promoCodes.length === 0 && !isEditing) return <p className={classes.loadingText}>Loading promo codes...</p>;

  return (
    <div className={classes.container}>
      <h2 className={classes.title}>{isEditing ? `Edit Promo Code: ${isEditing.code}` : 'Add New Promo Code'}</h2>
      <form onSubmit={handleSubmit} className={classes.form}>
        <div className={classes.formRow}>
            <div className={classes.formGroup}>
                <label htmlFor="code">Promo Code (ID - Uppercase, no spaces):</label>
                <input type="text" name="code" id="code" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '')})} required className={classes.inputField} disabled={isSubmitting} />
            </div>
            <div className={classes.formGroup}>
                <label htmlFor="description">Description (for customer):</label>
                <input type="text" name="description" id="description" value={formData.description} onChange={handleInputChange} className={classes.inputField} disabled={isSubmitting} />
            </div>
        </div>
        <div className={classes.formRow}>
            <div className={classes.formGroup}>
                <label htmlFor="discountType">Discount Type:</label>
                <select name="discountType" id="discountType" value={formData.discountType} onChange={handleInputChange} className={classes.selectField} disabled={isSubmitting}>
                  <option value="percentage_total">Percentage off Total Order</option>
                  <option value="fixed_amount_total">Fixed Amount off Total Order</option>
                  <option value="fixed_discount_per_box">Fixed Discount per Specific Box</option>
                </select>
            </div>
            <div className={classes.formGroup}>
                <label htmlFor="discountValue">Discount Value (e.g., 10 for 10% or RM10):</label>
                <input type="number" name="discountValue" id="discountValue" value={formData.discountValue} onChange={handleInputChange} step="0.01" required min="0.01" className={classes.inputField} disabled={isSubmitting} />
            </div>
        </div>

        {formData.discountType === "fixed_discount_per_box" && (
            <div className={classes.formGroupFull}>
                <label htmlFor="applicableItems">Applicable Mango Types (select one or more):</label>
                {loadingMangoTypes ? <p>Loading mango types...</p> :
                    allMangoTypes.length > 0 ? (
                        <select
                            multiple
                            name="applicableItems"
                            id="applicableItems"
                            value={formData.applicableItems}
                            onChange={(e) => handleApplicableItemsChange(e.target.selectedOptions)}
                            className={classes.multiSelectField}
                            size="5"
                            disabled={isSubmitting}
                        >
                            {allMangoTypes.map(mango => (
                                <option key={mango.id} value={mango.id}>{mango.name} (ID: {mango.id})</option>
                            ))}
                        </select>
                    ) : (
                        <p className={classes.errorText}>No mango types found in settings. Please add mango types via Admin Mango Manager or check settings.</p>
                    )
                }
                {formData.applicableItems.length === 0 && !loadingMangoTypes && allMangoTypes.length > 0 && <small className={classes.errorText}>Select at least one mango type for this discount.</small>}
            </div>
        )}

        <div className={classes.formRow}>
            <div className={classes.formGroup}>
                <label htmlFor="validFrom">Valid From (Optional):</label>
                <input type="date" name="validFrom" id="validFrom" value={formData.validFrom} onChange={handleInputChange} className={classes.inputField} disabled={isSubmitting} />
            </div>
            <div className={classes.formGroup}>
                <label htmlFor="validUntil">Valid Until (Optional):</label>
                <input type="date" name="validUntil" id="validUntil" value={formData.validUntil} onChange={handleInputChange} className={classes.inputField} disabled={isSubmitting} />
            </div>
        </div>

        <div className={classes.formRow}>
            <div className={classes.formGroup}>
                <label htmlFor="minOrderAmount">Min. Order Amount (RM, Optional, 0 for none):</label>
                <input type="number" name="minOrderAmount" id="minOrderAmount" value={formData.minOrderAmount} onChange={handleInputChange} step="0.01" min="0" className={classes.inputField} disabled={isSubmitting} />
            </div>
            <div className={classes.formGroup}>
                <label htmlFor="usageLimit">Total Usage Limit (Optional, 0 for unlimited):</label>
                <input type="number" name="usageLimit" id="usageLimit" value={formData.usageLimit} onChange={handleInputChange} min="0" className={classes.inputField} disabled={isSubmitting} />
            </div>
        </div>

        <div className={classes.formChecks}>
            <label className={classes.checkboxLabel}><input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleInputChange} disabled={isSubmitting} /> Active</label>
            <label className={classes.checkboxLabel}><input type="checkbox" name="loggedInOnly" checked={formData.loggedInOnly} onChange={handleInputChange} disabled={isSubmitting} /> Logged-in Users Only</label>
            <label className={classes.checkboxLabel}><input type="checkbox" name="onePerCustomer" checked={formData.onePerCustomer} onChange={handleInputChange} disabled={isSubmitting} /> One Use Per Customer</label>
        </div>


        <div className={classes.formActions}>
            <button type="submit" className={classes.saveButton} disabled={isSubmitting || loadingMangoTypes}>
                {isSubmitting ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Code' : 'Add Code')}
            </button>
            {isEditing && <button type="button" className={classes.cancelButton} onClick={handleCancelEdit} disabled={isSubmitting}>Cancel</button>}
        </div>
      </form>

      <h3 className={classes.listTitle}>Existing Promo Codes ({promoCodes.length})</h3>
      {isLoading && promoCodes.length > 0 && <p className={classes.loadingText}>Refreshing list...</p>}
      <div className={classes.promoList}>
        {promoCodes.length === 0 && !isLoading && <p>No promo codes found. Add one above!</p>}
        {promoCodes.sort((a,b) => a.code.localeCompare(b.code)).map(promo => (
          <div key={promo.id} className={`${classes.promoItem} ${!promo.isActive ? classes.promoItemInactive : ''}`}>
            <div>
              <strong className={classes.promoCodeText}>{promo.code}</strong>
              ({promo.isActive ? <span className={classes.activeStatus}>Active</span> : <span className={classes.inactiveStatus}>Inactive</span>})
              <p className={classes.promoDescription}>{promo.description || <em>No description</em>}</p>
              <small>Type: {promo.discountType.replace(/_/g, ' ')}, Value: {promo.discountValue}{promo.discountType.includes('percentage') ? '%' : ' RM'}</small><br/>
              {promo.discountType === "fixed_discount_per_box" && promo.applicableItems && promo.applicableItems.length > 0 &&
                <><small>Applies to: {promo.applicableItems.map(id => (allMangoTypes.find(m => m.id === id)?.name || `ID:${id}`)).join(', ') || 'N/A'}</small><br /></>
              }
              {promo.minOrderAmount > 0 && <small>Min Order: RM{promo.minOrderAmount.toFixed(2)} </small>}<br/>
              {promo.validFrom && <small>From: {new Date(promo.validFrom).toLocaleDateString('en-GB')} </small>}
              {promo.validUntil && <small>Until: {new Date(promo.validUntil).toLocaleDateString('en-GB')} </small>}<br/>
              <small>Logged In: {promo.loggedInOnly ? 'Yes' : 'No'}, One/Cust: {promo.onePerCustomer ? 'Yes' : 'No'}</small><br/>
              <small>Used: {promo.timesUsed || 0}{promo.usageLimit > 0 ? ` / ${promo.usageLimit}` : ' times'}</small>
              {promo.onePerCustomer && promo.usedByUsers && promo.usedByUsers.length > 0 &&
                <small style={{display:'block',fontSize:'0.7em'}}>Used by: {promo.usedByUsers.length} unique customer(s)</small>
              }
            </div>
            <div className={classes.promoItemActions}>
              <button onClick={() => handleEdit(promo)} className={classes.editButton} disabled={isSubmitting}>Edit</button>
              <button onClick={() => toggleActiveStatus(promo)} className={promo.isActive ? classes.deactivateButton : classes.activateButton} disabled={isSubmitting}>
                {promo.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button onClick={() => handleDelete(promo.id)} className={classes.deleteButton} disabled={isSubmitting}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default AdminPromoCodeManager;