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
