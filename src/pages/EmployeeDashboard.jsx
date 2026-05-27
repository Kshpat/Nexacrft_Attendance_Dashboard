import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import NotificationToast from '../components/NotificationToast';

const EmployeeDashboard = () => {
  const [session, setSession] = useState(null);
  const [userName, setUserName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeIn, setTimeIn] = useState('');
  const [timeOut, setTimeOut] = useState('');
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
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

    const now = new Date();
    const formattedTime = now.toTimeString().split(' ')[0].substring(0, 5); // e.g. "14:35"

    try {
      const isInsertingIn = !attendanceRecord;
      const isUpdatingOut = attendanceRecord && attendanceRecord.time_in && !attendanceRecord.time_out;

      if (isInsertingIn) {
        const { data, error } = await supabase.from('attendance').insert({
          user_id: session.user.id,
          date: date,
          time_in: formattedTime,
          status: 'partial'
        }).select().single();
        
        if (error) throw error;
        setAttendanceRecord(data);
        setTimeIn(formattedTime);
        
        // Notify admins
        await supabase.from('notifications').insert({
          type: 'clock_in',
          payload: { user_name: userName, time: formattedTime, date: date }
        });

        setToastMessage('Time IN marked successfully!');
      } else if (isUpdatingOut) {
        // Rule 2: Time Out > Time In
        if (formattedTime <= attendanceRecord.time_in) {
          alert("Time OUT must be later than Time IN.");
          return;
        }

        const { data, error } = await supabase.from('attendance').update({
          time_out: formattedTime,
          status: 'present'
        }).eq('id', attendanceRecord.id).select().single();

        if (error) throw error;
        setAttendanceRecord(data);
        setTimeOut(formattedTime);

        // Notify admins
        await supabase.from('notifications').insert({
          type: 'clock_out',
          payload: { user_name: userName, time: formattedTime, date: date }
        });

        setToastMessage('Time OUT marked successfully!');
      }
    } catch (error) {
      console.error('Error submitting attendance:', error);
      alert('Failed to mark attendance.');
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
                {hasClockedIn && <div style={{ fontSize: '12px', color: 'var(--success-color)', marginTop: '6px', fontWeight: '600' }}>✓ Recorded</div>}
              </div>

              {/* Time Out Card */}
              <div className="neo-raised" style={{ padding: '20px', textAlign: 'center', backgroundColor: hasClockedOut ? 'rgba(16, 185, 129, 0.05)' : 'transparent', flex: 1 }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px', display: 'block', marginBottom: '8px' }}>Clock OUT</span>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: hasClockedOut ? 'var(--success-color)' : 'var(--text-secondary)' }}>
                  {hasClockedOut ? timeOut : '--:--'}
                </span>
                {hasClockedOut && <div style={{ fontSize: '12px', color: 'var(--success-color)', marginTop: '6px', fontWeight: '600' }}>✓ Recorded</div>}
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
