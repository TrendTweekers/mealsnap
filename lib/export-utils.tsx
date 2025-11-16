interface Expense {
  id: string
  merchant: string
  amount: number
  category: string
  date: string
}

export function exportToCSV(expenses: Expense[]): void {
  const headers = ['Date', 'Merchant', 'Amount', 'Category']
  const rows = expenses.map(exp => [
    new Date(exp.date).toLocaleDateString(),
    exp.merchant,
    `$${exp.amount.toFixed(2)}`,
    exp.category
  ])

  // Add referral footer
  const getReferralCode = () => {
    const stored = localStorage.getItem('referralCode')
    if (stored) return stored
    const code = `${Date.now()}`
    localStorage.setItem('referralCode', code)
    return code
  }

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    '',
    '---',
    `"Exported by SnapLedger - Get 10 free scans: snapledger.app?ref=${getReferralCode()}"`
  ].join('\n')

  downloadFile(csv, 'expenses.csv', 'text/csv')
}

export function exportToPDF(expenses: Expense[]): void {
  // Simple PDF generation using data URL and print
  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0)
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Expense Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .total { font-weight: bold; font-size: 18px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>Expense Report</h1>
      <p>Generated: ${new Date().toLocaleDateString()}</p>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Merchant</th>
            <th>Amount</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          ${expenses.map(exp => `
            <tr>
              <td>${new Date(exp.date).toLocaleDateString()}</td>
              <td>${exp.merchant}</td>
              <td>$${exp.amount.toFixed(2)}</td>
              <td>${exp.category}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="total">Total Expenses: $${total.toFixed(2)}</div>
    </body>
    </html>
  `

  const newWindow = window.open()
  if (newWindow) {
    newWindow.document.write(html)
    newWindow.document.close()
    newWindow.print()
  }
}

function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
