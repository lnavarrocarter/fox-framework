// tsfox/cli/commands/performance/analyze.command.ts
import { CommandInterface, CLIContext, ValidationResult } from '../../interfaces/cli.interface';
import fs from 'fs/promises';
import path from 'path';

export const PerformanceAnalyzeCommand: CommandInterface = {
  name: 'analyze',
  description: 'Analyze performance data and generate insights',
  arguments: [],
  options: [
    {
      name: 'input',
      alias: 'i',
      description: 'Path to performance data file (JSON)',
      type: 'string',
      required: true
    },
    {
      name: 'output',
      alias: 'o',
      description: 'Output file for analysis report',
      type: 'string',
      default: 'performance-analysis.json'
    },
    {
      name: 'format',
      alias: 'f',
      description: 'Output format',
      type: 'string',
      choices: ['json', 'html', 'markdown'],
      default: 'json'
    },
    {
      name: 'threshold',
      alias: 't',
      description: 'Response time threshold for alerts (ms)',
      type: 'number',
      default: 500
    },
    {
      name: 'memory-threshold',
      description: 'Memory usage threshold for alerts (MB)',
      type: 'number',
      default: 100
    },
    {
      name: 'cpu-threshold',
      description: 'CPU usage threshold for alerts (%)',
      type: 'number',
      default: 80
    }
  ],

  validate: (args: any, options: any): ValidationResult => {
    const errors: string[] = [];

    // Validar input file
    if (!options.input) {
      return {
        valid: false,
        message: 'Input file is required'
      };
    }

    // Validar threshold values
    if (options.threshold && options.threshold <= 0) {
      return {
        valid: false,
        message: 'Response time threshold must be positive'
      };
    }

    if (options.memoryThreshold && options.memoryThreshold <= 0) {
      return {
        valid: false,
        message: 'Memory threshold must be positive'
      };
    }

    if (options.cpuThreshold && (options.cpuThreshold <= 0 || options.cpuThreshold > 100)) {
      return {
        valid: false,
        message: 'CPU threshold must be between 0 and 100'
      };
    }

    return { valid: true };
  },

  action: async (args: string[], options: any, context: CLIContext): Promise<void> => {
    console.log('🔍 Analyzing performance data...');
    
    try {
      // Leer datos de entrada
      const inputData = JSON.parse(await fs.readFile(options.input, 'utf-8'));
      
      // Realizar análisis
      const analysis = await analyzePerformanceData(inputData, {
        responseTimeThreshold: options.threshold,
        memoryThreshold: options.memoryThreshold,
        cpuThreshold: options.cpuThreshold
      });

      // Generar reporte
      const report = await generateReport(analysis, options.format);
      
      // Guardar reporte
      await fs.writeFile(options.output, report);
      
      console.log('\n✅ Analysis completed successfully!');
      console.log(`📊 Report saved to: ${options.output}`);
      
      // Mostrar resumen
      displayAnalysisSummary(analysis);
      
    } catch (error: any) {
      console.error('❌ Analysis failed:', error.message);
      process.exit(1);
    }
  }
};

// Funciones auxiliares
async function analyzePerformanceData(data: any, thresholds: any) {
  const analysis = {
    summary: {
      totalRequests: 0,
      averageResponseTime: 0,
      medianResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      errorRate: 0,
      throughput: 0
    },
    alerts: [] as any[],
    trends: {
      responseTime: [] as number[],
      memory: [] as number[],
      cpu: [] as number[]
    },
    recommendations: [] as string[],
    bottlenecks: [] as any[]
  };

  // Analizar métricas de respuesta
  if (data.responseTimeMetrics) {
    const times = data.responseTimeMetrics.map((m: any) => m.responseTime);
    analysis.summary.totalRequests = times.length;
    analysis.summary.averageResponseTime = times.reduce((a: number, b: number) => a + b, 0) / times.length;
    
    const sortedTimes = times.sort((a: number, b: number) => a - b);
    analysis.summary.medianResponseTime = sortedTimes[Math.floor(sortedTimes.length / 2)];
    analysis.summary.p95ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    analysis.summary.p99ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
    
    // Detectar problemas de rendimiento
    if (analysis.summary.p95ResponseTime > thresholds.responseTimeThreshold) {
      analysis.alerts.push({
        type: 'performance',
        severity: 'high',
        message: `95th percentile response time (${analysis.summary.p95ResponseTime}ms) exceeds threshold (${thresholds.responseTimeThreshold}ms)`
      });
    }
  }

  // Analizar errores
  if (data.errorMetrics) {
    const totalErrors = data.errorMetrics.reduce((sum: number, metric: any) => sum + metric.count, 0);
    analysis.summary.errorRate = (totalErrors / analysis.summary.totalRequests) * 100;
    
    if (analysis.summary.errorRate > 5) {
      analysis.alerts.push({
        type: 'reliability',
        severity: 'high',
        message: `High error rate detected: ${analysis.summary.errorRate.toFixed(2)}%`
      });
    }
  }

  // Analizar memoria
  if (data.memoryMetrics) {
    const memoryUsage = data.memoryMetrics.map((m: any) => m.heapUsed / 1024 / 1024); // MB
    analysis.trends.memory = memoryUsage;
    
    const maxMemory = Math.max(...memoryUsage);
    if (maxMemory > thresholds.memoryThreshold) {
      analysis.alerts.push({
        type: 'resource',
        severity: 'medium',
        message: `High memory usage detected: ${maxMemory.toFixed(2)}MB`
      });
    }
  }

  // Generar recomendaciones
  analysis.recommendations = generateRecommendations(analysis);

  return analysis;
}

function generateRecommendations(analysis: any): string[] {
  const recommendations: string[] = [];

  if (analysis.summary.p95ResponseTime > 1000) {
    recommendations.push('Consider implementing caching to reduce response times');
    recommendations.push('Review database query optimization');
  }

  if (analysis.summary.errorRate > 2) {
    recommendations.push('Implement better error handling and monitoring');
    recommendations.push('Review application logs for error patterns');
  }

  if (analysis.trends.memory.length > 0) {
    const memoryGrowth = analysis.trends.memory[analysis.trends.memory.length - 1] - analysis.trends.memory[0];
    if (memoryGrowth > 50) {
      recommendations.push('Investigate potential memory leaks');
      recommendations.push('Consider implementing memory cleanup strategies');
    }
  }

  return recommendations;
}

async function generateReport(analysis: any, format: string): Promise<string> {
  switch (format) {
    case 'json':
      return JSON.stringify(analysis, null, 2);
      
    case 'html':
      return generateHTMLReport(analysis);
      
    case 'markdown':
      return generateMarkdownReport(analysis);
      
    default:
      return JSON.stringify(analysis, null, 2);
  }
}

function generateHTMLReport(analysis: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .alert { padding: 10px; margin: 10px 0; border-radius: 4px; }
        .high { background-color: #ffebee; border-left: 4px solid #f44336; }
        .medium { background-color: #fff3e0; border-left: 4px solid #ff9800; }
        .low { background-color: #e8f5e8; border-left: 4px solid #4caf50; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Performance Analysis Report</h1>
    
    <h2>Summary</h2>
    <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Total Requests</td><td>${analysis.summary.totalRequests}</td></tr>
        <tr><td>Average Response Time</td><td>${analysis.summary.averageResponseTime.toFixed(2)}ms</td></tr>
        <tr><td>95th Percentile</td><td>${analysis.summary.p95ResponseTime.toFixed(2)}ms</td></tr>
        <tr><td>Error Rate</td><td>${analysis.summary.errorRate.toFixed(2)}%</td></tr>
    </table>
    
    <h2>Alerts</h2>
    ${analysis.alerts.map((alert: any) => `
        <div class="alert ${alert.severity}">
            <strong>${alert.type.toUpperCase()}:</strong> ${alert.message}
        </div>
    `).join('')}
    
    <h2>Recommendations</h2>
    <ul>
        ${analysis.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
    </ul>
</body>
</html>
  `;
}

function generateMarkdownReport(analysis: any): string {
  return `
# Performance Analysis Report

## Summary

| Metric | Value |
|--------|-------|
| Total Requests | ${analysis.summary.totalRequests} |
| Average Response Time | ${analysis.summary.averageResponseTime.toFixed(2)}ms |
| 95th Percentile | ${analysis.summary.p95ResponseTime.toFixed(2)}ms |
| Error Rate | ${analysis.summary.errorRate.toFixed(2)}% |

## Alerts

${analysis.alerts.map((alert: any) => `
**${alert.type.toUpperCase()}** (${alert.severity}): ${alert.message}
`).join('\n')}

## Recommendations

${analysis.recommendations.map((rec: string) => `- ${rec}`).join('\n')}
  `;
}

function displayAnalysisSummary(analysis: any) {
  console.log('\n📊 Analysis Summary:');
  console.log(`   Total Requests: ${analysis.summary.totalRequests}`);
  console.log(`   Average Response Time: ${analysis.summary.averageResponseTime.toFixed(2)}ms`);
  console.log(`   95th Percentile: ${analysis.summary.p95ResponseTime.toFixed(2)}ms`);
  console.log(`   Error Rate: ${analysis.summary.errorRate.toFixed(2)}%`);
  
  if (analysis.alerts.length > 0) {
    console.log(`\n⚠️  Alerts: ${analysis.alerts.length}`);
    analysis.alerts.forEach((alert: any) => {
      const icon = alert.severity === 'high' ? '🔴' : alert.severity === 'medium' ? '🟡' : '🟢';
      console.log(`   ${icon} ${alert.message}`);
    });
  }
  
  if (analysis.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    analysis.recommendations.forEach((rec: string, index: number) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }
}
