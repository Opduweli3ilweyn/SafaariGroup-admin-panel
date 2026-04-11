/**
 * Export Utilities for SafaariGroup Admin Panel
 */

export const convertToCSV = (data) => {
    if (!data || !data.length) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [];

    // Header row
    csvRows.push(headers.join(','));

    // Data rows
    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header];
            const escaped = ('' + val).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
};

export const downloadFile = (content, fileName, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.click();
    URL.revokeObjectURL(url);
};

export const exportData = (data, fileName, format = 'csv') => {
    if (format === 'csv') {
        const csvContent = convertToCSV(data);
        downloadFile(csvContent, `${fileName}.csv`, 'text/csv;charset=utf-8;');
    } else {
        const jsonContent = JSON.stringify(data, null, 2);
        downloadFile(jsonContent, `${fileName}.json`, 'application/json;charset=utf-8;');
    }
};

/**
 * Generates a unified master report for both Tickets and Cargo
 */
export const generateUnifiedMasterReport = (tickets, cargo) => {
    // 1. Prepare ticket rows
    const ticketRows = tickets.map((t, index) => ({
        'No.': '', // Placeholder for sequential number
        'Saacada': new Date(t.created_at).toLocaleTimeString(),
        'Nooca': 'TIKIDH',
        'Magaalada Bixitaanka': t.origin?.name || 'Unknown',
        'Magaalada Socodka': t.destination?.name || 'Unknown',
        'Magaca Macmiilka': t.passenger_name,
        'Qiimaha ($)': t.price_paid || 0,
        'Xaaladda': t.status.toUpperCase(),
        '_date': new Date(t.created_at) // For sorting
    }));

    // 2. Prepare cargo rows
    const cargoRows = cargo.map((c) => ({
        'No.': '',
        'Saacada': new Date(c.created_at).toLocaleTimeString(),
        'Nooca': 'XAMUUL',
        'Magaalada Bixitaanka': c.origin?.name || 'Unknown',
        'Magaalada Socodka': c.destination?.name || 'Unknown',
        'Magaca Macmiilka': c.sender_name,
        'Qiimaha ($)': c.price_total || 0,
        'Xaaladda': c.status.toUpperCase(),
        '_date': new Date(c.created_at) // For sorting
    }));

    // 3. Merge and Sort by time
    const merged = [...ticketRows, ...cargoRows].sort((a, b) => a._date - b._date);

    // 4. Add sequential numbers and remove internal sorting key
    const finalData = merged.map((row, i) => {
        const { _date, ...cleanRow } = row;
        return { 'No.': i + 1, ...cleanRow };
    });

    const dateStr = new Date().toISOString().split('T')[0];
    exportData(finalData, `SafaariGroup_Master_Report_${dateStr}`, 'csv');
};
