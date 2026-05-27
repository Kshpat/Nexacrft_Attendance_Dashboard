import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportStructuredPdf = async ({ employeeName, month, year, attendanceData, chartElementId, filename }) => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  let currentY = 15;

  // Header
  pdf.setFontSize(22);
  pdf.setTextColor(99, 102, 241); // Indigo color
  pdf.text('Nexacrft Attendance Report', 14, currentY);
  currentY += 10;
  
  pdf.setFontSize(12);
  pdf.setTextColor(46, 48, 64);
  pdf.text(`Employee: ${employeeName}`, 14, currentY);
  pdf.text(`Period: ${month}/${year}`, 140, currentY);
  currentY += 6;
  pdf.setFontSize(10);
  pdf.setTextColor(88, 90, 104);
  pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, currentY);
  currentY += 15;

  // Summary Metrics
  const present = attendanceData.filter(d => d.status === 'present').length;
  const absent = attendanceData.filter(d => d.status === 'absent').length;
  const partial = attendanceData.filter(d => d.status === 'partial').length;

  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Summary', 14, currentY);
  currentY += 8;
  pdf.setFontSize(11);
  pdf.text(`Present: ${present} days`, 14, currentY);
  pdf.text(`Absent: ${absent} days`, 60, currentY);
  pdf.text(`Partial: ${partial} days`, 106, currentY);
  currentY += 15;

  // Chart (if available)
  if (chartElementId) {
    const chartElement = document.getElementById(chartElementId);
    if (chartElement) {
      try {
        const canvas = await html2canvas(chartElement, { scale: 2, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pdfWidth - 28;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Add text "Visual Overview"
        pdf.setFontSize(12);
        pdf.text('Visual Overview', 14, currentY);
        currentY += 6;
        
        pdf.addImage(imgData, 'PNG', 14, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 15;
      } catch (err) {
        console.error('Chart export failed', err);
      }
    }
  }

  // Check if we need a new page before adding the table
  if (currentY > 250) {
    pdf.addPage();
    currentY = 15;
  }

  // Daily Logs Table
  pdf.setFontSize(12);
  pdf.text('Daily Attendance Log', 14, currentY);
  currentY += 6;

  // Sort data by date
  const sortedData = [...attendanceData].sort((a, b) => new Date(a.date) - new Date(b.date));

  const tableBody = sortedData.map(d => {
    let gpsStatus = '--';
    if (d.time_in || d.time_out) {
      const inStatus = d.time_in ? (d.geofence_verified_in ? 'IN: Verified' : 'IN: Unverified') : '';
      const outStatus = d.time_out ? (d.geofence_verified_out ? 'OUT: Verified' : 'OUT: Unverified') : '';
      gpsStatus = [inStatus, outStatus].filter(Boolean).join(' | ');
    }

    return [
      d.date,
      d.time_in ? d.time_in.substring(0, 5) : '--:--',
      d.time_out ? d.time_out.substring(0, 5) : '--:--',
      gpsStatus,
      d.status.toUpperCase()
    ];
  });

  if (tableBody.length === 0) {
    tableBody.push(['No data found for this period', '', '', '', '']);
  }

  autoTable(pdf, {
    startY: currentY,
    head: [['Date', 'Time IN', 'Time OUT', 'GPS Status', 'Status']],
    body: tableBody,
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241] }, // Indigo
    styles: { fontSize: 10, cellPadding: 4 },
  });

  pdf.save(filename);
};
