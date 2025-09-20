// src/components/Admin/AdminMangoManager.jsx
import React, { useState, useEffect } from 'react';
import { getAppSettings, updateAppSettings } from '../../services/settingsService'; // Check path

const styles = { // Basic styles, move to CSS Module
    container: { padding: '20px', backgroundColor: '#fff', borderRadius: '5px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'},
    title: { fontSize: '1.5em', marginBottom: '20px', color: '#333'},
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' },
    th: { border: '1px solid #ddd', padding: '10px', textAlign: 'left', backgroundColor: '#f8f9fa' },
    td: { border: '1px solid #ddd', padding: '8px' },
    input: { width: '90%', padding: '6px', border: '1px solid #ccc', borderRadius: '3px' },
    checkbox: { transform: 'scale(1.2)', marginRight: '5px' },
    button: { padding: '8px 12px', margin: '5px', borderRadius: '4px', cursor: 'pointer', border: 'none', color: 'white' },
    saveButton: { backgroundColor: '#28a745' },
    addButton: { backgroundColor: '#007bff', marginTop: '20px' },
    deleteButton: { backgroundColor: '#dc3545', fontSize: '0.8em', padding: '4px 8px' },
    formRow: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' },
    formLabel: { minWidth: '100px'},
};

const AdminMangoManager = () => {
  const [mangoTypes, setMangoTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // For adding a new mango
  const [newMango, setNewMango] = useState({ id: '', name: '', price: 0, kg: 0, available: true, imageUrl: '' });

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      const settings = await getAppSettings();
      setMangoTypes(settings.mangoTypes || []);
      setIsLoading(false);
    };
    fetchSettings();
  }, []);

  const handleInputChange = (index, field, value, isCheckbox = false) => {
    const updatedMangoTypes = [...mangoTypes];
    updatedMangoTypes[index] = {
      ...updatedMangoTypes[index],
      [field]: isCheckbox ? value : (field === 'price' || field === 'kg' ? parseFloat(value) || 0 : value)
    };
    setMangoTypes(updatedMangoTypes);
  };

  const handleNewMangoChange = (field, value, isCheckbox = false) => {
     setNewMango(prev => ({
         ...prev,
         [field]: isCheckbox ? value : (field === 'price' || field === 'kg' ? parseFloat(value) || 0 : value)
     }));
  };

  const handleAddMango = () => {
     if (!newMango.id || !newMango.name) {
         alert("New mango ID and Name are required.");
         return;
     }
     // Check for duplicate ID
     if (mangoTypes.find(m => m.id.toLowerCase() === newMango.id.toLowerCase())) {
         alert("Mango ID already exists. Please use a unique ID.");
         return;
     }
     setMangoTypes(prev => [...prev, { ...newMango, id: newMango.id.toLowerCase().replace(/\s+/g, '_') }]); // Sanitize ID
     setNewMango({ id: '', name: '', price: 0, kg: 0, available: true, imageUrl: '' }); // Reset form
  };

  const handleDeleteMango = (indexToDelete) => {
     if (window.confirm(`Are you sure you want to delete ${mangoTypes[indexToDelete].name}?`)) {
         setMangoTypes(prev => prev.filter((_, index) => index !== indexToDelete));
     }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    // Here, we update the entire 'mangoTypes' array within the 'appSettings' document
    const success = await updateAppSettings({ mangoTypes: mangoTypes });
    if (success) {
      alert("Mango settings saved successfully!");
    } else {
      alert("Failed to save mango settings.");
    }
    setIsSaving(false);
  };

  if (isLoading) return <p>Loading mango settings...</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Manage Mango Types</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID (Unique, no spaces)</th>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Price (per box)</th>
            <th style={styles.th}>Kg (per box)</th>
            <th style={styles.th}>Image URL (Optional)</th>
            <th style={styles.th}>Available</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {mangoTypes.map((mango, index) => (
            <tr key={mango.id || index}> {/* Use index as key if ID can be temporarily empty during edit */}
              <td style={styles.td}><input type="text" style={styles.input} value={mango.id} onChange={(e) => handleInputChange(index, 'id', e.target.value)} placeholder="unique_id"/></td>
              <td style={styles.td}><input type="text" style={styles.input} value={mango.name} onChange={(e) => handleInputChange(index, 'name', e.target.value)} /></td>
              <td style={styles.td}><input type="number" style={styles.input} value={mango.price} onChange={(e) => handleInputChange(index, 'price', e.target.value)} step="0.01" /></td>
              <td style={styles.td}><input type="number" style={styles.input} value={mango.kg} onChange={(e) => handleInputChange(index, 'kg', e.target.value)} step="0.1" /></td>
              <td style={styles.td}><input type="text" style={styles.input} value={mango.imageUrl || ''} onChange={(e) => handleInputChange(index, 'imageUrl', e.target.value)} placeholder="/images/mango.jpg"/></td>
              <td style={styles.td}><input type="checkbox" style={styles.checkbox} checked={mango.available} onChange={(e) => handleInputChange(index, 'available', e.target.checked, true)} /></td>
              <td style={styles.td}><button style={{...styles.button, ...styles.deleteButton}} onClick={() => handleDeleteMango(index)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
         <h3 style={{...styles.title, fontSize: '1.2em'}}>Add New Mango Type</h3>
         <div style={styles.formRow}><label style={styles.formLabel}>ID:</label><input type="text" style={styles.input} placeholder="unique_mango_id" value={newMango.id} onChange={(e) => handleNewMangoChange('id', e.target.value)} /></div>
         <div style={styles.formRow}><label style={styles.formLabel}>Name:</label><input type="text" style={styles.input} placeholder="Mango Name" value={newMango.name} onChange={(e) => handleNewMangoChange('name', e.target.value)} /></div>
         <div style={styles.formRow}><label style={styles.formLabel}>Price:</label><input type="number" style={styles.input} value={newMango.price} onChange={(e) => handleNewMangoChange('price', e.target.value)} step="0.01" /></div>
         <div style={styles.formRow}><label style={styles.formLabel}>Kg/Box:</label><input type="number" style={styles.input} value={newMango.kg} onChange={(e) => handleNewMangoChange('kg', e.target.value)} step="0.1" /></div>
         <div style={styles.formRow}><label style={styles.formLabel}>Image URL:</label><input type="text" style={styles.input} placeholder="/images/new_mango.jpg" value={newMango.imageUrl} onChange={(e) => handleNewMangoChange('imageUrl', e.target.value)} /></div>
         <div style={styles.formRow}><label style={styles.formLabel}>Available:</label><input type="checkbox" style={styles.checkbox} checked={newMango.available} onChange={(e) => handleNewMangoChange('available', e.target.checked, true)} /></div>
         <button style={{...styles.button, ...styles.addButton}} onClick={handleAddMango}>Add This Mango</button>
      </div>

      <button onClick={handleSaveChanges} disabled={isSaving} style={{...styles.button, ...styles.saveButton, marginTop: '20px', width: '100%'}}>
        {isSaving ? 'Saving...' : 'Save All Changes to Mango Settings'}
      </button>
    </div>
  );
};

export default AdminMangoManager;