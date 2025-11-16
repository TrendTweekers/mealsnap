// Google Drive Backup Integration
// Uses google-drive-api via fetch (client-side OAuth2 flow)

export interface BackupSettings {
  enabled: boolean
  lastBackupDate?: string
  folderId?: string
  autoSync: boolean
}

export async function initializeGoogleDriveAuth(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
  const redirectUri = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/google-callback`
  
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.append('client_id', clientId)
  authUrl.searchParams.append('redirect_uri', redirectUri)
  authUrl.searchParams.append('response_type', 'token')
  authUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/drive.file')
  authUrl.searchParams.append('prompt', 'consent')

  return authUrl.toString()
}

export async function backupExpensesToGoogleDrive(
  expenses: any[],
  accessToken: string
): Promise<{ success: boolean; fileId?: string; error?: string }> {
  try {
    // Get or create backup folder
    const folderId = await getOrCreateBackupFolder(accessToken)
    
    // Create CSV content
    const csv = generateCSV(expenses)
    const blob = new Blob([csv], { type: 'text/csv' })
    
    // Upload to Google Drive
    const fileId = await uploadFileToGoogleDrive(
      blob,
      `SnapLedger_Backup_${new Date().toISOString().split('T')[0]}.csv`,
      folderId,
      accessToken
    )

    // Save backup metadata
    const settings: BackupSettings = {
      enabled: true,
      lastBackupDate: new Date().toISOString(),
      folderId,
      autoSync: true
    }
    localStorage.setItem('googleDriveBackup', JSON.stringify(settings))

    return { success: true, fileId }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

async function getOrCreateBackupFolder(accessToken: string): Promise<string> {
  // Check if folder exists
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='SnapLedger 2025' and mimeType='application/vnd.google-apps.folder' and trashed=false&spaces=drive&fields=files(id)`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  )

  const data = await response.json()
  
  if (data.files?.length > 0) {
    return data.files[0].id
  }

  // Create folder
  const createResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'SnapLedger 2025',
        mimeType: 'application/vnd.google-apps.folder'
      })
    }
  )

  const createData = await createResponse.json()
  return createData.id
}

async function uploadFileToGoogleDrive(
  blob: Blob,
  filename: string,
  folderId: string,
  accessToken: string
): Promise<string> {
  const formData = new FormData()
  formData.append('metadata', JSON.stringify({
    name: filename,
    parents: [folderId]
  }))
  formData.append('file', blob)

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
      body: formData
    }
  )

  const data = await response.json()
  return data.id
}

function generateCSV(expenses: any[]): string {
  const headers = ['Date', 'Merchant', 'Amount', 'Category', 'Tax']
  const rows = expenses.map(exp => [
    new Date(exp.date).toLocaleDateString(),
    exp.merchant,
    exp.amount.toFixed(2),
    exp.category,
    exp.tax || '0'
  ])

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')
}
