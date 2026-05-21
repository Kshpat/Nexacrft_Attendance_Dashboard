import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Link, useParams } from 'react-router-dom';
import { exportStructuredPdf } from '../utils/pdfExport';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const AdminReport = () => {
  const { userId } = useParams();
  const [attendanceData, setAttendanceData] = useState([]);
  const [employeeName, setEmployeeName] = useState(`User ${userId.substring(0,5)}`);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMonthlyData(userId, month, year);
  }, [userId, month, year]);

  const fetchMonthlyData = async (uid, m, y) => {
    setLoading(true);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', uid)
      .maybeSingle();
      
    if (profileData && profileData.username) {
      setEmployeeName(profileData.username);
    }

    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, '0')}-${lastDay}`;

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', uid)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.error('Error fetching data', error);
      return;
    }
    setAttendanceData(data || []);
    setLoading(false);
  };

  const calculateStats = () => {
    // Monthly Present
    const presentDays = attendanceData.filter(d => d.status === 'present').length;

    // Weekly Hours
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklyData = attendanceData.filter(d => new Date(d.date) >= oneWeekAgo);
    
    let totalMinutes = 0;
    weeklyData.forEach(d => {
      if (d.time_in && d.time_out) {
        const [hIn, mIn] = d.time_in.split(':').map(Number);
        const [hOut, mOut] = d.time_out.split(':').map(Number);
        totalMinutes += (hOut * 60 + mOut) - (hIn * 60 + mIn);
      }
    });

    return {
      presentDays,
      weeklyHours: (totalMinutes / 60).toFixed(1)
    };
  };

  const processChartData = () => {
    const present = attendanceData.filter(d => d.status === 'present').length;
    const absent = attendanceData.filter(d => d.status === 'absent').length;
    const partial = attendanceData.filter(d => d.status === 'partial').length;

    return {
      labels: ['Present', 'Absent', 'Partial'],
      datasets: [
        {
          label: 'Days',
          data: [present, absent, partial],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)', // Green
            'rgba(239, 68, 68, 0.8)', // Red
            'rgba(245, 158, 11, 0.8)' // Orange
          ],
          borderColor: [
            'rgb(16, 185, 129)',
            'rgb(239, 68, 68)',
            'rgb(245, 158, 11)'
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'bottom',
        labels: { usePointStyle: true, padding: 20 }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#1e293b',
        bodyColor: '#475569',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        displayColors: true,
        callbacks: {
          label: (context) => ` ${context.label}: ${context.raw} Days`
        }
      }
    },
    cutout: '70%',
    animation: {
      animateScale: true,
      animateRotate: true
    }
  };

  const stats = calculateStats();

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading report...</div>;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Link to="/admin/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
          &larr; Back to Dashboard
        </Link>
        <button 
          onClick={() => exportStructuredPdf({
            employeeName: employeeName,
            month: month,
            year: year,
            attendanceData: attendanceData,
            chartElementId: 'attendance-chart',
            filename: `Employee_${employeeName.replace(/\s+/g, '_')}_${month}_${year}.pdf`
          })} 
          className="neo-button-primary"
        >
          Export PDF
        </button>
      </div>

      <div className="neo-raised" id="report-container" style={{ padding: '24px' }}>
        <div className="report-header">
          <h2>Monthly Report - {employeeName}</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select className="neo-input" style={{ margin: 0 }} value={month} onChange={e => setMonth(Number(e.target.value))}>
              {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
            <select className="neo-input" style={{ margin: 0 }} value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div className="neo-raised" style={{ padding: '20px', textAlign: 'center', backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Present Days (Month)</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>{stats.presentDays}</div>
          </div>
          <div className="neo-raised" style={{ padding: '20px', textAlign: 'center', backgroundColor: 'rgba(99, 102, 241, 0.05)' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Total Hours (Last 7 Days)</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#6366f1' }}>{stats.weeklyHours}h</div>
          </div>
        </div>

        <div className="report-chart-section">
          <div id="attendance-chart" style={{ width: '300px', height: '300px' }}>
              <Doughnut data={processChartData()} options={chartOptions} />
          </div>
          
          <div style={{ flex: 1, minWidth: '300px' }}>
            <h4 style={{ marginBottom: '16px', opacity: 0.7 }}>Breakdown</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {processChartData().labels.map((label, idx) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                  <span>{label}</span>
                  <span style={{ fontWeight: 'bold' }}>{processChartData().datasets[0].data[idx]} Days</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReport;
