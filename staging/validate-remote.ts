import axios from 'axios';

const STAGING_URL = process.env.STAGING_URL || 'http://localhost:3001';

interface ValidationResult {
  test: string;
  status: 'pass' | 'fail' | 'warn';
  time: number;
  details: any;
}

async function validateRemoteStaging(): Promise<void> {
  console.log('🦊 Fox Framework Remote Staging Validation');
  console.log('==========================================');
  console.log(`🌐 Target: ${STAGING_URL}`);
  console.log('');

  const results: ValidationResult[] = [];
  let totalTime = 0;

  // Test 1: Health Check
  console.log('🧪 Testing: Health Check');
  const healthStart = Date.now();
  try {
    const response = await axios.get(`${STAGING_URL}/health`, { timeout: 10000 });
    const time = Date.now() - healthStart;
    totalTime += time;

    if (response.status === 200 && response.data.status === 'healthy') {
      console.log(`✅ Health Check: Server healthy (${time}ms)`);
      console.log(`   Details: ${JSON.stringify(response.data, null, 2)}`);
      results.push({
        test: 'Health Check',
        status: 'pass',
        time,
        details: response.data
      });
    } else {
      console.log(`❌ Health Check: Unhealthy response (${time}ms)`);
      results.push({
        test: 'Health Check',
        status: 'fail',
        time,
        details: response.data
      });
    }
  } catch (error: any) {
    const time = Date.now() - healthStart;
    totalTime += time;
    console.log(`❌ Health Check: Failed to connect (${time}ms)`);
    console.log(`   Error: ${error.message}`);
    results.push({
      test: 'Health Check',
      status: 'fail',
      time,
      details: { error: error.message }
    });
  }

  // Test 2: API Endpoints
  console.log('🧪 Testing: API Endpoints');
  const apiStart = Date.now();
  const endpoints = ['/api/status', '/api/test-load', '/api/memory-test'];
  let apiSuccess = 0;

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${STAGING_URL}${endpoint}`, { timeout: 5000 });
      if (response.status === 200) {
        apiSuccess++;
        console.log(`  ✅ ${endpoint} - OK (${response.status})`);
      } else {
        console.log(`  ❌ ${endpoint} - Failed (${response.status})`);
      }
    } catch (error: any) {
      console.log(`  ❌ ${endpoint} - Failed (${error.message})`);
    }
  }

  const apiTime = Date.now() - apiStart;
  totalTime += apiTime;

  if (apiSuccess === endpoints.length) {
    console.log(`✅ API Endpoints: ${apiSuccess}/${endpoints.length} working (${apiTime}ms)`);
    results.push({
      test: 'API Endpoints',
      status: 'pass',
      time: apiTime,
      details: { successful: apiSuccess, total: endpoints.length }
    });
  } else {
    console.log(`❌ API Endpoints: ${apiSuccess}/${endpoints.length} working (${apiTime}ms)`);
    results.push({
      test: 'API Endpoints',
      status: 'fail',
      time: apiTime,
      details: { successful: apiSuccess, total: endpoints.length }
    });
  }

  // Test 3: Metrics Endpoint
  console.log('🧪 Testing: Metrics');
  const metricsStart = Date.now();
  try {
    const response = await axios.get(`${STAGING_URL}/metrics`, { timeout: 5000 });
    const metricsTime = Date.now() - metricsStart;
    totalTime += metricsTime;

    if (response.status === 200 && response.headers['content-type']?.includes('text/plain')) {
      const metricsLines = response.data.split('\n').filter((line: string) => 
        line.length > 0 && !line.startsWith('#')
      );
      
      if (metricsLines.length > 5) {
        console.log(`✅ Metrics: ${metricsLines.length} metrics available (${metricsTime}ms)`);
        results.push({
          test: 'Metrics',
          status: 'pass',
          time: metricsTime,
          details: { metricsCount: metricsLines.length, contentType: response.headers['content-type'] }
        });
      } else {
        console.log(`⚠️ Metrics: Only ${metricsLines.length} metrics found (${metricsTime}ms)`);
        results.push({
          test: 'Metrics',
          status: 'warn',
          time: metricsTime,
          details: { metricsCount: metricsLines.length, contentType: response.headers['content-type'] }
        });
      }
    } else {
      console.log(`❌ Metrics: Invalid response format (${metricsTime}ms)`);
      results.push({
        test: 'Metrics',
        status: 'fail',
        time: metricsTime,
        details: { status: response.status, contentType: response.headers['content-type'] }
      });
    }
  } catch (error: any) {
    const metricsTime = Date.now() - metricsStart;
    totalTime += metricsTime;
    console.log(`❌ Metrics: Failed to fetch (${metricsTime}ms)`);
    results.push({
      test: 'Metrics',
      status: 'fail',
      time: metricsTime,
      details: { error: error.message }
    });
  }

  // Test 4: Performance Test
  console.log('🧪 Testing: Performance');
  const perfStart = Date.now();
  const perfTests = 5;
  const times: number[] = [];

  console.log('   Running performance test...');
  for (let i = 0; i < perfTests; i++) {
    try {
      const start = Date.now();
      const response = await axios.get(`${STAGING_URL}/api/status`, { timeout: 5000 });
      if (response.status === 200) {
        times.push(Date.now() - start);
      } else {
        times.push(5000); // Consider failed requests as max timeout
      }
    } catch (error) {
      times.push(5000); // Max timeout for failed requests
    }
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const perfTime = Date.now() - perfStart;
  totalTime += perfTime;

  if (avgTime < 500) {
    console.log(`✅ Performance: Average ${avgTime.toFixed(2)}ms (${perfTime}ms)`);
    results.push({
      test: 'Performance',
      status: 'pass',
      time: perfTime,
      details: { averageTime: avgTime.toFixed(2), samples: perfTests, allTimes: times }
    });
  } else if (avgTime < 1000) {
    console.log(`⚠️ Performance: Average ${avgTime.toFixed(2)}ms - Acceptable but slow (${perfTime}ms)`);
    results.push({
      test: 'Performance',
      status: 'warn',
      time: perfTime,
      details: { averageTime: avgTime.toFixed(2), samples: perfTests, allTimes: times }
    });
  } else {
    console.log(`❌ Performance: Average ${avgTime.toFixed(2)}ms - Too slow (${perfTime}ms)`);
    results.push({
      test: 'Performance',
      status: 'fail',
      time: perfTime,
      details: { averageTime: avgTime.toFixed(2), samples: perfTests, allTimes: times }
    });
  }

  // Test 5: Error Handling
  console.log('🧪 Testing: Error Handling');
  const errorStart = Date.now();
  try {
    const response = await axios.get(`${STAGING_URL}/api/test-error`, { 
      timeout: 5000,
      validateStatus: () => true // Accept any status code
    });
    const errorTime = Date.now() - errorStart;
    totalTime += errorTime;

    if (response.status === 500 && response.data.error) {
      console.log(`✅ Error Handling: Proper error response (${errorTime}ms)`);
      results.push({
        test: 'Error Handling',
        status: 'pass',
        time: errorTime,
        details: { status: response.status, hasErrorMessage: !!response.data.error }
      });
    } else {
      console.log(`⚠️ Error Handling: Unexpected response format (${errorTime}ms)`);
      results.push({
        test: 'Error Handling',
        status: 'warn',
        time: errorTime,
        details: { status: response.status, data: response.data }
      });
    }
  } catch (error: any) {
    const errorTime = Date.now() - errorStart;
    totalTime += errorTime;
    console.log(`❌ Error Handling: Test endpoint not available (${errorTime}ms)`);
    results.push({
      test: 'Error Handling',
      status: 'fail',
      time: errorTime,
      details: { error: error.message }
    });
  }

  // Summary
  console.log('');
  console.log('============================================================');
  console.log('📊 REMOTE STAGING VALIDATION SUMMARY');
  console.log('============================================================');

  const passed = results.filter(r => r.status === 'pass').length;
  const warnings = results.filter(r => r.status === 'warn').length;
  const failed = results.filter(r => r.status === 'fail').length;

  console.log(`📈 Results: ${passed} passed, ${warnings} warnings, ${failed} failed (${results.length} total)`);
  console.log(`⏱️  Total time: ${totalTime}ms`);
  console.log('');

  if (failed === 0) {
    console.log('🎉 REMOTE STAGING VALIDATION PASSED! Ready for production deployment.');
    console.log('');
    console.log('📋 Detailed Results:');
    results.forEach(result => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
      console.log(`${icon} ${result.test}: ${JSON.stringify(result.details, null, 2)}`);
    });
    process.exit(0);
  } else {
    console.log('❌ REMOTE STAGING VALIDATION FAILED!');
    console.log('');
    console.log('📋 Failed Tests:');
    results.filter(r => r.status === 'fail').forEach(result => {
      console.log(`❌ ${result.test}: ${JSON.stringify(result.details, null, 2)}`);
    });
    process.exit(1);
  }
}

// Execute validation
validateRemoteStaging().catch(error => {
  console.error('❌ Validation script failed:', error.message);
  process.exit(1);
});
