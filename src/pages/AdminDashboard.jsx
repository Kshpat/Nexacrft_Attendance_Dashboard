import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useNavigate } from 'react-router-dom';
import NotificationToast from '../components/NotificationToast';

const AdminDashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [missingDate, setMissingDate] = useState('');
  const [missingTimeIn, setMissingTimeIn] = useState('');
  const [missingTimeOut, setMissingTimeOut] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('admin');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmAbsentId, setConfirmAbsentId] = useState(null);
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' or 'employees'
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      fetchEmployees();
    };
    init();

    // Setup realtime subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          handleNewNotification(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleNewNotification = (notif) => {
    const { type, payload } = notif;
    let msg = '';
    if (type === 'clock_in') msg = `${payload.user_name} clocked IN at ${payload.time}`;
    else if (type === 'clock_out') msg = `${payload.user_name} clocked OUT at ${payload.time}`;
    else if (type === 'missing') msg = `Missing attendance generated`;
    
    setNotification({ message: msg, type: type === 'missing' ? 'missing' : 'success' });
  };

  const fetchEmployees = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch ONLY employees from profiles (hide admins)
    const { data: usersData, error: usersError } = await supabase
      .from('profiles')
      .select('id, username, role')
      .eq('role', 'employee');

    if (usersError) {
      console.error("Error fetching users:", usersError);
      alert(`Failed to load users: ${usersError.message}`);
      return;
    }

    console.log("Fetched usersData:", usersData);

    const { data: attData, error: attError } = await supabase
      .from('attendance')
      .select('id, user_id, time_in, time_out, status, geofence_verified_in, geofence_verified_out')
      .eq('date', today);

    if (attError) console.error("Error fetching attendance:", attError);

    const employeeList = (usersData || []).map(u => {
      const att = attData?.find(a => a.user_id === u.id);
      return {
        id: u.id,
        name: u.username || `User ${u.id.substring(0,5)}`,
        role: u.role,
        status: att?.status || 'absent',
        timeIn: att?.time_in || '',
        timeOut: att?.time_out || '',
        verifiedIn: att?.geofence_verified_in || false,
        verifiedOut: att?.geofence_verified_out || false
      };
    });

    setEmployees(employeeList);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleAddMissingEntry = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.from('attendance').upsert({
        user_id: selectedEmp,
        date: missingDate,
        time_in: missingTimeIn,
        time_out: missingTimeOut,
        status: 'present'
      }, { onConflict: 'user_id,date' });

      if (error) throw error;
      
      const empName = employees.find(e => e.id === selectedEmp)?.name || `User ${selectedEmp.substring(0,5)}`;

      await supabase.from('notifications').insert({
        type: 'missing',
        payload: { user_name: empName, date: missingDate, action: 'manual_add' }
      });
      
      setShowMissingModal(false);
      fetchEmployees();
    } catch(err) {
      console.error("Upsert error:", err);
      alert(err.message);
    }
  };

  const handleRemove = async (userId) => {
    try {
      setLoading(true);
      
      // Call the permanent deletion function (deletes from auth.users, profiles, and attendance)
      const { error } = await supabase.rpc('delete_user_permanently', { 
        target_user_id: userId 
      });

      if (error) throw error;
      
      setConfirmDeleteId(null);
      setNotification({ message: 'Employee and account removed permanently', type: 'success' });
      fetchEmployees();
    } catch (err) {
      console.error("Permanent removal error:", err);
      alert(`Removal failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAbsent = async (userId) => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('user_id', userId)
        .eq('date', today);

      if (error) throw error;

      setConfirmAbsentId(null);
      setNotification({ message: 'Employee marked absent for today', type: 'success' });
      fetchEmployees();
    } catch (err) {
      console.error("Error marking absent:", err);
      alert(`Failed to mark absent: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container-wide">
      {notification && (
        <NotificationToast 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}

      <div className="header-row">
        <h2>Admin Dashboard</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setShowMissingModal(true)} className="neo-button-primary">Add Missing Entry</button>
          <button onClick={handleLogout} className="neo-button" style={{ backgroundColor: 'transparent', border: '1px solid var(--text-secondary)' }}>Logout</button>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="tabs-row">
        <button 
          onClick={() => setActiveTab('attendance')} 
          style={{ 
            background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer',
            color: activeTab === 'attendance' ? 'var(--accent-color)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'attendance' ? '2px solid var(--accent-color)' : 'none',
            fontWeight: activeTab === 'attendance' ? 'bold' : 'normal'
          }}
        >
          Today's Attendance
        </button>
        <button 
          onClick={() => setActiveTab('employees')} 
          style={{ 
            background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer',
            color: activeTab === 'employees' ? 'var(--accent-color)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'employees' ? '2px solid var(--accent-color)' : 'none',
            fontWeight: activeTab === 'employees' ? 'bold' : 'normal'
          }}
        >
          Registered Employees
        </button>
      </div>

      <div className="neo-raised" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0 }}>
            {activeTab === 'attendance' ? "Today's Attendance Overview" : "All Registered Employees"}
          </h3>
          {activeTab === 'attendance' && (
            <div style={{ padding: '8px 16px', borderRadius: '20px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontWeight: 'bold', fontSize: '14px' }}>
              Total Present: {employees.filter(e => e.status === 'present').length}
            </div>
          )}
        </div>
        
        {activeTab === 'attendance' ? (
          <div className="table-responsive-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px' }}>Employee</th>
                <th style={{ padding: '12px' }}>Time IN</th>
                <th style={{ padding: '12px' }}>Time OUT</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center' }}>No records found.</td></tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '12px' }}>{emp.name}</td>
                    <td style={{ padding: '12px' }}>
                      {emp.timeIn || '--:--'}
                      {emp.timeIn && (
                        <span style={{ 
                          marginLeft: '8px', 
                          fontSize: '10px', 
                          padding: '2px 6px', 
                          borderRadius: '8px',
                          backgroundColor: emp.verifiedIn ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          color: emp.verifiedIn ? '#10b981' : '#f59e0b',
                          fontWeight: 'bold'
                        }}>
                          {emp.verifiedIn ? 'GPS' : '⚠️ GPS'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {emp.timeOut || '--:--'}
                      {emp.timeOut && (
                        <span style={{ 
                          marginLeft: '8px', 
                          fontSize: '10px', 
                          padding: '2px 6px', 
                          borderRadius: '8px',
                          backgroundColor: emp.verifiedOut ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          color: emp.verifiedOut ? '#10b981' : '#f59e0b',
                          fontWeight: 'bold'
                        }}>
                          {emp.verifiedOut ? 'GPS' : '⚠️ GPS'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px',
                        backgroundColor: emp.status === 'present' ? 'rgba(16, 185, 129, 0.2)' : 
                                        emp.status === 'absent' ? 'rgba(239, 68, 68, 0.2)' : 
                                        'rgba(245, 158, 11, 0.2)',
                        color: emp.status === 'present' ? '#10b981' : 
                               emp.status === 'absent' ? '#ef4444' : 
                               '#f59e0b'
                      }}>
                        {emp.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {emp.status !== 'absent' ? (
                        <button 
                          onClick={() => setConfirmAbsentId(emp.id)} 
                          className="neo-button" 
                          style={{ color: '#ef4444', fontSize: '12px', padding: '4px 8px' }}
                        >
                          Mark Absent
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', opacity: 0.5 }}>--</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        ) : (
          <div className="table-responsive-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px' }}>Name</th>
                <th style={{ padding: '12px' }}>Role</th>
                <th style={{ padding: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <td style={{ padding: '12px' }}>{emp.name}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ fontSize: '12px', opacity: 0.7 }}>{emp.role.toUpperCase()}</span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <button onClick={() => navigate(`/admin/report/${emp.id}`)} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', padding: '4px' }}>
                        View Report
                      </button>
                      {emp.role !== 'super_admin' && (
                        <button 
                          type="button"
                          onClick={() => setConfirmDeleteId(emp.id)} 
                          className="neo-button"
                          style={{ color: '#ef4444', fontSize: '12px', padding: '4px 8px' }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {showMissingModal && (
        <div className="neo-modal-backdrop" style={{ zIndex: 2000 }}>
          <div className="neo-raised neo-modal-content">
            <h3 style={{ marginBottom: '20px' }}>Add Missing Entry</h3>
            <form onSubmit={handleAddMissingEntry}>
              <select className="neo-input" value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} required>
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
              <input type="date" className="neo-input" value={missingDate} onChange={e => setMissingDate(e.target.value)} required />
              <input type="time" className="neo-input" value={missingTimeIn} onChange={e => setMissingTimeIn(e.target.value)} required />
              <input type="time" className="neo-input" value={missingTimeOut} onChange={e => setMissingTimeOut(e.target.value)} required />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={() => setShowMissingModal(false)} className="neo-button" style={{ backgroundColor: 'transparent', border: '1px solid var(--text-secondary)' }}>Cancel</button>
                <button type="submit" className="neo-button-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmDeleteId && (
        <div className="neo-modal-backdrop" style={{ zIndex: 3000 }}>
          <div className="neo-raised neo-modal-content-narrow" style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: '16px' }}>Confirm Removal</h3>
            <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>Are you sure you want to permanently remove this employee? This cannot be undone.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button onClick={() => setConfirmDeleteId(null)} className="neo-button" style={{ backgroundColor: 'transparent', border: '1px solid var(--text-secondary)' }}>Cancel</button>
              <button onClick={() => handleRemove(confirmDeleteId)} className="neo-button" style={{ backgroundColor: '#ef4444', color: 'white' }}>{loading ? 'Removing...' : 'Yes, Remove'}</button>
            </div>
          </div>
        </div>
      )}
      {confirmAbsentId && (
        <div className="neo-modal-backdrop" style={{ zIndex: 3000 }}>
          <div className="neo-raised neo-modal-content-narrow" style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: '16px' }}>Mark as Absent</h3>
            <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>Are you sure you want to mark this employee as absent for today? This will clear today's Clock IN/OUT times.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button onClick={() => setConfirmAbsentId(null)} className="neo-button" style={{ backgroundColor: 'transparent', border: '1px solid var(--text-secondary)' }}>Cancel</button>
              <button onClick={() => handleMarkAbsent(confirmAbsentId)} className="neo-button" style={{ backgroundColor: '#ef4444', color: 'white' }}>{loading ? 'Processing...' : 'Yes, Mark Absent'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
