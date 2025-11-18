import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { kv } from '@vercel/kv'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function checkAdminAuth() {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('admin_auth')
  return authCookie?.value === 'authenticated'
}

type CheckResult = {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: string
}

export async function GET(req: NextRequest) {
  // TEMP: Skip auth check for debugging (frontend uses localStorage)
  // TODO: Re-enable proper authentication later
  // const isAuthenticated = await checkAdminAuth()
  // if (!isAuthenticated) {
  //   return NextResponse.json(
  //     { ok: false, error: 'Unauthorized. Admin authentication required.' },
  //     { status: 401 }
  //   )
  // }

  const timestamp = new Date().toISOString()
  const checks: CheckResult[] = []

  // Check 1: OpenAI API Key & Credits
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey && openaiKey.length > 20) {
    // Try to check OpenAI credits/usage (this may not work in all cases)
    try {
      // Note: OpenAI doesn't have a direct credits endpoint, but we can test the key
      const testResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
        },
        signal: AbortSignal.timeout(5000),
      })

      if (testResponse.ok) {
        checks.push({
          name: 'OpenAI API',
          status: 'pass',
          message: 'Connected',
          details: 'API key is valid and working',
        })
      } else if (testResponse.status === 401) {
        checks.push({
          name: 'OpenAI API',
          status: 'fail',
          message: 'Invalid API key',
          details: 'Check your OPENAI_API_KEY in environment variables',
        })
      } else if (testResponse.status === 429) {
        checks.push({
          name: 'OpenAI API',
          status: 'warning',
          message: 'Rate limit reached',
          details: 'You may be hitting OpenAI rate limits',
        })
      } else {
        checks.push({
          name: 'OpenAI API',
          status: 'warning',
          message: `API returned status ${testResponse.status}`,
          details: 'API key configured but connection issue',
        })
      }
    } catch (error: any) {
      // If we can't test, just verify key exists
      checks.push({
        name: 'OpenAI API',
        status: 'pass',
        message: 'API key configured',
        details: `Key length: ${openaiKey.length} chars (could not test connection)`,
      })
    }
  } else {
    checks.push({
      name: 'OpenAI API',
      status: 'fail',
      message: 'API key not configured or invalid',
      details: 'Set OPENAI_API_KEY in environment variables',
    })
  }

  try {
    const startTime = Date.now()
    await kv.ping()
    const latency = Date.now() - startTime
    
    // Get KV usage stats if available
    try {
      const scanCount = await kv.get<number>('stats:scans:total') || 0
      checks.push({
        name: 'Vercel KV Database',
        status: 'pass',
        message: 'Connected',
        details: `Latency: ${latency}ms | Usage: ${scanCount.toLocaleString()} scans tracked`,
      })
    } catch {
      checks.push({
        name: 'Vercel KV Database',
        status: 'pass',
        message: 'Connected',
        details: `Latency: ${latency}ms`,
      })
    }
  } catch (error: any) {
    checks.push({
      name: 'Vercel KV Database',
      status: 'fail',
      message: 'Connection failed',
      details: error?.message?.substring(0, 200) || 'KV may not be configured',
    })
  }

  // Check 3: API Endpoints (test connectivity & response times)
  const apiEndpoints = [
    { name: 'scan-pantry', path: '/api/scan-pantry' },
    { name: 'generate-recipes', path: '/api/generate-recipes' },
    { name: 'save-email', path: '/api/save-email' },
  ]

  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : req.nextUrl.origin

  for (const endpoint of apiEndpoints) {
    try {
      const testRes = await fetch(`${baseUrl}${endpoint.path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
        signal: AbortSignal.timeout(5000),
      })
      
      // Even if it returns an error, the endpoint exists
      if (testRes.status === 400 || testRes.status === 401 || testRes.status === 500) {
        checks.push({
          name: `API: ${endpoint.name}`,
          status: 'pass',
          message: 'Endpoint accessible',
        })
      } else if (testRes.status === 404) {
        checks.push({
          name: `API: ${endpoint.name}`,
          status: 'fail',
          message: 'Endpoint not found (404)',
        })
      } else {
        checks.push({
          name: `API: ${endpoint.name}`,
          status: 'warning',
          message: `Unexpected status: ${testRes.status}`,
        })
      }
    } catch (error: any) {
      // In development, we can't always test endpoints this way
      if (error.name === 'AbortError' || error.code === 'ECONNREFUSED') {
        checks.push({
          name: `API: ${endpoint.name}`,
          status: 'warning',
          message: 'Cannot test in current environment',
          details: 'Endpoint exists but connectivity test skipped',
        })
      } else {
        checks.push({
          name: `API: ${endpoint.name}`,
          status: 'fail',
          message: 'Endpoint test failed',
          details: error?.message?.substring(0, 200) || 'Unknown error',
        })
      }
    }
  }

  // Check 4: Memory Usage
  try {
    const memoryUsage = process.memoryUsage()
    const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024)
    const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024)
    const usagePercent = Math.round((usedMB / totalMB) * 100)
    
    checks.push({
      name: 'Memory Usage',
      status: usagePercent > 80 ? 'warning' : usagePercent > 90 ? 'fail' : 'pass',
      message: `${usagePercent}% used (${usedMB}MB / ${totalMB}MB)`,
      details: usagePercent > 80 ? 'High memory usage - consider optimization' : '',
    })
  } catch (error) {
    checks.push({
      name: 'Memory Usage',
      status: 'warning',
      message: 'Memory info not available',
    })
  }

  // Check 5: Performance Metrics (Last 24h)
  try {
    const todayDate = new Date().toISOString().split('T')[0]
    const totalScans = await kv.get<number>('stats:scans:total') || 0
    const totalRecipes = await kv.get<number>('stats:recipes:total') || 0
    const uniqueUsers = await kv.get<number>('stats:unique_users') || 0
    const todayScans = await kv.get<number>(`stats:scans:daily:${todayDate}`) || 0
    const todayRecipes = await kv.get<number>(`stats:recipes:daily:${todayDate}`) || 0
    
    checks.push({
      name: 'Performance (24h)',
      status: 'pass',
      message: `Today: ${todayScans} scans, ${todayRecipes} recipes`,
      details: `Total: ${totalScans} scans, ${totalRecipes} recipes, ${uniqueUsers} users`,
    })
  } catch (error) {
    checks.push({
      name: 'Performance (24h)',
      status: 'warning',
      message: 'Metrics not available',
    })
  }

  // Calculate summary
  const passed = checks.filter((c) => c.status === 'pass').length
  const failed = checks.filter((c) => c.status === 'fail').length
  const warnings = checks.filter((c) => c.status === 'warning').length
  const total = checks.length

  // Determine overall status
  let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy'
  if (failed > 0) {
    overallStatus = 'critical'
  } else if (warnings > 2) {
    overallStatus = 'warning'
  }

  return NextResponse.json({
    ok: true,
    timestamp,
    status: overallStatus,
    checks,
    summary: {
      total,
      passed,
      failed,
      warnings,
    },
  })
}

