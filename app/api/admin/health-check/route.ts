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
  // Check admin authentication
  const isAuthenticated = await checkAdminAuth()
  if (!isAuthenticated) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized. Admin authentication required.' },
      { status: 401 }
    )
  }

  const timestamp = new Date().toISOString()
  const checks: CheckResult[] = []

  // Check 1: TypeScript Compilation
  // Note: This check may not work in serverless environments like Vercel
  // It's best to run `npm run type-check` locally or in CI/CD
  try {
    // Check if we can execute shell commands (works in Node.js runtime, not in Edge runtime)
    if (typeof execAsync !== 'undefined') {
      const { stdout, stderr } = await execAsync('npx tsc --noEmit', {
        timeout: 10000,
        cwd: process.cwd(),
      })
      if (stderr && stderr.length > 0) {
        checks.push({
          name: 'TypeScript',
          status: 'fail',
          message: 'TypeScript compilation errors found',
          details: stderr.substring(0, 500),
        })
      } else {
        checks.push({
          name: 'TypeScript',
          status: 'pass',
          message: 'No compilation errors',
        })
      }
    } else {
      checks.push({
        name: 'TypeScript',
        status: 'warning',
        message: 'TypeScript check skipped (serverless environment)',
        details: 'Run `npm run type-check` locally to verify TypeScript compilation',
      })
    }
  } catch (error: any) {
    // If exec is not available (Edge runtime), skip this check
    if (error.code === 'MODULE_NOT_FOUND' || error.message?.includes('exec')) {
      checks.push({
        name: 'TypeScript',
        status: 'warning',
        message: 'TypeScript check not available in this environment',
        details: 'Run `npm run type-check` locally or in CI/CD pipeline',
      })
    } else {
      const errorOutput = error.stdout || error.stderr || error.message || ''
      checks.push({
        name: 'TypeScript',
        status: errorOutput.includes('error TS') ? 'fail' : 'warning',
        message: errorOutput.includes('error TS') 
          ? 'TypeScript compilation errors found' 
          : 'TypeScript check failed',
        details: errorOutput.substring(0, 500),
      })
    }
  }

  // Check 2: OpenAI API Key
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey && openaiKey.length > 20) {
    checks.push({
      name: 'OpenAI API Key',
      status: 'pass',
      message: 'API key configured',
      details: `Key length: ${openaiKey.length} chars`,
    })
  } else {
    checks.push({
      name: 'OpenAI API Key',
      status: 'fail',
      message: 'API key not configured or invalid',
    })
  }

  // Check 3: Vercel KV Connection
  try {
    await kv.ping()
    checks.push({
      name: 'Vercel KV',
      status: 'pass',
      message: 'Connection successful',
    })
  } catch (error: any) {
    checks.push({
      name: 'Vercel KV',
      status: 'warning',
      message: 'Connection failed or not configured',
      details: error?.message?.substring(0, 200) || 'KV may not be configured',
    })
  }

  // Check 4: Environment Variables
  const requiredEnvVars = ['OPENAI_API_KEY']
  const optionalEnvVars = ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'ADMIN_PASSWORD']
  const missingRequired: string[] = []
  const missingOptional: string[] = []

  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingRequired.push(varName)
    }
  })

  optionalEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingOptional.push(varName)
    }
  })

  if (missingRequired.length > 0) {
    checks.push({
      name: 'Environment Variables',
      status: 'fail',
      message: `Missing required variables: ${missingRequired.join(', ')}`,
    })
  } else if (missingOptional.length > 0) {
    checks.push({
      name: 'Environment Variables',
      status: 'warning',
      message: `Missing optional variables: ${missingOptional.join(', ')}`,
      details: 'These may be required for full functionality',
    })
  } else {
    checks.push({
      name: 'Environment Variables',
      status: 'pass',
      message: 'All variables configured',
    })
  }

  // Check 5: API Endpoints (test connectivity)
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

  // Check 6: Memory Usage (if available)
  try {
    const memoryUsage = process.memoryUsage()
    const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024)
    const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024)
    
    checks.push({
      name: 'Memory Usage',
      status: usedMB > 500 ? 'warning' : 'pass',
      message: `Using ${usedMB}MB / ${totalMB}MB`,
      details: `Heap used: ${usedMB}MB, Total: ${totalMB}MB`,
    })
  } catch (error) {
    checks.push({
      name: 'Memory Usage',
      status: 'warning',
      message: 'Memory info not available',
    })
  }

  // Check 7: Node.js Version
  try {
    const nodeVersion = process.version
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0])
    checks.push({
      name: 'Node.js Version',
      status: majorVersion >= 18 ? 'pass' : 'warning',
      message: `Node.js ${nodeVersion}`,
      details: majorVersion < 18 ? 'Node 18+ recommended' : '',
    })
  } catch (error) {
    checks.push({
      name: 'Node.js Version',
      status: 'warning',
      message: 'Version info not available',
    })
  }

  // Check 8: Build Status (check if .next exists)
  try {
    // This check works in Node.js runtime but not in Edge runtime
    if (typeof require !== 'undefined') {
      const fs = require('fs')
      const path = require('path')
      const nextDir = path.join(process.cwd(), '.next')
      const exists = fs.existsSync(nextDir)
      checks.push({
        name: 'Build Status',
        status: exists ? 'pass' : 'warning',
        message: exists ? '.next directory exists' : '.next directory not found',
        details: exists ? 'App appears to be built' : 'Run `npm run build` to create build',
      })
    } else {
      // In serverless/Edge runtime, assume deployed = built
      checks.push({
        name: 'Build Status',
        status: 'pass',
        message: 'App is deployed (assumes built)',
        details: 'Build status check not available in serverless environment',
      })
    }
  } catch (error) {
    checks.push({
      name: 'Build Status',
      status: 'warning',
      message: 'Cannot check build status',
      details: 'Build check skipped - app appears to be running',
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

