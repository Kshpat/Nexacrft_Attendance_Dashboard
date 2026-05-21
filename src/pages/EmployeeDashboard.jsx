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

  const generateTimeOptions = () => {
    const options = [];
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0');
      options.push(`${hour}:00`);
      options.push(`${hour}:30`);
    }
    return options;
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

    // Rule 2: Time Out > Time In
    if (attendanceRecord && attendanceRecord.time_in && timeOut) {
      if (timeOut <= attendanceRecord.time_in) {
        alert("Time OUT must be later than Time IN.");
        return;
      }
    }

    try {
      const isUpdatingOut = attendanceRecord && attendanceRecord.time_in && !attendanceRecord.time_out && timeOut;
      const isInsertingIn = !attendanceRecord && timeIn;

      if (isInsertingIn) {
        const { data, error } = await supabase.from('attendance').insert({
          user_id: session.user.id,
          date: date,
          time_in: timeIn,
          status: 'partial'
        }).select().single();
        
        if (error) throw error;
        setAttendanceRecord(data);
        
        // Notify admins
        await supabase.from('notifications').insert({
          type: 'clock_in',
          payload: { user_name: userName, time: timeIn, date: date }
        });

        setToastMessage('Time IN marked successfully!');
      } else if (isUpdatingOut) {
        const { data, error } = await supabase.from('attendance').update({
          time_out: timeOut,
          status: 'present'
        }).eq('id', attendanceRecord.id).select().single();

        if (error) throw error;
        setAttendanceRecord(data);

        // Notify admins
        await supabase.from('notifications').insert({
          type: 'clock_out',
          payload: { user_name: userName, time: timeOut, date: date }
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

  if (loading) return <div>Loading...</div>;

  const timeOptions = generateTimeOptions();
  const canSelectIn = !attendanceRecord || !attendanceRecord.time_in;
  const canSelectOut = attendanceRecord && attendanceRecord.time_in && !attendanceRecord.time_out;

  return (
    <div className="page-container">
      {toastMessage && <NotificationToast message={toastMessage} type="success" onClose={() => setToastMessage('')} />}
      
      <div className="header-row">
        <h2>Hey, {userName}</h2>
        <button onClick={handleLogout} className="neo-button" style={{ backgroundColor: 'transparent', border: '1px solid var(--text-secondary)' }}>Logout</button>
      </div>

      <div className="neo-raised" style={{ marginBottom: '24px', padding: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>Please mark your attendance</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Date</label>
            <input 
              type="date" 
              className="neo-input" 
              value={date}
              disabled // Employees cannot change the date
              style={{ opacity: 0.7, cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-row-2col">
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Time IN</label>
              <select 
                className="neo-input" 
                value={timeIn} 
                onChange={(e) => setTimeIn(e.target.value)}
                disabled={!canSelectIn}
                required={canSelectIn}
              >
                <option value="">Select Time</option>
                {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Time OUT</label>
              <select 
                className="neo-input" 
                value={timeOut} 
                onChange={(e) => setTimeOut(e.target.value)}
                disabled={!canSelectOut}
                required={canSelectOut}
              >
                <option value="">Select Time</option>
                {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            className="neo-button-primary" 
            disabled={(!canSelectIn && !canSelectOut) || (!timeIn && !timeOut)}
          >
            Submit
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
