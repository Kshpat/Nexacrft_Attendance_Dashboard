import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import NotificationToast from '../components/NotificationToast';
import { OFFICE_LAT, OFFICE_LNG, ALLOWED_RADIUS_METERS, calculateDistance, getCurrentCoordinates } from '../utils/geofencing';

const EmployeeDashboard = () => {
  const [session, setSession] = useState(null);
  const [userName, setUserName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeIn, setTimeIn] = useState('');
  const [timeOut, setTimeOut] = useState('');
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [verifyingLocation, setVerifyingLocation] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        setUserName(session.user.user_metadata?.username || session.user.email.split('@')[0]);
        await fetchAttendance(session.user.id, date);
      }
      setLoading(false);
    };
    init();
  }, [date]);

  const fetchAttendance = async (userId, selectedDate) => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('date', selectedDate)
      .maybeSingle();

    if (data) {
      setAttendanceRecord(data);
      setTimeIn(data.time_in ? data.time_in.substring(0, 5) : '');
      setTimeOut(data.time_out ? data.time_out.substring(0, 5) : '');
    } else {
      setAttendanceRecord(null);
      setTimeIn('');
      setTimeOut('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session) return;
    
    // Rule 1: Only current date
    const today = new Date().toISOString().split('T')[0];
    if (date !== today) {
      alert("You can only submit attendance for today.");
      return;
    }

    setVerifyingLocation(true);
    let coords = null;
    let distance = null;
    let verified = false;

    try {
      const pos = await getCurrentCoordinates();
      coords = pos;
      distance = calculateDistance(pos.latitude, pos.longitude, OFFICE_LAT, OFFICE_LNG);
      verified = distance <= ALLOWED_RADIUS_METERS;
    } catch (err) {
      setVerifyingLocation(false);
      alert(err.message);
      return;
    }

    const now = new Date();
    const formattedTime = now.toTimeString().split(' ')[0].substring(0, 5); // e.g. "14:35"

    try {
      const isInsertingIn = !attendanceRecord;
      const isUpdatingOut = attendanceRecord && attendanceRecord.time_in && !attendanceRecord.time_out;

      if (isInsertingIn) {
        const status = verified ? 'present' : 'partial';

        const { data, error } = await supabase.from('attendance').insert({
          user_id: session.user.id,
          date: date,
          time_in: formattedTime,
          status: status,
          latitude_in: coords.latitude,
          longitude_in: coords.longitude,
          geofence_verified_in: verified
        }).select().single();
        
        if (error) throw error;
        setAttendanceRecord(data);
        setTimeIn(formattedTime);
        
        // Notify admins
        await supabase.from('notifications').insert({
          type: 'clock_in',
          payload: { 
            user_name: userName, 
            time: formattedTime, 
            date: date,
            geofence_verified: verified,
            distance: Math.round(distance)
          }
        });

        if (verified) {
          setToastMessage('Clocked IN successfully! (Location Verified)');
        } else {
          setToastMessage(`Clocked IN outside office! Distance: ${Math.round(distance)}m`);
        }
      } else if (isUpdatingOut) {
        // Rule 2: Time Out > Time In
        if (formattedTime <= attendanceRecord.time_in) {
          alert("Time OUT must be later than Time IN.");
          setVerifyingLocation(false);
          return;
        }

        const finalStatus = (attendanceRecord.geofence_verified_in && verified) ? 'present' : 'partial';

        const { data, error } = await supabase.from('attendance').update({
          time_out: formattedTime,
          status: finalStatus,
          latitude_out: coords.latitude,
          longitude_out: coords.longitude,
          geofence_verified_out: verified
        }).eq('id', attendanceRecord.id).select().single();

        if (error) throw error;
        setAttendanceRecord(data);
        setTimeOut(formattedTime);

        // Notify admins
        await supabase.from('notifications').insert({
          type: 'clock_out',
          payload: { 
            user_name: userName, 
            time: formattedTime, 
            date: date,
            geofence_verified: verified,
            distance: Math.round(distance)
          }
        });

        if (verified) {
          setToastMessage('Clocked OUT successfully! (Location Verified)');
        } else {
          setToastMessage(`Clocked OUT outside office! Distance: ${Math.round(distance)}m`);
        }
      }
    } catch (error) {
      console.error('Error submitting attendance:', error);
      alert('Failed to mark attendance.');
    } finally {
      setVerifyingLocation(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return <div>Loading...</div>;

  const hasClockedIn = !!(attendanceRecord && attendanceRecord.time_in);
  const hasClockedOut = !!(attendanceRecord && attendanceRecord.time_out);

  const buttonText = !hasClockedIn 
    ? 'Clock IN Now' 
    : !hasClockedOut 
      ? 'Clock OUT Now' 
      : 'Attendance Completed';

  const isButtonDisabled = hasClockedIn && hasClockedOut;

  return (
    <div className="page-container">
      {toastMessage && <NotificationToast message={toastMessage} type="success" onClose={() => setToastMessage('')} />}
      
      {verifyingLocation && (
        <div className="neo-modal-backdrop" style={{ zIndex: 3000 }}>
          <div className="neo-raised neo-modal-content-narrow" style={{ textAlign: 'center', padding: '32px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '3px solid rgba(99, 102, 241, 0.2)', 
              borderTop: '3px solid var(--accent-color)', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px' 
            }}></div>
            <h3 style={{ marginBottom: '8px' }}>GPS Verification</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Acquiring high-accuracy location data and calculating office proximity...</p>
          </div>
        </div>
      )}

      <div className="header-row">
        <h2>Hey, {userName}</h2>
        <button onClick={handleLogout} className="neo-button" style={{ backgroundColor: 'transparent', border: '1px solid var(--text-secondary)' }}>Logout</button>
      </div>

      <div className="neo-raised" style={{ marginBottom: '24px', padding: '24px' }}>
        <h3 style={{ marginBottom: '16px', textAlign: 'center' }}>Please mark your attendance</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Date</span>
            <span style={{ fontSize: '18px', fontWeight: '600' }}>
              {new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', margin: '12px 0' }}>
            {/* Live Digital Clock */}
            <div className="neo-inset" style={{ padding: '16px 32px', textAlign: 'center', minWidth: '240px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Current Time</span>
              <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--accent-color)', fontFamily: 'monospace' }}>
                {liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            <div className="form-row-2col" style={{ width: '100%' }}>
              {/* Time In Card */}
              <div className="neo-raised" style={{ padding: '20px', textAlign: 'center', backgroundColor: hasClockedIn ? 'rgba(16, 185, 129, 0.05)' : 'transparent', flex: 1 }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px', display: 'block', marginBottom: '8px' }}>Clock IN</span>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: hasClockedIn ? 'var(--success-color)' : 'var(--text-secondary)' }}>
                  {hasClockedIn ? timeIn : '--:--'}
                </span>
                {hasClockedIn && (
                  <div style={{ marginTop: '8px' }}>
                    <span style={{ 
                      fontSize: '11px', 
                      padding: '3px 8px', 
                      borderRadius: '12px',
                      backgroundColor: attendanceRecord?.geofence_verified_in ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: attendanceRecord?.geofence_verified_in ? '#10b981' : '#f59e0b',
                      fontWeight: 'bold'
                    }}>
                      {attendanceRecord?.geofence_verified_in ? '📍 Verified' : '⚠️ Unverified'}
                    </span>
                  </div>
                )}
              </div>

              {/* Time Out Card */}
              <div className="neo-raised" style={{ padding: '20px', textAlign: 'center', backgroundColor: hasClockedOut ? 'rgba(16, 185, 129, 0.05)' : 'transparent', flex: 1 }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px', display: 'block', marginBottom: '8px' }}>Clock OUT</span>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: hasClockedOut ? 'var(--success-color)' : 'var(--text-secondary)' }}>
                  {hasClockedOut ? timeOut : '--:--'}
                </span>
                {hasClockedOut && (
                  <div style={{ marginTop: '8px' }}>
                    <span style={{ 
                      fontSize: '11px', 
                      padding: '3px 8px', 
                      borderRadius: '12px',
                      backgroundColor: attendanceRecord?.geofence_verified_out ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: attendanceRecord?.geofence_verified_out ? '#10b981' : '#f59e0b',
                      fontWeight: 'bold'
                    }}>
                      {attendanceRecord?.geofence_verified_out ? '📍 Verified' : '⚠️ Unverified'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="neo-button-primary" 
            disabled={isButtonDisabled}
            style={{ padding: '14px', fontSize: '16px' }}
          >
            {buttonText}
          </button>
        </form>
      </div>

      <div style={{ textAlign: 'center' }}>
        <Link to="/employee/report" style={{ color: 'var(--accent-color)', textDecoration: 'none' }}>
          View Monthly Report
        </Link>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
