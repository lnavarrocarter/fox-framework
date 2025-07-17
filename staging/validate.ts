#!/usr/bin/env node

/**
 * @fileoverview Staging Validation Script
 * @description Script para validar el entorno de staging del Fox Framework
 */

import axios from 'axios';
import { spawn, ChildProcess } from 'child_process';
import { setTimeout } from 'timers/promises';

const STAGING_URL = 'http://localhost:3001';
const VALIDATION_TIMEOUT = 60000; // 60 segundos
const WARMUP_TIME = 5000; // 5 segundos para warmup

interface ValidationResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
  duration?: number;
}

class StagingValidator {
  private results: ValidationResult[] = [];
  private serverProcess: ChildProcess | null = null;

  async startServer(): Promise<void> {
    console.log('🚀 Starting staging server...');
    
    this.serverProcess = spawn('npx', ['ts-node', 'staging/server.ts'], {
      stdio: 'pipe',
      cwd: process.cwd()
    });

    this.serverProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('started successfully')) {
        console.log('✅ Staging server started');
      }
    });

    this.serverProcess.stderr?.on('data', (data) => {
      console.error('Server error:', data.toString());
    });

    // Wait for server to start
    console.log('⏳ Waiting for server warmup...');
    await setTimeout(WARMUP_TIME);
  }

  async stopServer(): Promise<void> {
    if (this.serverProcess) {
      console.log('🛑 Stopping staging server...');
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
    }
  }

  async runTest(test: string, testFn: () => Promise<ValidationResult>): Promise<void> {
    const startTime = Date.now();
    console.log(`\n🧪 Running: ${test}`);
    
    try {
      const result = await testFn();
      result.duration = Date.now() - startTime;
      this.results.push(result);
      
      const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
      console.log(`${statusIcon} ${result.test}: ${result.message} (${result.duration}ms)`);
      
      if (result.details) {
        console.log(`   Details:`, result.details);
      }
    } catch (error) {
      const result: ValidationResult = {
        test,
        status: 'FAIL',
        message: `Test failed: ${(error as Error).message}`,
        duration: Date.now() - startTime
      };
      this.results.push(result);
      console.log(`❌ ${test}: ${result.message} (${result.duration}ms)`);
    }
  }

  async validateServerHealth(): Promise<ValidationResult> {
    const response = await axios.get(`${STAGING_URL}/health`, { timeout: 10000 });
    
    if (response.status === 200) {
      const health = response.data;
      const allPassing = Object.values(health.checks).every((check: any) => check.status === 'pass');
      
      return {
        test: 'Server Health Check',
        status: allPassing ? 'PASS' : 'WARN',
        message: allPassing ? 'All health checks passing' : 'Some health checks failing',
        details: {
          status: health.status,
          uptime: health.uptime,
          checks: Object.keys(health.checks).length
        }
      };
    }
    
    throw new Error(`Health check failed: ${response.status}`);
  }

  async validateMetricsEndpoint(): Promise<ValidationResult> {
    const response = await axios.get(`${STAGING_URL}/metrics`, { timeout: 10000 });
    
    if (response.status === 200) {
      const metrics = response.data;
      const hasSystemMetrics = metrics.includes('system_') && metrics.includes('_gauge');
      
      return {
        test: 'Metrics Endpoint',
        status: hasSystemMetrics ? 'PASS' : 'WARN',
        message: hasSystemMetrics ? 'Metrics endpoint working with system metrics' : 'Metrics endpoint working but missing system metrics',
        details: {
          contentType: response.headers['content-type'],
          metricsCount: (metrics.match(/# TYPE/g) || []).length
        }
      };
    }
    
    throw new Error(`Metrics endpoint failed: ${response.status}`);
  }

  async validateApiEndpoints(): Promise<ValidationResult> {
    const endpoints = [
      '/api/status',
      '/api/test-load',
      '/api/memory-test'
    ];

    const results: Array<{endpoint: string, status: number, success: boolean, error?: string}> = [];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${STAGING_URL}${endpoint}`, { timeout: 10000 });
        results.push({ endpoint, status: response.status, success: true });
      } catch (error) {
        results.push({ endpoint, status: 0, success: false, error: (error as Error).message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const allPassing = successCount === endpoints.length;
    
    return {
      test: 'API Endpoints',
      status: allPassing ? 'PASS' : 'FAIL',
      message: `${successCount}/${endpoints.length} endpoints working`,
      details: results
    };
  }

  async validatePerformance(): Promise<ValidationResult> {
    console.log('   Running performance test...');
    const iterations = 10;
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await axios.get(`${STAGING_URL}/api/test-load`);
      times.push(Date.now() - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);
    const isGood = avgTime < 200 && maxTime < 500;
    
    return {
      test: 'Performance Test',
      status: isGood ? 'PASS' : 'WARN',
      message: `Average response time: ${avgTime.toFixed(2)}ms`,
      details: {
        iterations,
        averageTime: avgTime.toFixed(2),
        maxTime,
        minTime: Math.min(...times),
        allTimes: times
      }
    };
  }

  async validateErrorHandling(): Promise<ValidationResult> {
    let errorCount = 0;
    let successCount = 0;
    
    // Test error endpoint multiple times
    for (let i = 0; i < 20; i++) {
      try {
        await axios.get(`${STAGING_URL}/api/error-test`);
        successCount++;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 500) {
          errorCount++;
        }
      }
    }

    const hasErrors = errorCount > 0;
    
    return {
      test: 'Error Handling',
      status: hasErrors ? 'PASS' : 'WARN',
      message: hasErrors ? 'Error handling working correctly' : 'Error endpoint not generating expected errors',
      details: {
        totalRequests: 20,
        errors: errorCount,
        successes: successCount,
        errorRate: `${((errorCount / 20) * 100).toFixed(1)}%`
      }
    };
  }

  async validateMemoryUsage(): Promise<ValidationResult> {
    const response = await axios.get(`${STAGING_URL}/api/memory-test`);
    
    if (response.status === 200) {
      const memData = response.data.memory;
      const usagePercent = parseInt(memData.usage.replace('%', ''));
      
      return {
        test: 'Memory Usage',
        status: usagePercent < 90 ? 'PASS' : 'WARN',
        message: `Memory usage: ${memData.usage}`,
        details: memData
      };
    }
    
    throw new Error(`Memory test failed: ${response.status}`);
  }

  printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 STAGING VALIDATION SUMMARY');
    console.log('='.repeat(60));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const warned = this.results.filter(r => r.status === 'WARN').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;
    
    console.log(`\n📈 Results: ${passed} passed, ${warned} warnings, ${failed} failed (${total} total)`);
    console.log(`⏱️  Total time: ${this.results.reduce((sum, r) => sum + (r.duration || 0), 0)}ms`);
    
    if (failed === 0) {
      console.log('\n🎉 STAGING VALIDATION PASSED! Ready for production deployment.');
    } else {
      console.log('\n⚠️  STAGING VALIDATION FAILED! Please review the failed tests before proceeding.');
    }
    
    console.log('\n📋 Detailed Results:');
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
      console.log(`${icon} ${result.test}: ${result.message}`);
    });
  }

  async run(): Promise<boolean> {
    console.log('🦊 Fox Framework Staging Validation');
    console.log('='.repeat(40));
    
    try {
      await this.startServer();
      
      // Wait a bit more for metrics to collect
      await setTimeout(2000);
      
      // Run all validation tests
      await this.runTest('Server Health', () => this.validateServerHealth());
      await this.runTest('Metrics Endpoint', () => this.validateMetricsEndpoint());
      await this.runTest('API Endpoints', () => this.validateApiEndpoints());
      await this.runTest('Performance', () => this.validatePerformance());
      await this.runTest('Error Handling', () => this.validateErrorHandling());
      await this.runTest('Memory Usage', () => this.validateMemoryUsage());
      
      await this.stopServer();
      
      this.printSummary();
      
      const failed = this.results.filter(r => r.status === 'FAIL').length;
      return failed === 0;
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
      await this.stopServer();
      return false;
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new StagingValidator();
  
  validator.run()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation error:', error);
      process.exit(1);
    });
}

export { StagingValidator };
