// tsfox/cli/commands/performance/report.command.ts
import { CommandInterface, CLIContext, ValidationResult } from '../../interfaces/cli.interface';
import fs from 'fs/promises';
import path from 'path';

export const PerformanceReportCommand: CommandInterface = {
  name: 'report',
  description: 'Generate performance reports from collected data',
  arguments: [],
  options: [
    {
      name: 'input',
      alias: 'i',
      description: 'Input directory containing performance data files',
      type: 'string',
      default: './performance-data'
    },
    {
      name: 'output',
      alias: 'o',
      description: 'Output directory for generated reports',
      type: 'string',
      default: './performance-reports'
    },
    {
      name: 'format',
      alias: 'f',
      description: 'Report format',
      type: 'string',
      choices: ['html', 'pdf', 'json', 'markdown'],
      default: 'html'
    },
    {
      name: 'template',
      alias: 't',
      description: 'Report template',
      type: 'string',
      choices: ['standard', 'detailed', 'executive', 'technical'],
      default: 'standard'
    },
    {
      name: 'period',
      alias: 'p',
      description: 'Time period for report',
      type: 'string',
      choices: ['1h', '24h', '7d', '30d', 'all'],
      default: '24h'
    },
    {
      name: 'include-charts',
      description: 'Include performance charts in report',
      type: 'boolean',
      default: true
    },
    {
      name: 'compare',
      alias: 'c',
      description: 'Compare with previous period',
      type: 'boolean',
      default: false
    }
  ],

  validate: (args: any, options: any): ValidationResult => {
    // Validar que el directorio de entrada existe se hará en runtime
    return { valid: true };
  },

  action: async (args: any, options: any, context: CLIContext): Promise<void> => {
    console.log('📊 Generating performance report...');
    
    try {
      // Verificar directorio de entrada
      await fs.access(options.input);
      
      // Crear directorio de salida si no existe
      await fs.mkdir(options.output, { recursive: true });
      
      // Recopilar datos de rendimiento
      const performanceData = await collectPerformanceData(options.input, options.period);
      
      // Generar reporte
      const report = await generatePerformanceReport(performanceData, {
        format: options.format,
        template: options.template,
        includeCharts: options.includeCharts,
        compare: options.compare
      });
      
      // Guardar reporte
      const reportPath = await saveReport(report, options.output, options.format);
      
      console.log('\n✅ Performance report generated successfully!');
      console.log(`📄 Report saved to: ${reportPath}`);
      
      // Mostrar resumen del reporte
      displayReportSummary(performanceData);
      
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.error(`❌ Input directory not found: ${options.input}`);
        console.log('💡 Run performance monitoring first or specify correct input directory');
      } else {
        console.error('❌ Report generation failed:', error.message);
      }
      process.exit(1);
    }
  }
};

// Funciones auxiliares
async function collectPerformanceData(inputDir: string, period: string) {
  const files = await fs.readdir(inputDir);
  const jsonFiles = files.filter(file => file.endsWith('.json'));
  
  const allData = {
    metrics: [] as any[],
    benchmarks: [] as any[],
    health: [] as any[],
    errors: [] as any[],
    period: period,
    startTime: new Date(),
    endTime: new Date()
  };
  
  // Filtrar por período
  const cutoffTime = getPeriodCutoff(period);
  
  for (const file of jsonFiles) {
    try {
      const filePath = path.join(inputDir, file);
      const fileStats = await fs.stat(filePath);
      
      // Filtrar archivos por período
      if (cutoffTime && fileStats.mtime < cutoffTime) {
        continue;
      }
      
      const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      
      // Clasificar datos por tipo
      if (file.includes('metrics')) {
        allData.metrics.push({ ...data, file, timestamp: fileStats.mtime });
      } else if (file.includes('benchmark')) {
        allData.benchmarks.push({ ...data, file, timestamp: fileStats.mtime });
      } else if (file.includes('health')) {
        allData.health.push({ ...data, file, timestamp: fileStats.mtime });
      } else if (file.includes('error')) {
        allData.errors.push({ ...data, file, timestamp: fileStats.mtime });
      }
    } catch (error) {
      console.warn(`⚠️  Skipping invalid file: ${file}`);
    }
  }
  
  // Ordenar por timestamp
  allData.metrics.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  allData.benchmarks.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  return allData;
}

function getPeriodCutoff(period: string): Date | null {
  const now = new Date();
  
  switch (period) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'all':
    default:
      return null;
  }
}

async function generatePerformanceReport(data: any, options: any) {
  const report = {
    metadata: {
      generatedAt: new Date().toISOString(),
      period: data.period,
      template: options.template,
      format: options.format
    },
    summary: generateSummary(data),
    charts: options.includeCharts ? generateCharts(data) : null,
    detailed: generateDetailedAnalysis(data),
    recommendations: generateRecommendations(data),
    comparison: options.compare ? generateComparison(data) : null
  };
  
  return report;
}

function generateSummary(data: any) {
  const summary = {
    totalRequests: 0,
    averageResponseTime: 0,
    errorRate: 0,
    uptime: 100,
    throughput: 0,
    peakMemoryUsage: 0,
    averageCpuUsage: 0
  };
  
  // Calcular métricas desde benchmarks
  if (data.benchmarks.length > 0) {
    const allRequests = data.benchmarks.reduce((sum: number, b: any) => sum + (b.summary?.totalRequests || 0), 0);
    const totalResponseTime = data.benchmarks.reduce((sum: number, b: any) => {
      return sum + (b.summary?.averageResponseTime || 0) * (b.summary?.totalRequests || 0);
    }, 0);
    
    summary.totalRequests = allRequests;
    summary.averageResponseTime = allRequests > 0 ? totalResponseTime / allRequests : 0;
    summary.throughput = allRequests / (data.benchmarks.length || 1);
  }
  
  // Calcular error rate
  if (data.errors.length > 0) {
    const totalErrors = data.errors.reduce((sum: number, e: any) => sum + (e.count || 1), 0);
    summary.errorRate = summary.totalRequests > 0 ? (totalErrors / summary.totalRequests) * 100 : 0;
  }
  
  return summary;
}

function generateCharts(data: any) {
  return {
    responseTimeChart: {
      type: 'line',
      data: data.benchmarks.map((b: any) => ({
        x: b.timestamp,
        y: b.summary?.averageResponseTime || 0
      })),
      title: 'Response Time Over Time'
    },
    throughputChart: {
      type: 'bar',
      data: data.benchmarks.map((b: any) => ({
        x: b.timestamp,
        y: b.summary?.throughput || 0
      })),
      title: 'Throughput Over Time'
    },
    errorChart: {
      type: 'pie',
      data: data.errors.reduce((acc: any, e: any) => {
        const errorType = e.type || 'Unknown';
        acc[errorType] = (acc[errorType] || 0) + (e.count || 1);
        return acc;
      }, {}),
      title: 'Error Distribution'
    }
  };
}

function generateDetailedAnalysis(data: any) {
  return {
    performanceTrends: analyzeTrends(data),
    bottlenecks: identifyBottlenecks(data),
    resourceUsage: analyzeResourceUsage(data),
    errorAnalysis: analyzeErrors(data)
  };
}

function analyzeTrends(data: any) {
  const trends = {
    responseTime: { trend: 'stable', change: 0 },
    throughput: { trend: 'stable', change: 0 },
    errors: { trend: 'stable', change: 0 }
  };
  
  if (data.benchmarks.length >= 2) {
    const recent = data.benchmarks.slice(-5);
    const older = data.benchmarks.slice(0, Math.min(5, data.benchmarks.length - 5));
    
    if (older.length > 0) {
      const recentAvgRT = recent.reduce((sum: number, b: any) => sum + (b.summary?.averageResponseTime || 0), 0) / recent.length;
      const olderAvgRT = older.reduce((sum: number, b: any) => sum + (b.summary?.averageResponseTime || 0), 0) / older.length;
      
      const change = ((recentAvgRT - olderAvgRT) / olderAvgRT) * 100;
      trends.responseTime = {
        trend: change > 10 ? 'degrading' : change < -10 ? 'improving' : 'stable',
        change: change
      };
    }
  }
  
  return trends;
}

function identifyBottlenecks(data: any) {
  const bottlenecks: any[] = [];
  
  // Analizar response times altos
  data.benchmarks.forEach((benchmark: any) => {
    if (benchmark.summary?.p95ResponseTime > 1000) {
      bottlenecks.push({
        type: 'response_time',
        severity: 'high',
        description: `High P95 response time: ${benchmark.summary.p95ResponseTime}ms`,
        timestamp: benchmark.timestamp
      });
    }
  });
  
  return bottlenecks;
}

function analyzeResourceUsage(data: any) {
  return {
    memory: {
      peak: 0,
      average: 0,
      trend: 'stable'
    },
    cpu: {
      peak: 0,
      average: 0,
      trend: 'stable'
    }
  };
}

function analyzeErrors(data: any) {
  const errorTypes = data.errors.reduce((acc: any, e: any) => {
    const type = e.type || 'Unknown';
    acc[type] = (acc[type] || 0) + (e.count || 1);
    return acc;
  }, {});
  
  return {
    totalErrors: data.errors.length,
    errorTypes: errorTypes,
    mostCommon: Object.entries(errorTypes).sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'None'
  };
}

function generateRecommendations(data: any) {
  const recommendations: string[] = [];
  
  const summary = generateSummary(data);
  
  if (summary.averageResponseTime > 500) {
    recommendations.push('Consider implementing response time optimization strategies');
  }
  
  if (summary.errorRate > 2) {
    recommendations.push('Investigate and reduce error rate through better error handling');
  }
  
  if (summary.throughput < 100) {
    recommendations.push('Consider scaling strategies to improve throughput');
  }
  
  return recommendations;
}

function generateComparison(data: any) {
  // Placeholder para comparación con período anterior
  return {
    responseTime: { change: 0, trend: 'stable' },
    throughput: { change: 0, trend: 'stable' },
    errors: { change: 0, trend: 'stable' }
  };
}

async function saveReport(report: any, outputDir: string, format: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `performance-report-${timestamp}.${format}`;
  const filePath = path.join(outputDir, filename);
  
  let content: string;
  
  switch (format) {
    case 'json':
      content = JSON.stringify(report, null, 2);
      break;
    case 'html':
      content = generateHTMLReport(report);
      break;
    case 'markdown':
      content = generateMarkdownReport(report);
      break;
    default:
      content = JSON.stringify(report, null, 2);
  }
  
  await fs.writeFile(filePath, content);
  return filePath;
}

function generateHTMLReport(report: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Fox Framework Performance Report</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background-color: #f5f5f5; 
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            padding: 30px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #e0e0e0; 
            padding-bottom: 20px; 
        }
        .metric-card { 
            display: inline-block; 
            background: #f8f9fa; 
            padding: 20px; 
            margin: 10px; 
            border-radius: 6px; 
            border-left: 4px solid #007bff; 
            min-width: 200px; 
        }
        .metric-value { 
            font-size: 2em; 
            font-weight: bold; 
            color: #007bff; 
        }
        .metric-label { 
            color: #666; 
            margin-top: 5px; 
        }
        .section { 
            margin: 30px 0; 
        }
        .recommendation { 
            background: #e7f3ff; 
            border-left: 4px solid #007bff; 
            padding: 15px; 
            margin: 10px 0; 
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: left; 
        }
        th { 
            background-color: #f8f9fa; 
            font-weight: 600; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🦊 Fox Framework Performance Report</h1>
            <p>Generated: ${new Date(report.metadata.generatedAt).toLocaleString()}</p>
            <p>Period: ${report.metadata.period} | Template: ${report.metadata.template}</p>
        </div>
        
        <div class="section">
            <h2>📊 Performance Summary</h2>
            <div class="metric-card">
                <div class="metric-value">${report.summary.totalRequests.toLocaleString()}</div>
                <div class="metric-label">Total Requests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.averageResponseTime.toFixed(2)}ms</div>
                <div class="metric-label">Avg Response Time</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.errorRate.toFixed(2)}%</div>
                <div class="metric-label">Error Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.throughput.toFixed(2)}</div>
                <div class="metric-label">Requests/sec</div>
            </div>
        </div>
        
        <div class="section">
            <h2>🔍 Detailed Analysis</h2>
            <h3>Performance Trends</h3>
            <table>
                <thead>
                    <tr><th>Metric</th><th>Trend</th><th>Change</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Response Time</td>
                        <td>${report.detailed.performanceTrends.responseTime.trend}</td>
                        <td>${report.detailed.performanceTrends.responseTime.change.toFixed(2)}%</td>
                    </tr>
                    <tr>
                        <td>Throughput</td>
                        <td>${report.detailed.performanceTrends.throughput.trend}</td>
                        <td>${report.detailed.performanceTrends.throughput.change.toFixed(2)}%</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>💡 Recommendations</h2>
            ${report.recommendations.map((rec: string) => `
                <div class="recommendation">${rec}</div>
            `).join('')}
        </div>
        
        <div class="section">
            <h2>🐛 Error Analysis</h2>
            <p><strong>Total Errors:</strong> ${report.detailed.errorAnalysis.totalErrors}</p>
            <p><strong>Most Common:</strong> ${report.detailed.errorAnalysis.mostCommon}</p>
        </div>
    </div>
</body>
</html>
  `;
}

function generateMarkdownReport(report: any): string {
  return `
# 🦊 Fox Framework Performance Report

**Generated:** ${new Date(report.metadata.generatedAt).toLocaleString()}  
**Period:** ${report.metadata.period} | **Template:** ${report.metadata.template}

## 📊 Performance Summary

| Metric | Value |
|--------|-------|
| Total Requests | ${report.summary.totalRequests.toLocaleString()} |
| Average Response Time | ${report.summary.averageResponseTime.toFixed(2)}ms |
| Error Rate | ${report.summary.errorRate.toFixed(2)}% |
| Throughput | ${report.summary.throughput.toFixed(2)} req/sec |

## 🔍 Performance Trends

| Metric | Trend | Change |
|--------|-------|--------|
| Response Time | ${report.detailed.performanceTrends.responseTime.trend} | ${report.detailed.performanceTrends.responseTime.change.toFixed(2)}% |
| Throughput | ${report.detailed.performanceTrends.throughput.trend} | ${report.detailed.performanceTrends.throughput.change.toFixed(2)}% |

## 💡 Recommendations

${report.recommendations.map((rec: string) => `- ${rec}`).join('\n')}

## 🐛 Error Analysis

- **Total Errors:** ${report.detailed.errorAnalysis.totalErrors}
- **Most Common:** ${report.detailed.errorAnalysis.mostCommon}
  `;
}

function displayReportSummary(data: any) {
  console.log('\n📋 Report Summary:');
  console.log(`   📄 Files processed: ${data.metrics.length + data.benchmarks.length + data.health.length + data.errors.length}`);
  console.log(`   📊 Benchmarks: ${data.benchmarks.length}`);
  console.log(`   📈 Metrics: ${data.metrics.length}`);
  console.log(`   🏥 Health checks: ${data.health.length}`);
  console.log(`   🚨 Errors: ${data.errors.length}`);
  console.log(`   📅 Period: ${data.period}`);
}
